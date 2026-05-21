import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { TransfersService } from "../transfers/transfers.service";

/**
 * Blink "transaction" webhook payload.
 *
 * Reference shape (receive.lightning):
 * {
 *   accountId, walletId, eventType: "receive.lightning",
 *   transaction: {
 *     id, externalId, createdAt, memo, status,
 *     settlementAmount, settlementCurrency, ...
 *     initiationVia: { type: "lightning", paymentHash, pubkey },
 *     settlementVia:  { type: "lightning", revealedPreImage }
 *   }
 * }
 *
 * We also accept a flat `{ id, paymentHash }` payload for local testing /
 * backwards compatibility with the existing simulation tooling.
 */
export interface BlinkInitiationVia {
  type?: "lightning" | "intraledger" | "onchain" | string;
  paymentHash?: string;
  pubkey?: string;
}

export interface BlinkSettlementVia {
  type?: "lightning" | "intraledger" | "onchain" | string;
  revealedPreImage?: string;
}

export interface BlinkTransaction {
  id?: string;
  externalId?: string;
  createdAt?: string;
  memo?: string;
  status?: "success" | "failure" | "pending" | string;
  settlementAmount?: number;
  settlementCurrency?: string;
  walletId?: string;
  initiationVia?: BlinkInitiationVia;
  settlementVia?: BlinkSettlementVia;
}

export interface BlinkWebhookPayload {
  accountId?: string;
  walletId?: string;
  eventType?: string;
  transaction?: BlinkTransaction;

  // Legacy / local-test shape
  id?: string;
  paymentHash?: string;
}

export type WebhookAck =
  | { acknowledged: true; status: "paid"; transfer: unknown }
  | { acknowledged: true; status: "duplicate"; eventId: string }
  | { acknowledged: true; status: "ignored"; reason: string }
  | { acknowledged: true; status: "unmatched"; paymentHash: string };

interface WebhookRequestContext {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly processedEvents = new Set<string>();
  private readonly maxRememberedEvents = 1000;

  constructor(private readonly transfersService: TransfersService) {}

  async handleBlinkEvent(
    payload: BlinkWebhookPayload,
    context: WebhookRequestContext = { headers: {} }
  ): Promise<WebhookAck> {
    const headers = context.headers ?? {};
    const rawBody = context.rawBody;

    this.verifySignature(payload, headers, rawBody);

    const eventType = payload.eventType ?? "unknown";

    if (eventType !== "unknown" && eventType !== "receive.lightning") {
      this.logger.log(`Ignoring unsupported Blink event type: ${eventType}`);
      return {
        acknowledged: true,
        status: "ignored",
        reason: `unsupported_event_type:${eventType}`,
      };
    }

    const paymentHash = this.extractPaymentHash(payload);
    if (!paymentHash) {
      this.logger.warn(
        `Blink webhook missing paymentHash, acknowledging without action`
      );
      return {
        acknowledged: true,
        status: "ignored",
        reason: "missing_payment_hash",
      };
    }

    const tx = payload.transaction;

    if (tx?.status && tx.status !== "success") {
      this.logger.log(
        `Blink transaction ${tx.id ?? "?"} status=${tx.status}, not marking paid`
      );
      return {
        acknowledged: true,
        status: "ignored",
        reason: `transaction_status:${tx.status}`,
      };
    }

    const initiationType = tx?.initiationVia?.type;
    if (initiationType && initiationType !== "lightning") {
      this.logger.log(
        `Ignoring non-lightning initiation type: ${initiationType}`
      );
      return {
        acknowledged: true,
        status: "ignored",
        reason: `initiation_type:${initiationType}`,
      };
    }

    const eventId = tx?.id ?? payload.id ?? `fallback-${paymentHash}`;
    if (this.processedEvents.has(eventId)) {
      this.logger.log(`Duplicate Blink event ${eventId}, skipping`);
      return { acknowledged: true, status: "duplicate", eventId };
    }

    const paidAt = tx?.createdAt ? new Date(tx.createdAt) : undefined;
    const transfer = await this.transfersService.markPaidByHash(
      paymentHash,
      paidAt
    );

    // Remember the event id only after a successful DB write so that a
    // transient failure can still be retried by Blink.
    this.rememberEvent(eventId);

    if (!transfer) {
      this.logger.warn(
        `Blink webhook paymentHash not found in our DB: ${paymentHash}`
      );
      return { acknowledged: true, status: "unmatched", paymentHash };
    }

    this.logger.log(
      `Marked invoice ${(transfer as { invoiceId?: string }).invoiceId ?? "?"} as paid (event ${eventId})`
    );
    return { acknowledged: true, status: "paid", transfer };
  }

  private verifySignature(
    payload: BlinkWebhookPayload,
    headers: Record<string, string | string[] | undefined>,
    rawBody?: string
  ) {
    const svixId = this.getHeader(headers, "svix-id");
    const svixTimestamp = this.getHeader(headers, "svix-timestamp");
    const svixSignature = this.getHeader(headers, "svix-signature");

    // Blink webhooks are delivered through Svix and include svix-* headers.
    // If Svix headers are present, prefer Svix verification.
    if (svixId && svixTimestamp && svixSignature) {
      const svixSecret = process.env.BLINK_WEBHOOK_SVIX_SECRET;

      if (!svixSecret) {
        this.logger.warn(
          "Svix headers present but BLINK_WEBHOOK_SVIX_SECRET is not configured; accepting request without signature verification"
        );
        return;
      }

      const body = rawBody ?? JSON.stringify(payload);
      const expected = this.computeSvixSignature(
        svixSecret,
        svixId,
        svixTimestamp,
        body
      );
      const signatures = this.parseSvixSignatures(svixSignature);
      const verified = signatures.some((sig) =>
        this.safeEqual(sig, expected)
      );

      if (!verified) {
        throw new UnauthorizedException("Invalid webhook signature");
      }
      return;
    }

    // Backward compatible shared-secret check for local tooling.
    const configuredSecret = process.env.BLINK_WEBHOOK_SECRET;
    if (!configuredSecret) return;

    const legacySignature =
      this.getHeader(headers, "x-blink-signature") ??
      this.getHeader(headers, "blink-signature");

    if (legacySignature !== configuredSecret) {
      throw new UnauthorizedException("Invalid webhook signature");
    }
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    const value = headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private parseSvixSignatures(headerValue: string): string[] {
    const tokens = headerValue
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    const signatures: string[] = [];
    for (const token of tokens) {
      const [version, signature] = token.split(",", 2);
      if (version === "v1" && signature) {
        signatures.push(signature);
      }
    }
    return signatures;
  }

  private computeSvixSignature(
    secret: string,
    id: string,
    timestamp: string,
    body: string
  ): string {
    const key = this.parseSvixSecret(secret);
    const signedContent = `${id}.${timestamp}.${body}`;
    return createHmac("sha256", key).update(signedContent).digest("base64");
  }

  private parseSvixSecret(secret: string): Buffer {
    // Svix secrets are typically "whsec_<base64>".
    if (secret.startsWith("whsec_")) {
      return Buffer.from(secret.slice("whsec_".length), "base64");
    }
    return Buffer.from(secret, "utf8");
  }

  private safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  }

  private extractPaymentHash(payload: BlinkWebhookPayload): string | null {
    return (
      payload.transaction?.initiationVia?.paymentHash ??
      payload.transaction?.externalId ??
      payload.paymentHash ??
      null
    );
  }

  private rememberEvent(eventId: string) {
    if (this.processedEvents.size >= this.maxRememberedEvents) {
      // Simple bounded cache so the Set doesn't grow forever in long-running
      // processes. For production, replace with Redis or a TTL store.
      const firstKey = this.processedEvents.values().next().value;
      if (firstKey) this.processedEvents.delete(firstKey);
    }
    this.processedEvents.add(eventId);
  }
}

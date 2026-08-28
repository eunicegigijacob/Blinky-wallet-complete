import {
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { createHmac, timingSafeEqual } from "crypto";
import { PaymentsService } from "../payments/payments.service";
import { PaymentStatus } from "../payments/payment-transitions";
import { BlinkWebhookDto } from "./dto/blink-webhook.dto";
import {
  WebhookEvent,
  WebhookEventDocument,
} from "./schemas/webhook-event.schema";

export type WebhookAck =
  | { acknowledged: true; status: "paid" | "failed"; invoiceId: string }
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

  constructor(
    private readonly paymentsService: PaymentsService,
    @InjectModel(WebhookEvent.name)
    private readonly webhookEventModel: Model<WebhookEventDocument>,
  ) {}

  async handleBlinkEvent(
    payload: BlinkWebhookDto,
    context: WebhookRequestContext = { headers: {} },
  ): Promise<WebhookAck> {
    this.verifySignature(payload, context.headers, context.rawBody);

    const eventType = payload.eventType ?? "unknown";
    if (eventType !== "receive.lightning" && eventType !== "send.lightning") {
      this.logger.log(`Ignoring unsupported Blink event type`);
      return {
        acknowledged: true,
        status: "ignored",
        reason: `unsupported_event_type:${eventType}`,
      };
    }

    const paymentHash = this.extractPaymentHash(payload);
    if (!paymentHash) {
      return {
        acknowledged: true,
        status: "ignored",
        reason: "missing_payment_hash",
      };
    }

    const txStatus = payload.transaction?.status ?? "success";
    const nextStatus = this.mapTransactionStatus(txStatus);
    if (!nextStatus) {
      return {
        acknowledged: true,
        status: "ignored",
        reason: `transaction_status:${txStatus}`,
      };
    }

    const eventId =
      this.getHeader(context.headers, "svix-id") ??
      payload.transaction?.id ??
      payload.id ??
      `fallback-${paymentHash}`;

    const recorded = await this.recordEvent(eventId, eventType);
    if (!recorded) {
      return { acknowledged: true, status: "duplicate", eventId };
    }

    const paidAt = payload.transaction?.createdAt
      ? new Date(payload.transaction.createdAt)
      : undefined;

    const payment = await this.paymentsService.markByProviderPaymentId(
      paymentHash,
      nextStatus,
      paidAt,
    );

    await this.webhookEventModel.updateOne(
      { provider: "blink", eventId },
      {
        paymentId: payment?.invoiceId ?? null,
        status: payment ? "processed" : "ignored",
        processedAt: new Date(),
      },
    );

    if (!payment) {
      return { acknowledged: true, status: "unmatched", paymentHash };
    }

    if (nextStatus === "FAILED") {
      return {
        acknowledged: true,
        status: "failed",
        invoiceId: payment.invoiceId,
      };
    }
    if (nextStatus === "PAID") {
      return {
        acknowledged: true,
        status: "paid",
        invoiceId: payment.invoiceId,
      };
    }
    return {
      acknowledged: true,
      status: "ignored",
      reason: `status:${nextStatus}`,
    };
  }

  private mapTransactionStatus(status: string): PaymentStatus | null {
    switch (status.toLowerCase()) {
      case "success":
        return "PAID";
      case "failure":
      case "failed":
        return "FAILED";
      case "pending":
        return "PENDING";
      default:
        return null;
    }
  }

  private async recordEvent(eventId: string, eventType: string): Promise<boolean> {
    try {
      await this.webhookEventModel.create({
        provider: "blink",
        eventId,
        eventType,
        paymentId: null,
        status: "received",
        receivedAt: new Date(),
        processedAt: null,
      });
      return true;
    } catch (error) {
      if (this.isDuplicateKey(error)) {
        return false;
      }
      throw error;
    }
  }

  private isDuplicateKey(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    );
  }

  private verifySignature(
    payload: BlinkWebhookDto,
    headers: Record<string, string | string[] | undefined>,
    rawBody?: string,
  ) {
    const svixId = this.getHeader(headers, "svix-id");
    const svixTimestamp = this.getHeader(headers, "svix-timestamp");
    const svixSignature = this.getHeader(headers, "svix-signature");
    const secret = process.env.BLINK_WEBHOOK_SECRET;
    const hasSvix = Boolean(svixId && svixTimestamp && svixSignature);

    if (hasSvix) {
      if (!secret) {
        throw new UnauthorizedException("Webhook secret is not configured");
      }
      const body = rawBody ?? JSON.stringify(payload);
      const expected = this.computeSvixSignature(
        secret,
        svixId as string,
        svixTimestamp as string,
        body,
      );
      const signatures = this.parseSvixSignatures(svixSignature as string);
      const verified = signatures.some((sig) => this.safeEqual(sig, expected));
      if (!verified) {
        throw new UnauthorizedException("Invalid webhook signature");
      }
      return;
    }

    if (secret) {
      throw new UnauthorizedException("Missing webhook signature");
    }

    const allowUnsigned =
      process.env.NODE_ENV === "test" ||
      (process.env.PAYMENT_PROVIDER ?? "").toLowerCase() === "mock";

    if (!allowUnsigned) {
      throw new UnauthorizedException("Webhook signature required");
    }
  }

  private getHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const value =
      headers[name.toLowerCase()] ?? headers[name] ?? headers[name.toUpperCase()];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private parseSvixSignatures(headerValue: string): string[] {
    const tokens = headerValue.split(/\s+/).map((token) => token.trim()).filter(Boolean);
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
    body: string,
  ): string {
    const key = this.parseSvixSecret(secret);
    const signedContent = `${id}.${timestamp}.${body}`;
    return createHmac("sha256", key).update(signedContent).digest("base64");
  }

  private parseSvixSecret(secret: string): Buffer {
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

  private extractPaymentHash(payload: BlinkWebhookDto): string | null {
    return (
      payload.transaction?.initiationVia?.paymentHash ??
      payload.paymentHash ??
      null
    );
  }
}

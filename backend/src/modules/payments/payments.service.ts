import { BadRequestException, Injectable } from "@nestjs/common";

export interface DecodedInvoice {
  paymentRequest: string;
  network: "mainnet" | "testnet" | "regtest" | "signet" | "unknown";
  amountSats: number | null;
  description: string;
  destinationPubkey: string;
  paymentHash: string;
  expiresAt: string;
  expiresInSeconds: number;
  decodedAt: string;
}

export interface PaymentResult {
  ok: boolean;
  status: "succeeded" | "failed";
  paymentHash: string;
  preimage?: string;
  amountSats: number | null;
  feeSats?: number;
  destinationPubkey: string;
  description: string;
  routeHint?: string;
  failureReason?: string;
  settledAt: string;
}

const MULTIPLIERS: Record<string, number> = {
  m: 1e-3,
  u: 1e-6,
  n: 1e-9,
  p: 1e-12,
};

@Injectable()
export class PaymentsService {
  decode(paymentRequest: string): DecodedInvoice {
    const cleaned = paymentRequest.trim().toLowerCase();
    if (!cleaned.startsWith("ln")) {
      throw new BadRequestException(
        "Invalid Lightning invoice: expected a 'ln…' bolt11 string"
      );
    }

    const network = this.detectNetwork(cleaned);
    const amountSats = this.extractAmountSats(cleaned);

    const expiresInSeconds = 15 * 60;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return {
      paymentRequest,
      network,
      amountSats,
      description: this.mockDescription(cleaned),
      destinationPubkey: this.mockPubkey(cleaned),
      paymentHash: this.mockPaymentHash(cleaned),
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds,
      decodedAt: new Date().toISOString(),
    };
  }

  pay(paymentRequest: string, simulateFailure = false): PaymentResult {
    const decoded = this.decode(paymentRequest);

    if (simulateFailure) {
      return {
        ok: false,
        status: "failed",
        paymentHash: decoded.paymentHash,
        amountSats: decoded.amountSats,
        destinationPubkey: decoded.destinationPubkey,
        description: decoded.description,
        failureReason:
          "Demo failure: no route found to destination (simulated, no Blink call was made).",
        settledAt: new Date().toISOString(),
      };
    }

    return {
      ok: true,
      status: "succeeded",
      paymentHash: decoded.paymentHash,
      preimage: this.mockHex(64, decoded.paymentHash + "preimage"),
      amountSats: decoded.amountSats,
      feeSats: decoded.amountSats ? Math.max(1, Math.round(decoded.amountSats * 0.001)) : 1,
      destinationPubkey: decoded.destinationPubkey,
      description: decoded.description,
      routeHint: "demo-route • 2 hops • mocked",
      settledAt: new Date().toISOString(),
    };
  }

  private detectNetwork(cleaned: string): DecodedInvoice["network"] {
    if (cleaned.startsWith("lnbcrt")) return "regtest";
    if (cleaned.startsWith("lntbs")) return "signet";
    if (cleaned.startsWith("lntb")) return "testnet";
    if (cleaned.startsWith("lnbc")) return "mainnet";
    return "unknown";
  }

  private extractAmountSats(cleaned: string): number | null {
    // Strip the HRP prefix (lnbc / lntb / lnbcrt / lntbs).
    const hrpMatch = cleaned.match(/^ln(bcrt|tbs|bc|tb)/);
    if (!hrpMatch) return null;
    const afterPrefix = cleaned.slice(hrpMatch[0].length);

    // Amount is the leading digits, optionally followed by a multiplier letter.
    const amountMatch = afterPrefix.match(/^(\d+)([munp])?/);
    if (!amountMatch) return null;

    const value = Number(amountMatch[1]);
    const multiplier = amountMatch[2] ? MULTIPLIERS[amountMatch[2]] ?? 1 : 1;

    // value is in BTC × multiplier. Convert to sats (1 BTC = 1e8 sats).
    const btc = value * multiplier;
    const sats = Math.round(btc * 1e8);
    return Number.isFinite(sats) && sats > 0 ? sats : null;
  }

  private mockDescription(cleaned: string): string {
    const samples = [
      "Family support transfer",
      "Coffee with a friend",
      "Freelance invoice #42",
      "Lightning donation",
      "Cross-border remittance",
    ];
    const idx = this.hash(cleaned) % samples.length;
    return samples[idx];
  }

  private mockPubkey(seed: string): string {
    return "02" + this.mockHex(64, seed + "pubkey").slice(0, 64);
  }

  private mockPaymentHash(seed: string): string {
    return this.mockHex(64, seed + "hash");
  }

  private mockHex(length: number, seed: string): string {
    let h = this.hash(seed);
    let out = "";
    while (out.length < length) {
      h = (h * 1664525 + 1013904223) >>> 0;
      out += h.toString(16).padStart(8, "0");
    }
    return out.slice(0, length);
  }

  private hash(input: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
}

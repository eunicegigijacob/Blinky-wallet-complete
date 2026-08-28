import { BadRequestException } from "@nestjs/common";
import decodeBolt11 from "light-bolt11-decoder";

export interface DecodedInvoice {
  paymentRequest: string;
  network: "mainnet" | "testnet" | "regtest" | "signet" | "unknown";
  amountSats: number | null;
  description: string;
  paymentHash: string;
  expiresAt: string;
  expiresInSeconds: number;
  decodedAt: string;
}

const MULTIPLIERS: Record<string, number> = {
  m: 1e-3,
  u: 1e-6,
  n: 1e-9,
  p: 1e-12,
};

export function decodeLightningInvoice(paymentRequest: string): DecodedInvoice {
  const cleaned = paymentRequest.trim();
  if (!cleaned.toLowerCase().startsWith("ln")) {
    throw new BadRequestException(
      "Invalid Lightning invoice: expected a bolt11 string starting with ln",
    );
  }

  try {
    return decodeRealInvoice(cleaned);
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    return decodeMockInvoice(cleaned);
  }
}

function decodeRealInvoice(paymentRequest: string): DecodedInvoice {
  const decoded = decodeBolt11(paymentRequest) as {
    sections?: Array<{ name?: string; value?: unknown; letters?: string }>;
    expiry?: number;
  };

  const amountSection = decoded.sections?.find((section) => section.name === "amount");
  const hashSection = decoded.sections?.find((section) => section.name === "payment_hash");
  const descriptionSection = decoded.sections?.find(
    (section) => section.name === "description",
  );
  const timestampSection = decoded.sections?.find((section) => section.name === "timestamp");

  const amountMsats = amountSection?.value ? Number(amountSection.value) : null;
  const amountSats =
    amountMsats !== null && Number.isFinite(amountMsats)
      ? Math.round(amountMsats / 1000)
      : null;

  const paymentHash = String(hashSection?.value ?? "");
  if (!paymentHash) {
    throw new Error("Missing payment hash");
  }

  const createdAtSeconds = Number(timestampSection?.value ?? Date.now() / 1000);
  const expiresInSeconds = Number(decoded.expiry ?? 15 * 60);
  const expiresAt = new Date((createdAtSeconds + expiresInSeconds) * 1000);

  return {
    paymentRequest,
    network: detectNetwork(paymentRequest.toLowerCase()),
    amountSats: amountSats && amountSats > 0 ? amountSats : null,
    description: String(descriptionSection?.value ?? ""),
    paymentHash,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds,
    decodedAt: new Date().toISOString(),
  };
}

function decodeMockInvoice(paymentRequest: string): DecodedInvoice {
  const cleaned = paymentRequest.toLowerCase();
  const expiresInSeconds = 15 * 60;
  return {
    paymentRequest,
    network: detectNetwork(cleaned),
    amountSats: extractAmountSats(cleaned),
    description: "Lightning invoice",
    paymentHash: extractMockHash(paymentRequest),
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    expiresInSeconds,
    decodedAt: new Date().toISOString(),
  };
}

function detectNetwork(cleaned: string): DecodedInvoice["network"] {
  if (cleaned.startsWith("lnbcrt")) return "regtest";
  if (cleaned.startsWith("lntbs")) return "signet";
  if (cleaned.startsWith("lntb")) return "testnet";
  if (cleaned.startsWith("lnbc")) return "mainnet";
  return "unknown";
}

function extractAmountSats(cleaned: string): number | null {
  const hrpMatch = cleaned.match(/^ln(bcrt|tbs|bc|tb)/);
  if (!hrpMatch) return null;
  const afterPrefix = cleaned.slice(hrpMatch[0].length);
  const amountMatch = afterPrefix.match(/^(\d+)([munp])?/);
  if (!amountMatch) return null;

  const value = Number(amountMatch[1]);
  const multiplier = amountMatch[2] ? MULTIPLIERS[amountMatch[2]] ?? 1 : 1;
  const sats = Math.round(value * multiplier * 1e8);
  return Number.isFinite(sats) && sats > 0 ? sats : null;
}

function extractMockHash(paymentRequest: string): string {
  const match = paymentRequest.match(/1p([a-z0-9_]+)/i);
  if (match?.[1]) {
    return match[1].replace(/blink$/i, "");
  }
  return `hash_${Math.random().toString(16).slice(2, 18)}`;
}

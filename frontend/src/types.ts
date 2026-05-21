export type InvoiceStatus =
  | "waiting_for_payment"
  | "paid"
  | "expired"
  | "failed";

export interface InvoiceRecord {
  invoiceId: string;
  amount: number;
  memo: string;
  paymentRequest: string;
  qrPayload: string;
  expiresAt: string;
  paidAt?: string;
  status: InvoiceStatus;
}

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

export interface WalletBalance {
  walletId: string;
  walletCurrency: "BTC" | "USD";
  balance: number;
  mode: "live" | "mock";
}

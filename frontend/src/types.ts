export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

export interface InvoiceRecord {
  invoiceId: string;
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: "BTC" | "USD";
  direction: "incoming" | "outgoing";
  memo: string;
  paymentRequest: string;
  qrPayload: string;
  expiresAt: string;
  paidAt?: string | null;
  status: PaymentStatus;
  createdAt?: string;
  updatedAt?: string;
}

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

export interface WalletBalance {
  walletId: string;
  walletCurrency: "BTC" | "USD";
  balance: number;
  mode: "live" | "mock";
}

export const TERMINAL_PAYMENT_STATUSES: PaymentStatus[] = [
  "PAID",
  "FAILED",
  "EXPIRED",
];

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return TERMINAL_PAYMENT_STATUSES.includes(status);
}

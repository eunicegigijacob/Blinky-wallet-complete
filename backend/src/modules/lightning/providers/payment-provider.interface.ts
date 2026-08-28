export const PAYMENT_PROVIDER = "PAYMENT_PROVIDER";

export type ProviderPaymentStatus = "PENDING" | "PAID" | "EXPIRED" | "FAILED";

export interface CreateInvoiceInput {
  amount: number;
  memo: string;
  clientReference?: string;
}

export interface CreateInvoiceResult {
  paymentRequest: string;
  paymentHash: string;
  expiresAt: Date;
  currency: "BTC" | "USD";
}

export interface PayInvoiceResult {
  status: ProviderPaymentStatus;
  providerPaymentId: string;
}

export interface WalletBalanceOutput {
  walletId: string;
  walletCurrency: "BTC" | "USD";
  balance: number;
  mode: "live" | "mock";
}

export interface PaymentProvider {
  createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
  getPaymentStatus(paymentHash: string): Promise<ProviderPaymentStatus>;
  payInvoice(paymentRequest: string): Promise<PayInvoiceResult>;
  health(): Promise<{ provider: string; ok: boolean; mode: "live" | "mock" }>;
  getWalletBalance(): Promise<WalletBalanceOutput>;
}

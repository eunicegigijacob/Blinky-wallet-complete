export interface CreateLightningInvoiceInput {
  amount: number;
  memo: string;
  clientReference?: string;
}

export interface CreateLightningInvoiceOutput {
  paymentRequest: string;
  paymentHash: string;
  expiresAt: Date;
}

export interface WalletBalanceOutput {
  walletId: string;
  walletCurrency: "BTC" | "USD";
  balance: number;
  mode: "live" | "mock";
}

export interface LightningProvider {
  createInvoice(input: CreateLightningInvoiceInput): Promise<CreateLightningInvoiceOutput>;
  health(): Promise<{ provider: string; ok: boolean; mode: "live" | "mock" }>;
  getWalletBalance(): Promise<WalletBalanceOutput>;
}

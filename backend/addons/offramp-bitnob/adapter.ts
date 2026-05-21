export interface OfframpRequest {
  invoiceId: string;
  amountSats: number;
  fiatCurrency: string;
  recipientAccount: string;
}

export interface OfframpResult {
  provider: "bitnob";
  disbursementId: string;
  status: "queued" | "completed" | "failed";
}

export async function sendBitnobOfframp(
  request: OfframpRequest
): Promise<OfframpResult> {
  return {
    provider: "bitnob",
    disbursementId: `bitnob_${request.invoiceId}`,
    status: "queued"
  };
}

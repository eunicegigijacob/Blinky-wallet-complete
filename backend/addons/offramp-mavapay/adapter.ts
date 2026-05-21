import { OfframpRequest, OfframpResult } from "../offramp-bitnob/adapter";

export async function sendMavaPayOfframp(
  request: OfframpRequest
): Promise<OfframpResult & { provider: "mavapay" }> {
  return {
    provider: "mavapay",
    disbursementId: `mavapay_${request.invoiceId}`,
    status: "queued"
  };
}

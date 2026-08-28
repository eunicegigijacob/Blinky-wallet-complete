import { PaymentStatus, isTerminalPaymentStatus } from "../types";

export const PAYMENT_POLL_INTERVAL_MS = 3000;
export const PAYMENT_POLL_TIMEOUT_MS = 16 * 60 * 1000;

export function shouldContinuePolling(
  status: PaymentStatus | undefined,
  elapsedMs: number,
  timeoutMs = PAYMENT_POLL_TIMEOUT_MS,
): boolean {
  if (status && isTerminalPaymentStatus(status)) {
    return false;
  }
  return elapsedMs < timeoutMs;
}

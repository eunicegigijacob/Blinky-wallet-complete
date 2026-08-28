import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { InvoiceRecord, isTerminalPaymentStatus } from "../types";
import {
  PAYMENT_POLL_INTERVAL_MS,
  PAYMENT_POLL_TIMEOUT_MS,
  shouldContinuePolling,
} from "./paymentPolling";

export { PAYMENT_POLL_INTERVAL_MS, PAYMENT_POLL_TIMEOUT_MS, shouldContinuePolling };

export function usePaymentPolling(invoiceId: string | undefined) {
  const [payment, setPayment] = useState<InvoiceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setTimedOut(false);
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!invoiceId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const tick = async () => {
      try {
        const current = await api.getInvoice(invoiceId);
        if (cancelled) return;
        setPayment(current);
        setError(null);

        const elapsed = Date.now() - startedAt;
        if (!shouldContinuePolling(current.status, elapsed)) {
          if (!isTerminalPaymentStatus(current.status)) {
            setTimedOut(true);
          }
          return;
        }
        timer = setTimeout(tick, PAYMENT_POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        setError("Unable to check payment status. Please try again.");
        const elapsed = Date.now() - startedAt;
        if (elapsed >= PAYMENT_POLL_TIMEOUT_MS) {
          setTimedOut(true);
          return;
        }
        timer = setTimeout(tick, PAYMENT_POLL_INTERVAL_MS);
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [invoiceId, reloadToken]);

  return { payment, error, timedOut, retry };
}

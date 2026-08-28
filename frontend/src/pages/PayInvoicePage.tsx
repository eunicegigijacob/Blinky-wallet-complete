import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MotionPage } from "../components/MotionPage";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";
import { usePaymentPolling } from "../hooks/usePaymentPolling";
import { DecodedInvoice, InvoiceRecord } from "../types";

type Step = "input" | "decoded" | "result";

function shorten(value: string, head = 10, tail = 10) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function PayInvoicePage() {
  const [step, setStep] = useState<Step>("input");
  const [paymentRequest, setPaymentRequest] = useState("");
  const [decoded, setDecoded] = useState<DecodedInvoice | null>(null);
  const [submitted, setSubmitted] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { payment, error: pollError, retry } = usePaymentPolling(
    submitted?.status === "PENDING" ? submitted.invoiceId : undefined,
  );

  const current = payment ?? submitted;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setPaymentRequest(text.trim());
    } catch {
      setError("Clipboard access was denied. Paste the invoice manually.");
    }
  };

  const handleDecode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.decodeInvoice(paymentRequest.trim());
      setDecoded(data);
      setStep("decoded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not decode invoice");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!decoded) return;
    setError(null);
    setLoading(true);
    try {
      const data = await api.payInvoice(decoded.paymentRequest);
      setSubmitted(data);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed to send");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPaymentRequest("");
    setDecoded(null);
    setSubmitted(null);
    setError(null);
    setStep("input");
  };

  return (
    <MotionPage>
      <div className="card mx-auto max-w-2xl space-y-6 p-8">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">Send</p>
          <h1 className="text-2xl font-semibold">Pay a Lightning invoice</h1>
          <p className="text-sm text-slate-400">
            Paste a bolt11 invoice, review the details, then pay it from the configured Blink wallet.
          </p>
        </header>

        <Stepper step={step} />

        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.form
              key="input"
              onSubmit={handleDecode}
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Bolt11 invoice</span>
                <textarea
                  className="input-base min-h-[140px] resize-none break-all font-mono text-xs leading-relaxed"
                  placeholder="lnbc1..."
                  value={paymentRequest}
                  onChange={(e) => setPaymentRequest(e.target.value)}
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={handlePaste} className="btn-secondary">
                  Paste from clipboard
                </button>
                <button
                  type="submit"
                  disabled={loading || paymentRequest.trim().length < 10}
                  className="btn-primary"
                >
                  {loading ? "Decoding…" : "Decode invoice"}
                </button>
              </div>

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </motion.form>
          )}

          {step === "decoded" && decoded && (
            <motion.section
              key="decoded"
              className="space-y-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs uppercase tracking-widest text-slate-400">Amount</p>
                  <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-[10px] uppercase tracking-widest text-indigo-300">
                    {decoded.network}
                  </span>
                </div>
                <p className="mt-2 text-3xl font-semibold">
                  {decoded.amountSats !== null
                    ? `${decoded.amountSats.toLocaleString()} sats`
                    : "Amount unspecified"}
                </p>
                <p className="mt-1 text-sm text-slate-400">{decoded.description || "Lightning invoice"}</p>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <DetailRow label="Payment hash" value={shorten(decoded.paymentHash)} mono />
                <DetailRow
                  label="Expires in"
                  value={`${Math.round(decoded.expiresInSeconds / 60)} min`}
                />
              </dl>

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => setStep("input")} className="btn-secondary" type="button">
                  Back
                </button>
                <button onClick={handlePay} disabled={loading} className="btn-primary" type="button">
                  {loading ? "Sending…" : `Pay ${decoded.amountSats ?? ""} sats`}
                </button>
              </div>

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </motion.section>
          )}

          {step === "result" && current && (
            <motion.section
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div
                className={`rounded-xl border p-6 text-center ${
                  current.status === "PAID"
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : current.status === "FAILED"
                    ? "border-rose-500/40 bg-rose-500/10"
                    : current.status === "EXPIRED"
                    ? "border-slate-500/40 bg-slate-500/10"
                    : "border-amber-500/40 bg-amber-500/10"
                }`}
              >
                <p className="text-xs uppercase tracking-widest text-slate-300">
                  {current.status === "PAID"
                    ? "Payment received"
                    : current.status === "FAILED"
                    ? "Payment failed"
                    : current.status === "EXPIRED"
                    ? "Invoice expired"
                    : "Waiting for payment..."}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {current.amount.toLocaleString()} sats
                </p>
                <div className="mt-3 flex justify-center">
                  <StatusBadge status={current.status} />
                </div>
              </div>

              {pollError ? (
                <div className="space-y-2">
                  <p className="text-sm text-rose-300">{pollError}</p>
                  <button className="btn-secondary" onClick={retry} type="button">
                    Try again
                  </button>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={reset} className="btn-primary" type="button">
                  Pay another invoice
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </MotionPage>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "input", label: "Paste" },
    { id: "decoded", label: "Review" },
    { id: "result", label: "Result" },
  ];
  const activeIndex = steps.findIndex((s) => s.id === step);

  return (
    <ol className="flex items-center gap-2 text-xs">
      {steps.map((s, idx) => {
        const isActive = idx === activeIndex;
        const isDone = idx < activeIndex;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <motion.span
              animate={{
                backgroundColor: isActive
                  ? "rgb(99 102 241)"
                  : isDone
                  ? "rgb(16 185 129)"
                  : "rgb(30 41 59)",
                color: isActive || isDone ? "#fff" : "rgb(148 163 184)",
              }}
              transition={{ duration: 0.3 }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold"
            >
              {idx + 1}
            </motion.span>
            <span
              className={
                isActive ? "text-slate-100" : isDone ? "text-emerald-300" : "text-slate-500"
              }
            >
              {s.label}
            </span>
            {idx < steps.length - 1 ? (
              <span className="mx-1 h-px w-6 bg-slate-700" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-widest text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm text-slate-200 ${mono ? "font-mono break-all" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

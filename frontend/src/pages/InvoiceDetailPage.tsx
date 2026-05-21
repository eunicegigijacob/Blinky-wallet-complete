import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { MotionPage } from "../components/MotionPage";
import { StatusBadge } from "../components/StatusBadge";
import { SuccessPopup } from "../components/SuccessPopup";
import { api } from "../lib/api";
import { InvoiceRecord } from "../types";

export function InvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousStatus = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const current = await api.getInvoice(invoiceId);
        if (!mounted) return;
        if (previousStatus.current !== "paid" && current.status === "paid") {
          setPopupVisible(true);
        }
        previousStatus.current = current.status;
        setInvoice(current);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load invoice");
        }
      }
    };

    void load();
    const interval = setInterval(load, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [invoiceId]);

  const copyInvoice = async () => {
    if (!invoice) return;
    await navigator.clipboard.writeText(invoice.paymentRequest);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return <p className="text-rose-300">{error}</p>;
  }

  if (!invoice) {
    return <p className="text-slate-300">Loading invoice...</p>;
  }

  return (
    <MotionPage>
      <div className="card mx-auto max-w-2xl space-y-6 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Invoice #{invoice.invoiceId}</h1>
          <StatusBadge status={invoice.status} />
        </div>

        <motion.div
          className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mx-auto rounded-xl bg-white p-3 md:mx-0">
            <QRCodeSVG value={invoice.qrPayload} size={190} />
          </div>
          <div className="min-w-0 space-y-3">
            <p className="text-sm text-slate-300">Scan or copy the invoice below.</p>
            <pre className="max-w-full whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-300">
              {invoice.paymentRequest}
            </pre>
            {invoice.status === "paid" ? (
              <Link to="/history" className="btn-primary">
                View Transactions
              </Link>
            ) : (
              <button onClick={copyInvoice} className="btn-primary">
                {copied ? "Copied" : "Copy Invoice"}
              </button>
            )}
            <p className={invoice.status === "waiting_for_payment" ? "animate-pulse text-amber-300 text-xs" : "text-xs text-slate-300"}>
              {invoice.status === "waiting_for_payment"
                ? "Waiting for webhook-confirmed payment..."
                : `Updated status: ${invoice.status}`}
            </p>
          </div>
        </motion.div>
      </div>
      <SuccessPopup show={popupVisible} onClose={() => setPopupVisible(false)} />
    </MotionPage>
  );
}

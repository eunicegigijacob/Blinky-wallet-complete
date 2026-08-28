import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { MotionPage } from "../components/MotionPage";
import { StatusBadge } from "../components/StatusBadge";
import { SuccessPopup } from "../components/SuccessPopup";
import { usePaymentPolling } from "../hooks/usePaymentPolling";

function statusCopy(status: string | undefined) {
  switch (status) {
    case "PENDING":
      return "Waiting for payment...";
    case "PAID":
      return "Payment received";
    case "EXPIRED":
      return "Invoice expired";
    case "FAILED":
      return "Payment failed";
    default:
      return "Loading invoice...";
  }
}

export function InvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  const { payment, error, timedOut, retry } = usePaymentPolling(invoiceId);
  const [copied, setCopied] = useState(false);
  const [popupClosed, setPopupClosed] = useState(false);
  const sawPaid = useRef(false);

  if (payment?.status === "PAID") {
    sawPaid.current = true;
  }

  const copyInvoice = async () => {
    if (!payment) return;
    await navigator.clipboard.writeText(payment.paymentRequest);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (error && !payment) {
    return (
      <MotionPage>
        <div className="card mx-auto max-w-xl space-y-4 p-8">
          <p className="text-rose-300">{error}</p>
          <button className="btn-primary" onClick={retry} type="button">
            Try again
          </button>
        </div>
      </MotionPage>
    );
  }

  if (!payment) {
    return (
      <MotionPage>
        <p className="text-slate-300">Loading invoice...</p>
      </MotionPage>
    );
  }

  return (
    <MotionPage>
      <div className="card mx-auto max-w-2xl space-y-6 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Invoice #{payment.invoiceId}</h1>
          <StatusBadge status={payment.status} />
        </div>

        <motion.div
          className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mx-auto rounded-xl bg-white p-3 md:mx-0">
            <QRCodeSVG value={payment.qrPayload} size={190} />
          </div>
          <div className="min-w-0 space-y-3">
            <p className="text-sm text-slate-300">Scan or copy the invoice below.</p>
            <pre className="max-w-full whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-300">
              {payment.paymentRequest}
            </pre>
            {payment.status === "PAID" ? (
              <Link to="/history" className="btn-primary">
                View Transactions
              </Link>
            ) : (
              <button onClick={copyInvoice} className="btn-primary" type="button">
                {copied ? "Copied" : "Copy Invoice"}
              </button>
            )}
            <p
              className={
                payment.status === "PENDING"
                  ? "animate-pulse text-amber-300 text-xs"
                  : "text-xs text-slate-300"
              }
            >
              {statusCopy(payment.status)}
            </p>
            {error ? (
              <div className="space-y-2">
                <p className="text-sm text-rose-300">{error}</p>
                <button className="btn-secondary" onClick={retry} type="button">
                  Try again
                </button>
              </div>
            ) : null}
            {timedOut && payment.status === "PENDING" ? (
              <p className="text-sm text-rose-300">
                Unable to check payment status. Please try again.
              </p>
            ) : null}
          </div>
        </motion.div>
      </div>
      <SuccessPopup
        show={sawPaid.current && !popupClosed}
        onClose={() => setPopupClosed(true)}
      />
    </MotionPage>
  );
}

import { InvoiceRecord, PaymentStatus } from "../types";

const styles: Record<PaymentStatus, string> = {
  PENDING: "bg-amber-500/20 text-amber-300",
  PAID: "bg-emerald-500/20 text-emerald-300",
  EXPIRED: "bg-slate-500/20 text-slate-300",
  FAILED: "bg-rose-500/20 text-rose-300",
};

const labels: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  EXPIRED: "Expired",
  FAILED: "Failed",
};

export function StatusBadge({ status }: { status: InvoiceRecord["status"] }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

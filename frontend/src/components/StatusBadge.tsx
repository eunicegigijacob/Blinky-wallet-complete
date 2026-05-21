import { InvoiceStatus } from "../types";

const styles: Record<InvoiceStatus, string> = {
  waiting_for_payment: "bg-amber-500/20 text-amber-300",
  paid: "bg-emerald-500/20 text-emerald-300",
  expired: "bg-slate-500/20 text-slate-300",
  failed: "bg-rose-500/20 text-rose-300"
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

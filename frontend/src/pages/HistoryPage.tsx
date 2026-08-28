import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MotionPage, staggerContainer, staggerItem } from "../components/MotionPage";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../lib/api";
import { InvoiceRecord, WalletBalance } from "../types";

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function shortenInvoice(value: string) {
  if (value.length <= 24) return value;
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

export function HistoryPage() {
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .listPayments()
      .then((data) => mounted && setRecords(data))
      .catch(() => mounted && setRecords([]))
      .finally(() => mounted && setLoading(false));

    api
      .getWalletBalance()
      .then((data) => mounted && setWalletBalance(data))
      .catch(() => mounted && setWalletBalance(null))
      .finally(() => mounted && setLoadingBalance(false));

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <MotionPage>
      <div className="card p-8">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">Activity</p>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm text-slate-400">
            Date, amount, status, and invoice for recent Lightning payments.
          </p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-5"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Wallet Balance</p>
          {loadingBalance ? (
            <p className="mt-2 text-sm text-slate-400">Loading wallet balance…</p>
          ) : walletBalance ? (
            <>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">
                {walletBalance.balance.toLocaleString()}{" "}
                {walletBalance.walletCurrency === "USD" ? "cents" : "sats"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {walletBalance.walletCurrency} • {walletBalance.mode}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-rose-300">Unable to load wallet balance.</p>
          )}
        </motion.div>

        <div className="mt-6 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-400">Loading history…</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-slate-400">No payments found yet.</p>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              <div className="hidden grid-cols-[1.2fr_0.7fr_0.6fr_minmax(0,1.4fr)] gap-3 px-4 text-[11px] uppercase tracking-widest text-slate-500 md:grid">
                <span>Date</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Invoice</span>
              </div>
              {records.map((record) => (
                <motion.div key={record.invoiceId} variants={staggerItem}>
                  <Link
                    to={`/invoice/${record.invoiceId}`}
                    className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/30 px-4 py-3 transition-colors duration-200 hover:border-indigo-500/40 hover:bg-slate-900/60 md:grid-cols-[1.2fr_0.7fr_0.6fr_minmax(0,1.4fr)] md:items-center"
                  >
                    <div>
                      <p className="text-sm font-medium">{formatDate(record.createdAt)}</p>
                      <p className="text-xs text-slate-400">{record.memo}</p>
                    </div>
                    <span className="text-sm">{record.amount.toLocaleString()} sats</span>
                    <StatusBadge status={record.status} />
                    <span className="font-mono text-xs text-slate-400">
                      {shortenInvoice(record.paymentRequest)}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </MotionPage>
  );
}

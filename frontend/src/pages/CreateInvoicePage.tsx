import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MotionPage } from "../components/MotionPage";
import { api } from "../lib/api";

const presets = [1000, 5000, 21000, 50000];

export function CreateInvoicePage() {
  const [amount, setAmount] = useState(5000);
  const [memo, setMemo] = useState("Family support transfer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await api.createInvoice({ amount, memo });
      navigate(`/invoice/${created.invoiceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MotionPage>
      <form className="card mx-auto max-w-xl space-y-5 p-8" onSubmit={handleSubmit}>
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">Receive</p>
          <h1 className="text-2xl font-semibold">Create an invoice</h1>
          <p className="text-sm text-slate-400">
            Set the amount and memo. We&apos;ll generate a Lightning invoice and QR code.
          </p>
        </header>

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Amount (sats)</span>
          <input
            className="input-base"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {presets.map((preset) => {
              const isActive = preset === amount;
              return (
                <motion.button
                  type="button"
                  key={preset}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setAmount(preset)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    isActive
                      ? "border-indigo-400 bg-indigo-500/20 text-indigo-200"
                      : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                  }`}
                >
                  {preset.toLocaleString()} sats
                </motion.button>
              );
            })}
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Memo</span>
          <input
            className="input-base"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button className="btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "Creating your Lightning invoice..." : "Create invoice"}
        </button>
      </form>
    </MotionPage>
  );
}

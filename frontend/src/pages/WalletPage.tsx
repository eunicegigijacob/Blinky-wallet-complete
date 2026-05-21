import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MotionPage, staggerContainer, staggerItem } from "../components/MotionPage";

const actions = [
  {
    to: "/invoice/create",
    title: "Receive",
    subtitle: "Create an invoice",
    body: "Generate a Lightning invoice with QR code and copyable bolt11 string.",
    accent: "from-indigo-500/20 to-indigo-500/0",
    badge: "Receive sats",
  },
  {
    to: "/invoice/pay",
    title: "Send",
    subtitle: "Pay an invoice",
    body: "Paste any bolt11 invoice. We decode it, then you confirm the payment.",
    accent: "from-emerald-500/20 to-emerald-500/0",
    badge: "Send sats",
  },
  {
    to: "/history",
    title: "Activity",
    subtitle: "Transfer history",
    body: "Browse past invoices and their settlement status in real time.",
    accent: "from-sky-500/20 to-sky-500/0",
    badge: "Recent activity",
  },
];

export function WalletPage() {
  return (
    <MotionPage>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="card p-8"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">Your wallet</p>
          <h1 className="mt-2 text-3xl font-semibold">What would you like to do?</h1>
          <p className="mt-2 text-sm text-slate-400">
            Pick an action below to receive sats, send a payment, or review your history.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-4 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {actions.map((action) => (
            <motion.div key={action.to} variants={staggerItem}>
              <Link
                to={action.to}
                className="card card-hover relative block h-full overflow-hidden p-6"
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${action.accent} blur-2xl`}
                />
                <span className="inline-flex rounded-full bg-slate-800/80 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300">
                  {action.badge}
                </span>
                <h2 className="mt-4 text-xl font-semibold text-slate-100">{action.title}</h2>
                <p className="text-sm text-indigo-300">{action.subtitle}</p>
                <p className="mt-3 text-sm text-slate-400">{action.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-300">
                  Open
                  <span aria-hidden>&rarr;</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </MotionPage>
  );
}

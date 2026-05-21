import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MotionPage, staggerContainer, staggerItem } from "../components/MotionPage";

const features = [
  {
    title: "Receive instantly",
    body: "Spin up a Lightning invoice with a QR code in seconds.",
  },
  {
    title: "Send with a paste",
    body: "Paste any bolt11 invoice, decode it, and pay in one tap.",
  },
  {
    title: "Live settlement",
    body: "Webhook-driven status updates so the UI never lies.",
  },
];

export function HomePage() {
  return (
    <MotionPage>
      <section className="relative overflow-hidden">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[680px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl"
          animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="card glow-ring relative space-y-8 p-10 sm:p-14"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            className="text-xs uppercase tracking-[0.3em] text-indigo-300"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            Welcome to Blinky
          </motion.p>

          <motion.h1
            className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.5 }}
          >
            Move money over Bitcoin&apos;s Lightning Network &mdash;{" "}
            <span className="shimmer-text">fast, cheap, borderless.</span>
          </motion.h1>

          <motion.p
            className="max-w-2xl text-base text-slate-300 sm:text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28, duration: 0.5 }}
          >
            Create invoices to receive sats or paste a bolt11 string to send. Your wallet is
            your home base &mdash; open it to get started.
          </motion.p>

          <motion.div
            className="flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.45 }}
          >
            <Link to="/wallet" className="btn-primary px-6 py-3 text-base">
              Go to Wallet
              <span aria-hidden>&rarr;</span>
            </Link>
            <Link to="/history" className="btn-secondary px-6 py-3 text-base">
              View History
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-8 grid gap-4 sm:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={staggerItem}
              className="card card-hover p-6"
            >
              <h3 className="text-base font-semibold text-slate-100">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{feature.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </MotionPage>
  );
}

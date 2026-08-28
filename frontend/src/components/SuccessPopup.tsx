import { AnimatePresence, motion } from "framer-motion";

export function SuccessPopup({
  show,
  onClose,
}: {
  show: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md p-6 text-center card"
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-2xl font-semibold text-emerald-300">
              Payment received
            </p>
            <p className="mt-2 text-sm text-slate-300">
              The Lightning invoice has been confirmed.
            </p>
            <button
              className="px-4 py-2 mt-5 text-sm font-medium rounded-lg bg-emerald-500 text-slate-950"
              onClick={onClose}
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

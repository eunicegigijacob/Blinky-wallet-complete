import { Link, NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { to: "/wallet", label: "Wallet" },
  { to: "/invoice/create", label: "Receive" },
  { to: "/invoice/pay", label: "Send" },
  { to: "/history", label: "History" },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
    isActive
      ? "text-white"
      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
  }`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 font-semibold text-indigo-300"
          >
            <motion.span
              aria-hidden
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-sky-400 text-xs font-bold text-slate-950 shadow-lg shadow-indigo-500/30"
            >
              ⚡
            </motion.span>
            <span className="transition-colors group-hover:text-indigo-200">
              Blinky
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {({ isActive }) => (
                  <span className="relative inline-flex items-center">
                    {isActive ? (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 -z-10 rounded-lg bg-indigo-500/80 shadow-md shadow-indigo-500/30"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    ) : null}
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}

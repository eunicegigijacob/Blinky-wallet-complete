import { AnimatePresence } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { WalletPage } from "./pages/WalletPage";
import { CreateInvoicePage } from "./pages/CreateInvoicePage";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage";
import { PayInvoicePage } from "./pages/PayInvoicePage";
import { HistoryPage } from "./pages/HistoryPage";

export default function App() {
  const location = useLocation();

  return (
    <Layout>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/invoice/create" element={<CreateInvoicePage />} />
          <Route path="/invoice/pay" element={<PayInvoicePage />} />
          <Route path="/invoice/:invoiceId" element={<InvoiceDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
}

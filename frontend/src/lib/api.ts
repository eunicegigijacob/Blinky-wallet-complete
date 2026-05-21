import { DecodedInvoice, InvoiceRecord, PaymentResult, WalletBalance } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Request failed");
  }
  return (await response.json()) as T;
}

export const api = {
  createInvoice(payload: {
    amount: number;
    memo: string;
    clientReference?: string;
  }) {
    return request<InvoiceRecord>("/invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getInvoice(invoiceId: string) {
    return request<InvoiceRecord>(`/invoices/${invoiceId}`);
  },
  listTransfers() {
    return request<InvoiceRecord[]>("/transfers");
  },
  decodeInvoice(paymentRequest: string) {
    return request<DecodedInvoice>("/payments/decode", {
      method: "POST",
      body: JSON.stringify({ paymentRequest }),
    });
  },
  payInvoice(paymentRequest: string, simulateFailure = false) {
    return request<PaymentResult>("/payments/pay", {
      method: "POST",
      body: JSON.stringify({ paymentRequest, simulateFailure }),
    });
  },
  getWalletBalance() {
    return request<WalletBalance>("/providers/blink/wallet-balance");
  },
};

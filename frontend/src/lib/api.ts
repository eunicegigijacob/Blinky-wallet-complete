import { DecodedInvoice, InvoiceRecord, WalletBalance } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
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
  listPayments() {
    return request<InvoiceRecord[]>("/payments");
  },
  decodeInvoice(paymentRequest: string) {
    return request<DecodedInvoice>("/payments/decode", {
      method: "POST",
      body: JSON.stringify({ paymentRequest }),
    });
  },
  payInvoice(paymentRequest: string) {
    return request<InvoiceRecord>("/payments/pay", {
      method: "POST",
      body: JSON.stringify({ paymentRequest }),
    });
  },
  getWalletBalance() {
    return request<WalletBalance>("/providers/blink/wallet-balance");
  },
};

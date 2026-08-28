import { Injectable } from "@nestjs/common";
import {
  CreateInvoiceInput,
  CreateInvoiceResult,
  PaymentProvider,
  PayInvoiceResult,
  ProviderPaymentStatus,
  WalletBalanceOutput,
} from "./payment-provider.interface";

type ScriptedResult = "success" | "failure" | "timeout" | "expire";

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly statuses = new Map<string, ProviderPaymentStatus>();
  private nextCreate: ScriptedResult = "success";
  private nextPay: ScriptedResult = "success";
  private nextStatus: ScriptedResult = "success";

  failNextCreate() {
    this.nextCreate = "failure";
  }

  timeoutNextCreate() {
    this.nextCreate = "timeout";
  }

  failNextPay() {
    this.nextPay = "failure";
  }

  timeoutNextPay() {
    this.nextPay = "timeout";
  }

  expireNextStatus() {
    this.nextStatus = "expire";
  }

  failNextStatus() {
    this.nextStatus = "failure";
  }

  timeoutNextStatus() {
    this.nextStatus = "timeout";
  }

  setStatus(paymentHash: string, status: ProviderPaymentStatus) {
    this.statuses.set(paymentHash, status);
  }

  reset() {
    this.statuses.clear();
    this.nextCreate = "success";
    this.nextPay = "success";
    this.nextStatus = "success";
  }

  async createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
    this.throwIfScripted(this.nextCreate, "create");
    this.nextCreate = "success";

    const paymentHash = `mock_${Math.random().toString(16).slice(2, 18)}${Date.now().toString(16)}`;
    this.statuses.set(paymentHash, "PENDING");

    return {
      paymentRequest: `lnbc${input.amount}n1p${paymentHash}blink`,
      paymentHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      currency: "BTC",
    };
  }

  async getPaymentStatus(paymentHash: string): Promise<ProviderPaymentStatus> {
    this.throwIfScripted(this.nextStatus, "status");
    this.nextStatus = "success";
    return this.statuses.get(paymentHash) ?? "PENDING";
  }

  async payInvoice(paymentRequest: string): Promise<PayInvoiceResult> {
    if (this.nextPay === "timeout" || this.nextPay === "failure") {
      this.throwIfScripted(this.nextPay, "pay");
    }
    this.nextPay = "success";

    const providerPaymentId = `mock_pay_${Math.random().toString(16).slice(2, 14)}`;
    const status: ProviderPaymentStatus = paymentRequest.includes("failpay")
      ? "FAILED"
      : "PAID";
    this.statuses.set(providerPaymentId, status);

    return { status, providerPaymentId };
  }

  async health() {
    return { provider: "mock", ok: true, mode: "mock" as const };
  }

  async getWalletBalance(): Promise<WalletBalanceOutput> {
    return {
      walletId: "mock_wallet",
      walletCurrency: "BTC",
      balance: 250_000,
      mode: "mock",
    };
  }

  private throwIfScripted(script: ScriptedResult, operation: string) {
    if (script === "timeout") {
      const error = new Error(`Lightning provider timed out during ${operation}`);
      error.name = "TimeoutError";
      throw error;
    }
    if (script === "failure") {
      throw new Error(`Lightning provider failed during ${operation}`);
    }
  }
}

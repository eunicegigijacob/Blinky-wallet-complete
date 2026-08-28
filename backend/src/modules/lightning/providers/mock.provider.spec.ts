import { MockPaymentProvider } from "./mock.provider";

describe("MockPaymentProvider", () => {
  let provider: MockPaymentProvider;

  beforeEach(() => {
    provider = new MockPaymentProvider();
  });

  it("creates a pending invoice", async () => {
    const invoice = await provider.createInvoice({ amount: 1000, memo: "test" });
    expect(invoice.paymentRequest).toMatch(/^lnbc/);
    expect(invoice.paymentHash).toBeTruthy();
    await expect(provider.getPaymentStatus(invoice.paymentHash)).resolves.toBe(
      "PENDING",
    );
  });

  it("pays an invoice successfully", async () => {
    const result = await provider.payInvoice("lnbc1000n1ptest");
    expect(result.status).toBe("PAID");
    expect(result.providerPaymentId).toBeTruthy();
  });

  it("returns FAILED for failpay invoices", async () => {
    const result = await provider.payInvoice("lnbc1000n1failpay");
    expect(result.status).toBe("FAILED");
  });

  it("throws on scripted provider failure", async () => {
    provider.failNextCreate();
    await expect(
      provider.createInvoice({ amount: 1, memo: "x" }),
    ).rejects.toThrow("Lightning provider failed");
  });

  it("throws on scripted provider timeout", async () => {
    provider.timeoutNextCreate();
    await expect(
      provider.createInvoice({ amount: 1, memo: "x" }),
    ).rejects.toMatchObject({ name: "TimeoutError" });
  });

  it("can mark a payment expired", async () => {
    const invoice = await provider.createInvoice({ amount: 500, memo: "exp" });
    provider.setStatus(invoice.paymentHash, "EXPIRED");
    await expect(provider.getPaymentStatus(invoice.paymentHash)).resolves.toBe(
      "EXPIRED",
    );
  });
});

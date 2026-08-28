import { GatewayTimeoutException, ServiceUnavailableException } from "@nestjs/common";
import { BlinkProvider } from "./blink.provider";

describe("BlinkProvider", () => {
  const originalFetch = global.fetch;
  let provider: BlinkProvider;

  beforeEach(() => {
    provider = new BlinkProvider();
    process.env.BLINK_API_URL = "https://api.blink.sv/graphql";
    process.env.BLINK_API_KEY = "test-key";
    process.env.BLINK_WALLET_ID = "wallet-1";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("creates an invoice from a successful Blink response", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            me: {
              defaultAccount: {
                wallets: [{ id: "wallet-1", walletCurrency: "BTC", balance: 10 }],
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            lnInvoiceCreate: {
              invoice: {
                paymentRequest: "lnbc1000n1pabc",
                paymentHash: "hash-1",
              },
              errors: [],
            },
          },
        }),
      }) as unknown as typeof fetch;

    const invoice = await provider.createInvoice({ amount: 1000, memo: "coffee" });
    expect(invoice.paymentRequest).toBe("lnbc1000n1pabc");
    expect(invoice.paymentHash).toBe("hash-1");
    expect(invoice.currency).toBe("BTC");
  });

  it("maps provider errors to ServiceUnavailableException", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch;

    await expect(
      provider.getPaymentStatus("abc"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("maps timeouts to GatewayTimeoutException", async () => {
    const timeout = new Error("aborted");
    timeout.name = "TimeoutError";
    global.fetch = jest.fn().mockRejectedValue(timeout) as unknown as typeof fetch;

    await expect(provider.getPaymentStatus("abc")).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
  });
});

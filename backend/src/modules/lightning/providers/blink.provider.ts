import {
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  CreateInvoiceInput,
  CreateInvoiceResult,
  PaymentProvider,
  PayInvoiceResult,
  ProviderPaymentStatus,
  WalletBalanceOutput,
} from "./payment-provider.interface";

type WalletCurrency = "BTC" | "USD";

interface BlinkWallet {
  id: string;
  walletCurrency: WalletCurrency;
  balance: number;
}

interface BlinkInvoice {
  paymentRequest: string;
  paymentHash: string;
  paymentSecret?: string;
  satoshis?: number;
}

interface BlinkGraphqlError {
  message: string;
  path?: string[];
  code?: string;
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: BlinkGraphqlError[];
}

const PROVIDER_TIMEOUT_MS = 15_000;

const ME_WALLETS_QUERY = `
  query Me {
    me {
      defaultAccount {
        wallets {
          id
          walletCurrency
          balance
        }
      }
    }
  }
`;

const LN_INVOICE_CREATE_MUTATION = `
  mutation LnInvoiceCreate($input: LnInvoiceCreateInput!) {
    lnInvoiceCreate(input: $input) {
      invoice {
        paymentRequest
        paymentHash
        paymentSecret
        satoshis
      }
      errors {
        message
        path
        code
      }
    }
  }
`;

const LN_USD_INVOICE_CREATE_MUTATION = `
  mutation LnUsdInvoiceCreate($input: LnUsdInvoiceCreateInput!) {
    lnUsdInvoiceCreate(input: $input) {
      invoice {
        paymentRequest
        paymentHash
        paymentSecret
        satoshis
      }
      errors {
        message
        path
        code
      }
    }
  }
`;

const LN_INVOICE_STATUS_QUERY = `
  query LnInvoicePaymentStatusByHash($input: LnInvoicePaymentStatusByHashInput!) {
    lnInvoicePaymentStatusByHash(input: $input) {
      paymentHash
      status
    }
  }
`;

const LN_INVOICE_PAYMENT_SEND = `
  mutation LnInvoicePaymentSend($input: LnInvoicePaymentInput!) {
    lnInvoicePaymentSend(input: $input) {
      status
      transaction {
        id
        initiationVia {
          paymentHash
        }
      }
      errors {
        message
        path
        code
      }
    }
  }
`;

@Injectable()
export class BlinkProvider implements PaymentProvider {
  private readonly logger = new Logger(BlinkProvider.name);
  private cachedWalletCurrency: WalletCurrency | null = null;

  async createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
    const walletId = this.requireEnv("BLINK_WALLET_ID");
    const walletCurrency = await this.resolveWalletCurrency(walletId);
    const expiresInMinutes = 15;

    const variables = {
      input: {
        walletId,
        amount: input.amount,
        memo: input.memo,
        expiresIn: expiresInMinutes,
      },
    };

    const invoice =
      walletCurrency === "USD"
        ? await this.createUsdInvoice(variables)
        : await this.createBtcInvoice(variables);

    return {
      paymentRequest: invoice.paymentRequest,
      paymentHash: invoice.paymentHash,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      currency: walletCurrency,
    };
  }

  async getPaymentStatus(paymentHash: string): Promise<ProviderPaymentStatus> {
    const response = await this.gqlRequest<{
      lnInvoicePaymentStatusByHash: {
        paymentHash?: string;
        status?: string;
      };
    }>(LN_INVOICE_STATUS_QUERY, { input: { paymentHash } });

    return this.mapInvoiceStatus(
      response.lnInvoicePaymentStatusByHash?.status,
    );
  }

  async payInvoice(paymentRequest: string): Promise<PayInvoiceResult> {
    const walletId = this.requireEnv("BLINK_WALLET_ID");
    const response = await this.gqlRequest<{
      lnInvoicePaymentSend: {
        status?: string;
        transaction?: {
          id?: string;
          initiationVia?: { paymentHash?: string };
        };
        errors?: BlinkGraphqlError[];
      };
    }>(LN_INVOICE_PAYMENT_SEND, {
      input: { walletId, paymentRequest },
    });

    const payload = response.lnInvoicePaymentSend;
    if (payload.errors && payload.errors.length > 0) {
      throw new ServiceUnavailableException("Lightning provider request failed");
    }

    const providerPaymentId =
      payload.transaction?.initiationVia?.paymentHash ??
      payload.transaction?.id ??
      `blink_pay_${Date.now()}`;

    return {
      status: this.mapSendStatus(payload.status),
      providerPaymentId,
    };
  }

  async health() {
    try {
      const wallets = await this.fetchWallets();
      const walletId = process.env.BLINK_WALLET_ID;
      const ok = walletId
        ? wallets.some((wallet) => wallet.id === walletId)
        : wallets.length > 0;
      return { provider: "blink", ok, mode: "live" as const };
    } catch (error) {
      this.logger.error(
        `Blink health check failed: ${(error as Error).message}`,
      );
      return { provider: "blink", ok: false, mode: "live" as const };
    }
  }

  async getWalletBalance(): Promise<WalletBalanceOutput> {
    const wallets = await this.fetchWallets();
    if (wallets.length === 0) {
      throw new ServiceUnavailableException("Lightning provider returned no wallets");
    }

    const configuredWalletId = process.env.BLINK_WALLET_ID;
    const wallet =
      (configuredWalletId
        ? wallets.find((candidate) => candidate.id === configuredWalletId)
        : wallets[0]) ?? wallets[0];

    return {
      walletId: wallet.id,
      walletCurrency: wallet.walletCurrency,
      balance: wallet.balance,
      mode: "live",
    };
  }

  private mapInvoiceStatus(status?: string): ProviderPaymentStatus {
    switch ((status ?? "").toUpperCase()) {
      case "PAID":
        return "PAID";
      case "EXPIRED":
        return "EXPIRED";
      case "FAILED":
      case "FAILURE":
        return "FAILED";
      default:
        return "PENDING";
    }
  }

  private mapSendStatus(status?: string): ProviderPaymentStatus {
    switch ((status ?? "").toUpperCase()) {
      case "SUCCESS":
      case "ALREADY_PAID":
        return "PAID";
      case "FAILURE":
      case "FAILED":
        return "FAILED";
      default:
        return "PENDING";
    }
  }

  private async createBtcInvoice(variables: {
    input: {
      walletId: string;
      amount: number;
      memo: string;
      expiresIn: number;
    };
  }): Promise<BlinkInvoice> {
    const response = await this.gqlRequest<{
      lnInvoiceCreate: {
        invoice: BlinkInvoice | null;
        errors: BlinkGraphqlError[];
      };
    }>(LN_INVOICE_CREATE_MUTATION, variables);

    return this.unwrapInvoice(
      response.lnInvoiceCreate.invoice,
      response.lnInvoiceCreate.errors,
    );
  }

  private async createUsdInvoice(variables: {
    input: {
      walletId: string;
      amount: number;
      memo: string;
      expiresIn: number;
    };
  }): Promise<BlinkInvoice> {
    const response = await this.gqlRequest<{
      lnUsdInvoiceCreate: {
        invoice: BlinkInvoice | null;
        errors: BlinkGraphqlError[];
      };
    }>(LN_USD_INVOICE_CREATE_MUTATION, variables);

    return this.unwrapInvoice(
      response.lnUsdInvoiceCreate.invoice,
      response.lnUsdInvoiceCreate.errors,
    );
  }

  private unwrapInvoice(
    invoice: BlinkInvoice | null,
    errors: BlinkGraphqlError[] | undefined,
  ): BlinkInvoice {
    if (errors && errors.length > 0) {
      throw new ServiceUnavailableException("Lightning provider request failed");
    }
    if (!invoice) {
      throw new ServiceUnavailableException("Lightning provider returned no invoice");
    }
    return invoice;
  }

  private async resolveWalletCurrency(walletId: string): Promise<WalletCurrency> {
    if (this.cachedWalletCurrency) {
      return this.cachedWalletCurrency;
    }

    const wallets = await this.fetchWallets();
    const match = wallets.find((wallet) => wallet.id === walletId);
    if (!match) {
      throw new ServiceUnavailableException("Configured Blink wallet was not found");
    }
    this.cachedWalletCurrency = match.walletCurrency;
    return match.walletCurrency;
  }

  private async fetchWallets(): Promise<BlinkWallet[]> {
    const response = await this.gqlRequest<{
      me: { defaultAccount: { wallets: BlinkWallet[] } };
    }>(ME_WALLETS_QUERY, {});
    return response.me.defaultAccount.wallets;
  }

  private async gqlRequest<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const url = this.requireEnv("BLINK_API_URL");
    const apiKey = this.requireEnv("BLINK_API_KEY");

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new GatewayTimeoutException("Lightning provider timed out");
      }
      throw new ServiceUnavailableException("Lightning provider is unavailable");
    }

    if (!response.ok) {
      throw new ServiceUnavailableException("Lightning provider request failed");
    }

    const body = (await response.json()) as GraphqlResponse<T>;
    if (body.errors && body.errors.length > 0) {
      throw new ServiceUnavailableException("Lightning provider request failed");
    }
    if (!body.data) {
      throw new ServiceUnavailableException("Lightning provider returned an empty response");
    }
    return body.data;
  }

  private requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new ServiceUnavailableException("Lightning provider is not configured");
    }
    return value;
  }
}

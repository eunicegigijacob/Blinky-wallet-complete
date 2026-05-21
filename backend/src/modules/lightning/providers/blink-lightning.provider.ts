import { Injectable, Logger } from "@nestjs/common";
import {
  CreateLightningInvoiceInput,
  CreateLightningInvoiceOutput,
  LightningProvider,
  WalletBalanceOutput,
} from "./lightning-provider.interface";

type WalletCurrency = "BTC" | "USD";

interface BlinkWallet {
  id: string;
  walletCurrency: WalletCurrency;
  balance: number;
}

interface BlinkInvoice {
  paymentRequest: string;
  paymentHash: string;
  paymentSecret: string;
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

@Injectable()
export class BlinkLightningProvider implements LightningProvider {
  private readonly logger = new Logger(BlinkLightningProvider.name);
  private cachedWalletCurrency: WalletCurrency | null = null;

  async createInvoice(
    input: CreateLightningInvoiceInput,
  ): Promise<CreateLightningInvoiceOutput> {
    if (!this.isLiveMode()) {
      return this.mockInvoice(input);
    }

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
    };
  }

  async health() {
    if (!this.isLiveMode()) {
      return { provider: "blink", ok: true, mode: "mock" } as const;
    }

    try {
      const wallets = await this.fetchWallets();
      const walletId = process.env.BLINK_WALLET_ID;
      const ok = walletId
        ? wallets.some((wallet) => wallet.id === walletId)
        : wallets.length > 0;
      return { provider: "blink", ok, mode: "live" } as const;
    } catch (error) {
      this.logger.error(
        `Blink health check failed: ${(error as Error).message}`,
      );
      return { provider: "blink", ok: false, mode: "live" } as const;
    }
  }

  async getWalletBalance(): Promise<WalletBalanceOutput> {
    if (!this.isLiveMode()) {
      return {
        walletId: process.env.BLINK_WALLET_ID ?? "mock_wallet",
        walletCurrency: "BTC",
        balance: 250_000,
        mode: "mock",
      };
    }

    const wallets = await this.fetchWallets();
    if (wallets.length === 0) {
      throw new Error("Blink returned no wallets for the account");
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
      "lnInvoiceCreate",
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
      "lnUsdInvoiceCreate",
    );
  }

  private unwrapInvoice(
    invoice: BlinkInvoice | null,
    errors: BlinkGraphqlError[] | undefined,
    operation: string,
  ): BlinkInvoice {
    if (errors && errors.length > 0) {
      const message = errors.map((err) => err.message).join("; ");
      throw new Error(`Blink ${operation} returned errors: ${message}`);
    }
    if (!invoice) {
      throw new Error(`Blink ${operation} returned no invoice`);
    }
    return invoice;
  }

  private async resolveWalletCurrency(
    walletId: string,
  ): Promise<WalletCurrency> {
    if (this.cachedWalletCurrency) {
      return this.cachedWalletCurrency;
    }

    const wallets = await this.fetchWallets();
    const match = wallets.find((wallet) => wallet.id === walletId);
    if (!match) {
      throw new Error(
        `Configured BLINK_WALLET_ID does not match any wallet on the account`,
      );
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

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Blink HTTP error ${response.status}: ${text || response.statusText}`,
      );
    }

    const body = (await response.json()) as GraphqlResponse<T>;
    if (body.errors && body.errors.length > 0) {
      const message = body.errors.map((err) => err.message).join("; ");
      throw new Error(`Blink GraphQL error: ${message}`);
    }
    if (!body.data) {
      throw new Error("Blink GraphQL response did not include data");
    }
    return body.data;
  }

  private isLiveMode(): boolean {
    return Boolean(process.env.BLINK_API_KEY && process.env.BLINK_API_URL);
  }

  private requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  private mockInvoice(
    input: CreateLightningInvoiceInput,
  ): CreateLightningInvoiceOutput {
    const paymentHash = `blink_${Math.random().toString(36).slice(2, 14)}`;
    return {
      paymentRequest: `lnbc${input.amount}n1p${paymentHash}blink`,
      paymentHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }
}

import { Injectable } from "@nestjs/common";
import {
  CreateLightningInvoiceInput,
  LightningProvider,
  WalletBalanceOutput,
} from "./providers/lightning-provider.interface";
import { BlinkLightningProvider } from "./providers/blink-lightning.provider";

@Injectable()
export class LightningService {
  constructor(private readonly provider: BlinkLightningProvider) {}

  createInvoice(input: CreateLightningInvoiceInput) {
    return this.provider.createInvoice(input);
  }

  providerHealth() {
    return this.provider.health();
  }

  getWalletBalance(): Promise<WalletBalanceOutput> {
    return this.provider.getWalletBalance();
  }

  getProvider(): LightningProvider {
    return this.provider;
  }
}

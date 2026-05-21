import { Controller, Get } from "@nestjs/common";
import { LightningService } from "./lightning.service";

@Controller("providers/blink")
export class LightningController {
  constructor(private readonly lightningService: LightningService) {}

  @Get("status")
  status() {
    return this.lightningService.providerHealth();
  }

  @Get("wallet-balance")
  walletBalance() {
    return this.lightningService.getWalletBalance();
  }
}

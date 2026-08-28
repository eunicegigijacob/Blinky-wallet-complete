import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LightningService } from "./lightning.service";

@ApiTags("provider")
@Controller("providers/blink")
export class LightningController {
  constructor(private readonly lightningService: LightningService) {}

  @Get("status")
  @ApiOperation({ summary: "Blink provider health" })
  @ApiOkResponse({
    schema: {
      example: { provider: "mock", ok: true, mode: "mock" },
    },
  })
  status() {
    return this.lightningService.providerHealth();
  }

  @Get("wallet-balance")
  @ApiOperation({ summary: "Configured Blink wallet balance" })
  @ApiOkResponse({
    schema: {
      example: {
        walletId: "mock_wallet",
        walletCurrency: "BTC",
        balance: 250000,
        mode: "mock",
      },
    },
  })
  walletBalance() {
    return this.lightningService.getWalletBalance();
  }
}

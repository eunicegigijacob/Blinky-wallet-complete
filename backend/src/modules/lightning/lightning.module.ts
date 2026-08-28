import { Module } from "@nestjs/common";
import { BlinkProvider } from "./providers/blink.provider";
import { MockPaymentProvider } from "./providers/mock.provider";
import { PAYMENT_PROVIDER } from "./providers/payment-provider.interface";
import { LightningService } from "./lightning.service";
import { LightningController } from "./lightning.controller";

function resolveProviderClass() {
  const explicit = (process.env.PAYMENT_PROVIDER ?? "").toLowerCase();
  if (explicit === "mock" || !process.env.BLINK_API_KEY) {
    return MockPaymentProvider;
  }
  return BlinkProvider;
}

@Module({
  providers: [
    BlinkProvider,
    MockPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      useClass: resolveProviderClass(),
    },
    LightningService,
  ],
  controllers: [LightningController],
  exports: [LightningService, PAYMENT_PROVIDER, MockPaymentProvider],
})
export class LightningModule {}

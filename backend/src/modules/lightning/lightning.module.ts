import { Module } from "@nestjs/common";
import { BlinkLightningProvider } from "./providers/blink-lightning.provider";
import { LightningService } from "./lightning.service";
import { LightningController } from "./lightning.controller";

@Module({
  providers: [BlinkLightningProvider, LightningService],
  controllers: [LightningController],
  exports: [LightningService]
})
export class LightningModule {}

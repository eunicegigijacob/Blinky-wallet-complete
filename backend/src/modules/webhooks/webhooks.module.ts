import { Module } from "@nestjs/common";
import { TransfersModule } from "../transfers/transfers.module";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";

@Module({
  imports: [TransfersModule],
  controllers: [WebhooksController],
  providers: [WebhooksService]
})
export class WebhooksModule {}

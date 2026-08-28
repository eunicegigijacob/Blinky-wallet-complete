import "./load-env";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { LightningModule } from "./modules/lightning/lightning.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/blinky",
      }),
    }),
    InvoicesModule,
    LightningModule,
    PaymentsModule,
    WebhooksModule,
    HealthModule,
  ],
})
export class AppModule {}

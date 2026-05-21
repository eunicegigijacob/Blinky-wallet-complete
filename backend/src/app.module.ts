import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { LightningModule } from "./modules/lightning/lightning.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { RemittanceModule } from "./modules/remittance/remittance.module";
import { TransfersModule } from "./modules/transfers/transfers.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { HealthModule } from "./modules/health/health.module";

function loadEnvFromFile() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFromFile();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI ?? ""),
    InvoicesModule,
    LightningModule,
    PaymentsModule,
    RemittanceModule,
    TransfersModule,
    WebhooksModule,
    HealthModule,
  ],
})
export class AppModule {}

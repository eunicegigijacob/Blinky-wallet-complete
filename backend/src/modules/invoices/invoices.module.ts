import { Module } from "@nestjs/common";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";
import { PaymentsModule } from "../payments/payments.module";
import { LightningModule } from "../lightning/lightning.module";

@Module({
  imports: [PaymentsModule, LightningModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}

import { Module } from "@nestjs/common";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";
import { TransfersModule } from "../transfers/transfers.module";
import { LightningModule } from "../lightning/lightning.module";

@Module({
  imports: [TransfersModule, LightningModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService]
})
export class InvoicesModule {}

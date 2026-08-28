import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Payment, PaymentSchema } from "./schemas/payment.schema";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { LightningModule } from "../lightning/lightning.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    LightningModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

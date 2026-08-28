import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { PaymentStatus } from "../payment-transitions";

export type PaymentDocument = HydratedDocument<Payment>;

export type PaymentDirection = "incoming" | "outgoing";
export type PaymentCurrency = "BTC" | "USD";

@Schema({ timestamps: true, collection: "payments" })
export class Payment {
  @Prop({ required: true, unique: true })
  invoiceId!: string;

  @Prop({ required: true, default: "blink" })
  provider!: string;

  @Prop({ required: true, unique: true })
  providerPaymentId!: string;

  @Prop({ required: true })
  paymentRequest!: string;

  @Prop({ required: true })
  qrPayload!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true, enum: ["BTC", "USD"] })
  currency!: PaymentCurrency;

  @Prop({ required: true, enum: ["incoming", "outgoing"] })
  direction!: PaymentDirection;

  @Prop({ required: true, enum: ["PENDING", "PAID", "FAILED", "EXPIRED"] })
  status!: PaymentStatus;

  @Prop({ required: true })
  memo!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  paidAt?: Date | null;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

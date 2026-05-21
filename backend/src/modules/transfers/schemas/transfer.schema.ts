import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type TransferDocument = HydratedDocument<Transfer>;

export type TransferStatus =
  | "waiting_for_payment"
  | "paid"
  | "expired"
  | "failed";

@Schema({ timestamps: true })
export class Transfer {
  @Prop({ required: true, unique: true })
  invoiceId!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true })
  memo!: string;

  @Prop({ required: true })
  paymentRequest!: string;

  @Prop({ required: true })
  qrPayload!: string;

  @Prop({ required: true, unique: true })
  paymentHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  paidAt?: Date | null;

  @Prop({ required: true, enum: ["waiting_for_payment", "paid", "expired", "failed"] })
  status!: TransferStatus;
}

export const TransferSchema = SchemaFactory.createForClass(Transfer);

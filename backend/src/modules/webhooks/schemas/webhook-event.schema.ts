import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type WebhookEventDocument = HydratedDocument<WebhookEvent>;

@Schema({ collection: "webhook_events" })
export class WebhookEvent {
  @Prop({ required: true })
  provider!: string;

  @Prop({ required: true })
  eventId!: string;

  @Prop({ required: true })
  eventType!: string;

  @Prop({ type: String, default: null })
  paymentId?: string | null;

  @Prop({ required: true })
  status!: "received" | "processed" | "duplicate" | "ignored";

  @Prop({ required: true })
  receivedAt!: Date;

  @Prop({ type: Date, default: null })
  processedAt?: Date | null;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);
WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

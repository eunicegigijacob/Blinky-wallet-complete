import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { randomUUID } from "crypto";
import { Payment, PaymentDocument } from "./schemas/payment.schema";
import {
  assertPaymentTransition,
  InvalidPaymentTransitionError,
  isTerminalStatus,
  PaymentStatus,
} from "./payment-transitions";
import { decodeLightningInvoice } from "./bolt11";
import { LightningService } from "../lightning/lightning.service";

export interface CreatePaymentInput {
  amount: number;
  memo: string;
  paymentHash: string;
  paymentRequest: string;
  expiresAt: Date;
  currency: "BTC" | "USD";
  direction: "incoming" | "outgoing";
  status?: PaymentStatus;
  paidAt?: Date | null;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly lightningService: LightningService,
  ) {}

  decode(paymentRequest: string) {
    return decodeLightningInvoice(paymentRequest);
  }

  async pay(paymentRequest: string) {
    const decoded = decodeLightningInvoice(paymentRequest);
    if (!decoded.amountSats) {
      throw new BadRequestException("Invoice amount is missing or invalid");
    }

    const result = await this.lightningService.payInvoice(paymentRequest);
    const status: PaymentStatus = result.status === "FAILED" ? "FAILED" : result.status === "PAID" ? "PAID" : "PENDING";

    return this.create({
      amount: decoded.amountSats,
      memo: decoded.description || "Outgoing Lightning payment",
      paymentHash: result.providerPaymentId || decoded.paymentHash,
      paymentRequest,
      expiresAt: new Date(decoded.expiresAt),
      currency: "BTC",
      direction: "outgoing",
      status,
      paidAt: status === "PAID" ? new Date() : null,
    });
  }

  async create(payload: CreatePaymentInput) {
    const invoiceId = `pay_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    return this.paymentModel.create({
      invoiceId,
      provider: "blink",
      providerPaymentId: payload.paymentHash,
      paymentRequest: payload.paymentRequest,
      qrPayload: payload.paymentRequest,
      amount: payload.amount,
      currency: payload.currency,
      direction: payload.direction,
      status: payload.status ?? "PENDING",
      memo: payload.memo,
      expiresAt: payload.expiresAt,
      paidAt: payload.paidAt ?? null,
    });
  }

  list() {
    return this.paymentModel.find().sort({ createdAt: -1 }).limit(100).lean().exec();
  }

  async findByInvoiceId(invoiceId: string) {
    const payment = await this.paymentModel.findOne({ invoiceId }).exec();
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    return this.expireIfNeeded(payment);
  }

  async findByProviderPaymentId(providerPaymentId: string) {
    return this.paymentModel.findOne({ providerPaymentId }).exec();
  }

  async applyStatus(
    invoiceId: string,
    next: PaymentStatus,
    paidAt?: Date,
  ) {
    const payment = await this.paymentModel.findOne({ invoiceId }).exec();
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    return this.applyStatusToDocument(payment, next, paidAt);
  }

  async markByProviderPaymentId(
    providerPaymentId: string,
    next: PaymentStatus,
    paidAt?: Date,
  ) {
    const payment = await this.paymentModel.findOne({ providerPaymentId }).exec();
    if (!payment) {
      return null;
    }
    return this.applyStatusToDocument(payment, next, paidAt);
  }

  async expireIfNeeded(payment: PaymentDocument) {
    if (
      payment.status === "PENDING" &&
      payment.expiresAt.getTime() <= Date.now()
    ) {
      return this.applyStatusToDocument(payment, "EXPIRED");
    }
    return payment.toObject();
  }

  private async applyStatusToDocument(
    payment: PaymentDocument,
    next: PaymentStatus,
    paidAt?: Date,
  ) {
    try {
      const result = assertPaymentTransition(payment.status, next);
      if (result === "noop") {
        return payment.toObject();
      }
    } catch (error) {
      if (error instanceof InvalidPaymentTransitionError) {
        if (isTerminalStatus(payment.status)) {
          return payment.toObject();
        }
        throw new ConflictException(error.message);
      }
      throw error;
    }

    payment.status = next;
    if (next === "PAID") {
      payment.paidAt = paidAt ?? new Date();
    }
    await payment.save();
    return payment.toObject();
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Transfer, TransferDocument } from "./schemas/transfer.schema";

@Injectable()
export class TransfersService {
  constructor(
    @InjectModel(Transfer.name)
    private readonly transferModel: Model<TransferDocument>
  ) {}

  create(payload: Partial<Transfer>) {
    return this.transferModel.create(payload);
  }

  list() {
    return this.transferModel.find().sort({ createdAt: -1 }).limit(100).lean().exec();
  }

  async findByInvoiceId(invoiceId: string) {
    const transfer = await this.transferModel.findOne({ invoiceId }).lean().exec();
    if (!transfer) {
      throw new NotFoundException("Invoice not found");
    }
    return transfer;
  }

  async markPaidByHash(paymentHash: string, paidAt?: Date) {
    const current = await this.transferModel.findOne({ paymentHash }).exec();
    if (!current) {
      return null;
    }
    if (current.status === "paid") {
      return current.toObject();
    }

    current.status = "paid";
    current.paidAt = paidAt ?? new Date();
    await current.save();
    return current.toObject();
  }

  async updateStatusByInvoiceId(
    invoiceId: string,
    status: "waiting_for_payment" | "paid" | "expired" | "failed"
  ) {
    const current = await this.transferModel.findOne({ invoiceId }).exec();
    if (!current) {
      throw new NotFoundException("Invoice not found");
    }
    current.status = status;
    if (status === "paid" && !current.paidAt) {
      current.paidAt = new Date();
    }
    await current.save();
    return current.toObject();
  }
}

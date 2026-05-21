import { Injectable } from "@nestjs/common";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { TransfersService } from "../transfers/transfers.service";
import { LightningService } from "../lightning/lightning.service";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly transfersService: TransfersService,
    private readonly lightningService: LightningService
  ) {}

  async createInvoice(payload: CreateInvoiceDto) {
    const invoiceId = `inv_${Math.random().toString(36).slice(2, 10)}`;
    const lightningInvoice = await this.lightningService.createInvoice(payload);

    return this.transfersService.create({
      invoiceId,
      amount: payload.amount,
      memo: payload.memo,
      paymentHash: lightningInvoice.paymentHash,
      paymentRequest: lightningInvoice.paymentRequest,
      qrPayload: lightningInvoice.paymentRequest,
      expiresAt: lightningInvoice.expiresAt,
      status: "waiting_for_payment"
    });
  }

  getInvoice(invoiceId: string) {
    return this.transfersService.findByInvoiceId(invoiceId);
  }

  async expireInvoice(invoiceId: string) {
    const current = await this.transfersService.findByInvoiceId(invoiceId);
    if (current.status === "paid") {
      return current;
    }
    return this.transfersService.updateStatusByInvoiceId(invoiceId, "expired");
  }
}

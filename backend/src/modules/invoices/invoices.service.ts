import { Injectable } from "@nestjs/common";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { PaymentsService } from "../payments/payments.service";
import { LightningService } from "../lightning/lightning.service";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly lightningService: LightningService,
  ) {}

  async createInvoice(payload: CreateInvoiceDto) {
    const lightningInvoice = await this.lightningService.createInvoice(payload);

    return this.paymentsService.create({
      amount: payload.amount,
      memo: payload.memo,
      paymentHash: lightningInvoice.paymentHash,
      paymentRequest: lightningInvoice.paymentRequest,
      expiresAt: lightningInvoice.expiresAt,
      currency: lightningInvoice.currency,
      direction: "incoming",
    });
  }

  getInvoice(invoiceId: string) {
    return this.paymentsService.findByInvoiceId(invoiceId);
  }
}

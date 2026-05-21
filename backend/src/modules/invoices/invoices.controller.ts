import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";

@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  create(@Body() payload: CreateInvoiceDto) {
    return this.invoicesService.createInvoice(payload);
  }

  @Get(":invoiceId")
  getOne(@Param("invoiceId") invoiceId: string) {
    return this.invoicesService.getInvoice(invoiceId);
  }

  @Get(":invoiceId/qr")
  async getQr(@Param("invoiceId") invoiceId: string) {
    const invoice = await this.invoicesService.getInvoice(invoiceId);
    return { qrPayload: invoice.qrPayload };
  }

  @Post(":invoiceId/resend-notification")
  resendNotification(@Param("invoiceId") invoiceId: string) {
    return {
      invoiceId,
      delivered: true,
      note: "Notification flow placeholder for complete repo extension.",
    };
  }

  @Post(":invoiceId/expire")
  expire(@Param("invoiceId") invoiceId: string) {
    return this.invoicesService.expireInvoice(invoiceId);
  }
}

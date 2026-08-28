import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";

const INVOICE_ID = /^pay_[a-zA-Z0-9]+$/;

@ApiTags("invoices")
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: "Create a Lightning invoice" })
  @ApiOkResponse({
    description: "Pending incoming payment with bolt11 invoice and identifier",
  })
  create(@Body() payload: CreateInvoiceDto) {
    return this.invoicesService.createInvoice(payload);
  }

  @Get(":invoiceId")
  @ApiOperation({ summary: "Get invoice / payment status" })
  @ApiParam({ name: "invoiceId", example: "pay_ab12cd34ef56" })
  getOne(@Param("invoiceId") invoiceId: string) {
    if (!INVOICE_ID.test(invoiceId)) {
      throw new BadRequestException("Invalid payment identifier");
    }
    return this.invoicesService.getInvoice(invoiceId);
  }
}

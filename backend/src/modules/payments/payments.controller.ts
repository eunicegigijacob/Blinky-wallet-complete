import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { DecodeInvoiceDto } from "./dto/decode-invoice.dto";
import { PayInvoiceDto } from "./dto/pay-invoice.dto";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: "List recent payments" })
  @ApiOkResponse({
    description: "Recent incoming and outgoing payments",
  })
  list() {
    return this.paymentsService.list();
  }

  @Post("decode")
  @ApiOperation({ summary: "Decode a bolt11 Lightning invoice" })
  decode(@Body() payload: DecodeInvoiceDto) {
    return this.paymentsService.decode(payload.paymentRequest);
  }

  @Post("pay")
  @ApiOperation({ summary: "Pay a bolt11 invoice via Blink" })
  @ApiOkResponse({
    description: "Outgoing payment record. Status may be PENDING, PAID, or FAILED.",
  })
  pay(@Body() payload: PayInvoiceDto) {
    return this.paymentsService.pay(payload.paymentRequest);
  }
}

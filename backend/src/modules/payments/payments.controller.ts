import { Body, Controller, Post } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { DecodeInvoiceDto } from "./dto/decode-invoice.dto";
import { PayInvoiceDto } from "./dto/pay-invoice.dto";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("decode")
  decode(@Body() payload: DecodeInvoiceDto) {
    return this.paymentsService.decode(payload.paymentRequest);
  }

  @Post("pay")
  pay(@Body() payload: PayInvoiceDto) {
    return this.paymentsService.pay(
      payload.paymentRequest,
      payload.simulateFailure ?? false
    );
  }
}

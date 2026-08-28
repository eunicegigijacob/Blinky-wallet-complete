import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MinLength } from "class-validator";

export class PayInvoiceDto {
  @ApiProperty({ example: "lnbc50u1p..." })
  @IsString()
  @MinLength(10)
  @Matches(/^ln/i, { message: "Invalid Lightning invoice: expected a bolt11 string starting with ln" })
  paymentRequest!: string;
}

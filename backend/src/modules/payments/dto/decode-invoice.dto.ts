import { IsString, MinLength } from "class-validator";

export class DecodeInvoiceDto {
  @IsString()
  @MinLength(10)
  paymentRequest!: string;
}

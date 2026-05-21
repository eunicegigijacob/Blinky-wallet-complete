import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class PayInvoiceDto {
  @IsString()
  @MinLength(10)
  paymentRequest!: string;

  /**
   * Demo-only switch: forces a failed response so the UI can showcase
   * both happy and failure paths without contacting Blink.
   */
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}

import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateInvoiceDto {
  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  memo!: string;

  @IsOptional()
  @IsString()
  clientReference?: string;
}

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateInvoiceDto {
  @ApiProperty({ example: 5000, minimum: 1, description: "Amount in sats (BTC wallet) or cents (USD wallet)" })
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amount!: number;

  @ApiProperty({ example: "Family support transfer" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  memo!: string;

  @ApiPropertyOptional({ example: "order-42" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientReference?: string;
}

import { Type } from "class-transformer";
import {
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class BlinkInitiationViaDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  paymentHash?: string;
}

export class BlinkTransactionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  createdAt?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BlinkInitiationViaDto)
  initiationVia?: BlinkInitiationViaDto;
}

export class BlinkWebhookDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  walletId?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BlinkTransactionDto)
  transaction?: BlinkTransactionDto;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  paymentHash?: string;
}

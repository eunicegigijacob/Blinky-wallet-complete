import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Transfer, TransferSchema } from "./schemas/transfer.schema";
import { TransfersService } from "./transfers.service";
import { TransfersController } from "./transfers.controller";

@Module({
  imports: [MongooseModule.forFeature([{ name: Transfer.name, schema: TransferSchema }])],
  providers: [TransfersService],
  controllers: [TransfersController],
  exports: [TransfersService]
})
export class TransfersModule {}

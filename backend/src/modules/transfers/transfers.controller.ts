import { Controller, Get } from "@nestjs/common";
import { TransfersService } from "./transfers.service";

@Controller("transfers")
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get()
  list() {
    return this.transfersService.list();
  }
}

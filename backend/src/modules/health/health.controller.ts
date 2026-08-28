import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({ summary: "Health check including MongoDB connectivity" })
  @ApiOkResponse({
    schema: {
      example: {
        status: "ok",
        database: "up",
      },
    },
  })
  getHealth() {
    const databaseUp = this.connection.readyState === 1;
    return {
      status: databaseUp ? "ok" : "degraded",
      database: databaseUp ? "up" : "down",
    };
  }
}

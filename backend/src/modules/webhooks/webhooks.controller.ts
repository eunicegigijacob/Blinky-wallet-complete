import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Headers,
  Logger,
  Post,
  Req,
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BlinkWebhookDto } from "./dto/blink-webhook.dto";
import { WebhooksService } from "./webhooks.service";

@ApiTags("webhooks")
@Controller("webhooks/blink")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive Blink (Svix) payment webhooks" })
  @ApiOkResponse({
    description: "Webhook acknowledged. Duplicate events return status=duplicate.",
  })
  async receive(
    @Body() payload: BlinkWebhookDto,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req?: { rawBody?: Buffer },
  ) {
    this.logger.log(
      `Received Blink webhook eventType=${payload?.eventType ?? "unknown"}`,
    );
    const rawBody =
      req?.rawBody instanceof Buffer ? req.rawBody.toString("utf8") : undefined;
    return this.webhooksService.handleBlinkEvent(payload, { headers, rawBody });
  }
}

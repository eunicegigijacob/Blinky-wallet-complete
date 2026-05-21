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
import { BlinkWebhookPayload, WebhooksService } from "./webhooks.service";

@Controller("webhooks/blink")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Receive a Blink webhook event.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Body() payload: BlinkWebhookPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req?: { rawBody?: Buffer },
  ) {
    this.logger.log(
      `Received Blink webhook eventType=${payload?.eventType ?? "unknown"} txId=${payload?.transaction?.id ?? payload?.id ?? "?"}`,
    );
    const rawBody =
      req?.rawBody instanceof Buffer ? req.rawBody.toString("utf8") : undefined;
    return this.webhooksService.handleBlinkEvent(payload, { headers, rawBody });
  }
}

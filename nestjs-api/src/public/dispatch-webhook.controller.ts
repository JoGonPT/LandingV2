import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Post } from "@nestjs/common";

import { DispatchService } from "./dispatch.service";

@Controller("webhooks")
export class DispatchWebhookController {
  constructor(private readonly dispatch: DispatchService) {}

  /** POST /api/webhooks/dispatch — optional TransferCRM → Way2Go dispatch ping (see DispatchService). */
  @Post("dispatch")
  @HttpCode(200)
  ingest(@Body() body: unknown, @Headers("x-transfercrm-signature") sig?: string) {
    const r = this.dispatch.recordCrmDispatchSignal(body, sig);
    if (!r.ok) {
      throw new HttpException(r.message ?? "Invalid dispatch signal.", HttpStatus.BAD_REQUEST);
    }
    return { received: true as const };
  }
}

import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common/interfaces";
import type { Request } from "express";

import { PaymentsService } from "./payments.service";

@Controller("webhooks")
export class StripeWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("stripe")
  @HttpCode(HttpStatus.OK)
  async stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string | undefined,
  ) {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new BadRequestException("Raw body required");
    }
    return this.payments.handleStripeWebhook(raw, signature);
  }
}

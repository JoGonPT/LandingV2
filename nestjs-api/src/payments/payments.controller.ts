import { BadRequestException, Body, Controller, Get, Headers, Post, Query } from "@nestjs/common";

import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("create-intent")
  createIntent(@Body() body: unknown, @Headers("idempotency-key") idempotencyKey?: string) {
    return this.payments.createIntent(body, idempotencyKey);
  }

  @Get("checkout-status")
  checkoutStatus(@Query("payment_intent") paymentIntent: string | undefined) {
    const pi = paymentIntent?.trim();
    if (!pi || !pi.startsWith("pi_")) {
      throw new BadRequestException("payment_intent required");
    }
    return this.payments.getCheckoutStatus(pi);
  }
}

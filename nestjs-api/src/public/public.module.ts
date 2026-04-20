import { Module } from "@nestjs/common";

import { BookingService } from "./booking.service";
import { DispatchWebhookController } from "./dispatch-webhook.controller";
import { DispatchService } from "./dispatch.service";
import { MapService } from "./map.service";
import { PricingService } from "./pricing.service";
import { PublicQuoteController } from "./public-quote.controller";

@Module({
  controllers: [PublicQuoteController, DispatchWebhookController],
  providers: [MapService, PricingService, DispatchService, BookingService],
  exports: [PricingService, DispatchService],
})
export class PublicModule {}

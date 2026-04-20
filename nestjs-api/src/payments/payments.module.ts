import { Module } from "@nestjs/common";

import { PublicModule } from "../public/public.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { StripeWebhookController } from "./stripe-webhook.controller";

@Module({
  imports: [PublicModule],
  controllers: [PaymentsController, StripeWebhookController],
  providers: [PaymentsService],
})
export class PaymentsModule {}

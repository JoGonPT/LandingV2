import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { ForwardedClientIpMiddleware } from "./common/forwarded-client-ip.middleware";
import { DriversModule } from "./drivers/drivers.module";
import { PartnerModule } from "./partner/partner.module";
import { PaymentsModule } from "./payments/payments.module";
import { PublicModule } from "./public/public.module";

@Module({
  imports: [PublicModule, PaymentsModule, PartnerModule, DriversModule],
  providers: [ForwardedClientIpMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ForwardedClientIpMiddleware).forRoutes("*");
  }
}

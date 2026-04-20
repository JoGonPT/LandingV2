import { Module } from "@nestjs/common";

import { PublicModule } from "../public/public.module";
import { PartnerPortalController } from "./partner.controller";
import { PartnerPortalService } from "./partner-portal.service";

@Module({
  imports: [PublicModule],
  controllers: [PartnerPortalController],
  providers: [PartnerPortalService],
})
export class PartnerModule {}

import { Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { PartnerPortalService } from "./partner-portal.service";

@Controller("partner")
export class PartnerPortalController {
  constructor(private readonly partnerPortal: PartnerPortalService) {}

  @Post("quote")
  async quote(@Req() req: Request, @Body() body: unknown) {
    return this.partnerPortal.quote(body, req.headers.cookie);
  }

  @Post("book-account")
  @HttpCode(HttpStatus.CREATED)
  async bookAccount(@Req() req: Request, @Body() body: unknown) {
    return this.partnerPortal.bookAccount(body, req.headers.cookie);
  }
}

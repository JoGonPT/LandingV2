import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { DriverAuthGuard, getDriverPortal } from "./driver-auth.guard";
import { DriversService } from "./drivers.service";

@Controller("drivers")
@UseGuards(DriverAuthGuard)
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  /** List CRM bookings scoped to this chauffeur (assignments + proxy rules in `src/lib/drivers/`). */
  @Get("bookings")
  async listBookings(@Req() req: Request, @Query("date") date?: string) {
    const ctx = getDriverPortal(req);
    return this.drivers.listBookings(ctx, date?.trim() || undefined);
  }

  @Get("bookings/:id")
  async getBooking(@Req() req: Request, @Param("id") id: string) {
    const ctx = getDriverPortal(req);
    return this.drivers.getBooking(ctx, id);
  }

  /** PWA-compatible: PATCH body `{ travel_status }`. */
  @Patch("bookings/:id/travel-status")
  @HttpCode(200)
  async patchTravelStatus(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    const ctx = getDriverPortal(req);
    const travel_status = this.parseTravelStatus(body);
    return this.drivers.updateTravelStatus(ctx, id, travel_status);
  }

  /** Alternate aggregate endpoint: POST `/api/drivers/status` with `{ booking_id, travel_status }`. */
  @Post("status")
  @HttpCode(200)
  async postStatus(@Req() req: Request, @Body() body: unknown) {
    const ctx = getDriverPortal(req);
    const { bookingId, travel_status } = this.parseStatusBody(body);
    return this.drivers.updateTravelStatus(ctx, bookingId, travel_status);
  }

  private parseTravelStatus(body: unknown): string {
    if (!body || typeof body !== "object") {
      throw new HttpException({ error: "Invalid body." }, HttpStatus.BAD_REQUEST);
    }
    const t = (body as Record<string, unknown>).travel_status;
    if (typeof t !== "string" || !t.trim()) {
      throw new HttpException({ error: "Invalid body." }, HttpStatus.BAD_REQUEST);
    }
    return t.trim();
  }

  private parseStatusBody(body: unknown): { bookingId: string; travel_status: string } {
    if (!body || typeof body !== "object") {
      throw new HttpException({ error: "Invalid body." }, HttpStatus.BAD_REQUEST);
    }
    const o = body as Record<string, unknown>;
    const bookingRaw = o.booking_id ?? o.bookingId;
    const travelRaw = o.travel_status;
    const bookingId = typeof bookingRaw === "string" ? bookingRaw.trim() : String(bookingRaw ?? "").trim();
    const travel_status = typeof travelRaw === "string" ? travelRaw.trim() : "";
    if (!bookingId || !/^\d+$/.test(bookingId) || !travel_status) {
      throw new HttpException({ error: "Invalid body." }, HttpStatus.BAD_REQUEST);
    }
    if (travel_status.length > 64) {
      throw new HttpException({ error: "Invalid body." }, HttpStatus.BAD_REQUEST);
    }
    return { bookingId, travel_status };
  }
}

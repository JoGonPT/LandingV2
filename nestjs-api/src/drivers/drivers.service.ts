import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";

import { createPublicBookingsStoreFromEnv } from "@/lib/booking/public-bookings-store";
import { insertSyncErrorFromEnv } from "@/lib/sync/sync-errors-store";
import { driverOwnsBookingRecord } from "@/lib/drivers/authorize-booking";
import { unwrapRecord } from "@/lib/drivers/booking-json";
import { fetchCrmBookingsForDriver } from "@/lib/drivers/crm-driver-bookings";
import { postDriverStatusWebhook } from "@/lib/drivers/status-webhook";
import { createTransferCrmClientFromEnv } from "@/lib/transfercrm/TransferCrmApiClient";
import { TransferCrmHttpError } from "@/lib/transfercrm/http-core";

import type { DriverPortalContext } from "./driver-auth.guard";

function driverNotConfiguredBody() {
  return {
    error:
      "Driver portal is not configured (set profiles.transfercrm_driver_id for this user or DRIVER_TRANSFERCRM_ID).",
    code: "DRIVER_NOT_CONFIGURED" as const,
  };
}

@Injectable()
export class DriversService {
  private readonly log = new Logger(DriversService.name);
  private readonly publicStore = createPublicBookingsStoreFromEnv();

  requireDriverId(ctx: DriverPortalContext): string {
    if (!ctx.transfercrmDriverId) {
      throw new HttpException(driverNotConfiguredBody(), HttpStatus.SERVICE_UNAVAILABLE);
    }
    return ctx.transfercrmDriverId;
  }

  async listBookings(ctx: DriverPortalContext, date?: string) {
    const driverId = this.requireDriverId(ctx);
    try {
      const items = await fetchCrmBookingsForDriver(driverId, { date, scope: "all" });
      return { data: items };
    } catch (e) {
      this.rethrowCrm(e);
    }
  }

  async getBooking(ctx: DriverPortalContext, id: string) {
    const driverId = this.requireDriverId(ctx);
    if (!id || !/^\d+$/.test(id)) {
      throw new HttpException({ error: "Invalid booking id." }, HttpStatus.BAD_REQUEST);
    }
    try {
      const client = createTransferCrmClientFromEnv();
      const raw = await client.getBooking(id);
      const data = unwrapRecord(raw);
      if (!data) {
        throw new HttpException({ error: "Not found." }, HttpStatus.NOT_FOUND);
      }
      if (!(await driverOwnsBookingRecord(data, driverId))) {
        throw new HttpException({ error: "Not found." }, HttpStatus.NOT_FOUND);
      }
      return { data };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      this.rethrowCrm(e);
    }
  }

  async updateTravelStatus(ctx: DriverPortalContext, bookingId: string, travelStatus: string) {
    const driverId = this.requireDriverId(ctx);
    if (!bookingId || !/^\d+$/.test(bookingId)) {
      throw new HttpException({ error: "Invalid booking id." }, HttpStatus.BAD_REQUEST);
    }
    const trimmed = travelStatus.trim();
    if (!trimmed || trimmed.length > 64) {
      throw new HttpException({ error: "Invalid body." }, HttpStatus.BAD_REQUEST);
    }

    try {
      const client = createTransferCrmClientFromEnv();
      const raw = await client.getBooking(bookingId);
      const data = unwrapRecord(raw);
      if (!data || !(await driverOwnsBookingRecord(data, driverId))) {
        throw new HttpException({ error: "Not found." }, HttpStatus.NOT_FOUND);
      }

      await client.patchBooking(bookingId, { travel_status: trimmed });

      if (this.publicStore) {
        try {
          await this.publicStore.patchByCrmBookingId(bookingId, { driver_travel_status: trimmed });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.log.warn(`public_bookings driver_travel_status sync failed booking=${bookingId} ${msg}`);
          await insertSyncErrorFromEnv({
            source: "driver_travel_status_public_bookings",
            context: {
              transfercrm_booking_id: bookingId,
              travel_status: trimmed,
              driver_user_id: ctx.userId,
              transfercrm_driver_id: ctx.transfercrmDriverId ?? null,
            },
            error_message: msg,
          });
        }
      }

      try {
        await postDriverStatusWebhook({
          booking_id: bookingId,
          travel_status: trimmed,
          source: "driver_app",
        });
      } catch (whError) {
        this.log.error(`Driver status webhook error: ${whError instanceof Error ? whError.message : String(whError)}`);
        return { ok: true as const, warning: "Updated in TransferCRM but central webhook failed." };
      }

      return { ok: true as const };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      this.rethrowCrm(e);
    }
  }

  private rethrowCrm(e: unknown): never {
    if (e instanceof TransferCrmHttpError) {
      throw new HttpException({ error: e.message, details: e.body }, e.status);
    }
    throw e;
  }
}

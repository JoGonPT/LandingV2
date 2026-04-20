import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import {
  applyQuoteToPayload,
  buildBookingPayloadFromBookingRequestDto,
  estimatedMinutesFromPayload,
  mapBookingToTransferCRM,
  parseBookingRequestDto,
  type PublicBookResponseData,
} from "@/lib/booking/book-public";
import {
  createPublicBookingsStoreFromEnv,
  PublicBookingInsertDuplicateError,
  type PublicBookingFetchedRow,
} from "@/lib/booking/public-bookings-store";
import { getTransferCrmApiClient, toPublicError } from "@/lib/transfercrm/client";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import type { BookingApiError } from "@/lib/transfercrm/types";

import { DispatchService } from "./dispatch.service";
import { PricingService } from "./pricing.service";

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function asError(message: string, requestId: string, code = "VALIDATION_ERROR"): BookingApiError {
  return { success: false, code, message, requestId };
}

function publicBookDataFromRow(row: PublicBookingFetchedRow): PublicBookResponseData {
  const rawPrice = row.price;
  const price =
    rawPrice === null || rawPrice === undefined
      ? null
      : typeof rawPrice === "number"
        ? rawPrice
        : Number(rawPrice);
  return {
    bookingId: row.id,
    status: row.crm_status?.trim() || row.status,
    price: price !== null && Number.isFinite(price) ? price : null,
    estimatedTime: row.estimated_time_min ?? null,
  };
}

@Injectable()
export class BookingService {
  private readonly log = new Logger(BookingService.name);
  private readonly store = createPublicBookingsStoreFromEnv();

  constructor(
    private readonly pricing: PricingService,
    private readonly dispatch: DispatchService,
  ) {}

  async createFromPublicDto(
    body: unknown,
    idempotencyKey?: string,
  ): Promise<{ success: true; requestId: string; data: PublicBookResponseData }> {
    const requestId = createRequestId();
    const key = idempotencyKey?.trim() || undefined;

    const parsed = parseBookingRequestDto(body);
    if (!parsed.ok) {
      throw new HttpException(asError(parsed.message, requestId), HttpStatus.BAD_REQUEST);
    }
    const dto = parsed.data;

    if (!this.store) {
      this.log.error(`public_bookings persistence missing (SUPABASE_URL / SERVICE_ROLE) requestId=${requestId}`);
      throw new HttpException(
        asError("Booking persistence is not configured.", requestId, "PERSISTENCE_CONFIG"),
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (key) {
      const existing = await this.store.getByIdempotencyKey(key);
      if (existing) {
        if (existing.status === "SYNCED") {
          return { success: true as const, requestId, data: publicBookDataFromRow(existing) };
        }
        if (existing.status === "PENDING") {
          throw new HttpException(
            asError(
              "A booking is already in progress for this checkout session. Please wait or retry shortly.",
              requestId,
              "IDEMPOTENCY_PENDING",
            ),
            HttpStatus.CONFLICT,
          );
        }
      }
    }

    const basePayload = buildBookingPayloadFromBookingRequestDto(dto);
    const validatedBase = validateBookingPayload(basePayload);
    if (!validatedBase.ok) {
      throw new HttpException(asError(validatedBase.message, requestId), HttpStatus.BAD_REQUEST);
    }

    let quote;
    try {
      quote = await this.pricing.quoteForBooking(validatedBase.data, dto.vehicleType);
    } catch (error) {
      const publicError = toPublicError(error);
      const details = publicError.details as Record<string, string[]> | undefined;
      const friendly =
        publicError.code === "CRM_VALIDATION_ERROR"
          ? firstTransferCrmValidationMessage(details) || publicError.message
          : publicError.message;
      this.log.error(`quote failed requestId=${requestId} code=${publicError.code}`);
      const status =
        publicError.code === "CRM_VALIDATION_ERROR" ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.BAD_GATEWAY;
      throw new HttpException(
        { ...asError(friendly, requestId, publicError.code), details: publicError.details },
        status,
      );
    }

    const pricedPayload = applyQuoteToPayload(validatedBase.data, quote);
    if (!pricedPayload.quotedPrice) {
      throw new HttpException(
        asError("Could not determine price from TransferCRM.", requestId, "QUOTE_INCOMPLETE"),
        HttpStatus.BAD_GATEWAY,
      );
    }

    const validatedFinal = validateBookingPayload(pricedPayload);
    if (!validatedFinal.ok) {
      throw new HttpException(asError(validatedFinal.message, requestId), HttpStatus.BAD_GATEWAY);
    }

    const payload = validatedFinal.data;
    const qp = payload.quotedPrice;
    if (!qp) {
      throw new HttpException(
        asError("Quoted price missing after CRM quote.", requestId, "QUOTE_INCOMPLETE"),
        HttpStatus.BAD_GATEWAY,
      );
    }
    const price = qp.amount;
    const currency = qp.currency;
    const distanceKm = payload.details.distanceKm ?? null;
    const estimatedTime = estimatedMinutesFromPayload(payload);

    const id = randomUUID();
    const split = payload.route;

    try {
      await this.store.insert({
        id,
        status: "PENDING",
        pickup: payload.route.pickup,
        dropoff: payload.route.dropoff,
        trip_date: split.date,
        trip_time: split.time,
        datetime_raw: dto.datetime,
        passengers: payload.details.passengers,
        vehicle_type: dto.vehicleType,
        customer: {
          name: payload.contact.fullName,
          email: payload.contact.email,
          phone: payload.contact.phone,
        },
        price,
        currency,
        distance_km: distanceKm,
        estimated_time_min: estimatedTime,
        ...(key ? { idempotency_key: key } : {}),
      });
    } catch (e) {
      if (e instanceof PublicBookingInsertDuplicateError && key) {
        const dup = await this.store.getByIdempotencyKey(key);
        if (dup?.status === "SYNCED") {
          return { success: true as const, requestId, data: publicBookDataFromRow(dup) };
        }
        if (dup?.status === "PENDING") {
          throw new HttpException(
            asError(
              "A booking is already in progress for this checkout session. Please wait or retry shortly.",
              requestId,
              "IDEMPOTENCY_PENDING",
            ),
            HttpStatus.CONFLICT,
          );
        }
      }
      throw e;
    }

    const crmBody = mapBookingToTransferCRM({ payload });
    const client = getTransferCrmApiClient();

    let data: PublicBookResponseData = {
      bookingId: id,
      status: "FAILED_SYNC",
      price,
      estimatedTime,
    };

    try {
      const res = await client.postBook(crmBody);
      const crmBookingId =
        res.booking_id !== undefined && res.booking_id !== null ? String(res.booking_id) : "";
      const orderNumber = res.order_number?.trim() ?? "";
      const externalCrmId = crmBookingId || orderNumber;
      if (!externalCrmId) {
        throw new Error("TransferCRM booking response missing id.");
      }

      const crmStatus = res.status?.trim();
      await this.store.patch(id, {
        status: "SYNCED",
        crm_booking_id: crmBookingId || null,
        crm_order_number: orderNumber || null,
        crm_status: crmStatus ?? null,
        sync_error: null,
      });

      await this.dispatch.assignCandidates(externalCrmId);

      data = {
        bookingId: id,
        status: crmStatus || "SYNCED",
        price,
        estimatedTime,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log.error(`CRM postBook failed bookingId=${id} err=${msg}`);
      await this.store.patch(id, {
        status: "FAILED_SYNC",
        sync_error: msg.slice(0, 2000),
        ...(key ? { idempotency_key: null } : {}),
      });
    }

    return { success: true as const, requestId, data };
  }
}

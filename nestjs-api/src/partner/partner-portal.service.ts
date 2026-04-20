import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { estimatedMinutesFromPayload } from "@/lib/booking/book-public";
import { createPublicBookingsStoreFromEnv } from "@/lib/booking/public-bookings-store";
import { formatMoneyAmount } from "@/lib/checkout/format-money";
import { attachPartnerToPayload } from "@/lib/partner/attach-context";
import {
  computePartnerCommissionBreakdown,
  type PartnerCommissionPricingPayload,
} from "@/lib/partner/commission-pricing";
import { getPartnerCreditStore } from "@/lib/partner/credit/factory";
import { SupabasePartnerCreditStore } from "@/lib/partner/credit/supabase-store";
import { PartnerSessionAuthError, assertPartnerSessionMatchesSlug } from "@/lib/partner/session-cookie-auth";
import { ensurePartnerCreditRow } from "@/lib/partner/sync-credit";
import { mergeQuoteDistanceIntoPayload } from "@/lib/transfercrm/booking-mappers";
import { submitBooking, toPublicError } from "@/lib/transfercrm/client";
import type { BookingApiSuccess } from "@/lib/transfercrm/types";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";

import { DispatchService } from "../public/dispatch.service";
import { PricingService } from "../public/pricing.service";

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type ParsedPartnerBody = {
  slug: string;
  payload: unknown;
  vehicleType?: string;
  internalReference?: string;
  vipRequests?: string;
};

function parsePartnerBody(body: unknown, requireVehicleType: boolean): ParsedPartnerBody | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.slug !== "string" || !b.slug.trim()) return null;
  if (b.payload === undefined) return null;
  const vehicleType = typeof b.vehicleType === "string" ? b.vehicleType : undefined;
  if (requireVehicleType && (!vehicleType || !vehicleType.trim())) return null;
  return {
    slug: b.slug.trim(),
    payload: b.payload,
    vehicleType: vehicleType?.trim(),
    internalReference: typeof b.internalReference === "string" ? b.internalReference : undefined,
    vipRequests: typeof b.vipRequests === "string" ? b.vipRequests : undefined,
  };
}

@Injectable()
export class PartnerPortalService {
  private readonly log = new Logger(PartnerPortalService.name);
  private readonly publicStore = createPublicBookingsStoreFromEnv();

  constructor(
    private readonly pricing: PricingService,
    private readonly dispatch: DispatchService,
  ) {}

  async quote(body: unknown, cookieHeader: string | undefined) {
    const requestId = createRequestId();
    const parsed = parsePartnerBody(body, false);
    if (!parsed) {
      throw new HttpException({ success: false, message: "Invalid body.", requestId }, HttpStatus.BAD_REQUEST);
    }

    try {
      const { displayName } = assertPartnerSessionMatchesSlug(cookieHeader, parsed.slug);
      const validated = validateBookingPayload(parsed.payload);
      if (!validated.ok) {
        throw new HttpException({ success: false, message: validated.message, requestId }, HttpStatus.BAD_REQUEST);
      }

      const merged = attachPartnerToPayload(validated.data, displayName, parsed.slug, {
        internalReference: parsed.internalReference,
        vipRequests: parsed.vipRequests,
      });

      try {
        const { data, partnerPricing } = await this.pricing.quoteForPartnerPortal(
          merged,
          parsed.vehicleType,
          parsed.slug,
        );
        return { success: true as const, data, partnerPricing, requestId };
      } catch (error) {
        const publicError = toPublicError(error);
        const details = publicError.details as Record<string, string[]> | undefined;
        const friendly =
          publicError.code === "CRM_VALIDATION_ERROR"
            ? firstTransferCrmValidationMessage(details) || publicError.message
            : publicError.message;
        this.log.error(`partner quote CRM error requestId=${requestId} code=${publicError.code}`);
        const status =
          publicError.code === "CRM_VALIDATION_ERROR" ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.BAD_GATEWAY;
        throw new HttpException(
          { success: false, message: friendly, requestId, details: publicError.details },
          status,
        );
      }
    } catch (e) {
      if (e instanceof HttpException) throw e;
      if (e instanceof PartnerSessionAuthError) {
        throw new HttpException({ success: false, message: "Unauthorized.", requestId }, HttpStatus.UNAUTHORIZED);
      }
      if (e instanceof Error && e.message.includes("PARTNER_SESSION_SECRET")) {
        throw new HttpException(
          { success: false, message: "Partner session is not configured on the server.", requestId },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw e;
    }
  }

  async bookAccount(body: unknown, cookieHeader: string | undefined) {
    const requestId = createRequestId();
    const parsed = parsePartnerBody(body, true);
    if (!parsed || !parsed.vehicleType) {
      throw new HttpException({ success: false, message: "Invalid body.", requestId }, HttpStatus.BAD_REQUEST);
    }

    let displayName: string;
    try {
      ({ displayName } = assertPartnerSessionMatchesSlug(cookieHeader, parsed.slug));
    } catch (e) {
      if (e instanceof PartnerSessionAuthError) {
        throw new HttpException({ success: false, message: "Unauthorized.", requestId }, HttpStatus.UNAUTHORIZED);
      }
      if (e instanceof Error && e.message.includes("PARTNER_SESSION_SECRET")) {
        throw new HttpException(
          { success: false, message: "Partner session is not configured on the server.", requestId },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw e;
    }
    const validated = validateBookingPayload(parsed.payload);
    if (!validated.ok) {
      throw new HttpException({ success: false, message: validated.message, requestId }, HttpStatus.BAD_REQUEST);
    }

    const merged = attachPartnerToPayload(validated.data, displayName, parsed.slug, {
      internalReference: parsed.internalReference,
      vipRequests: parsed.vipRequests,
      paymentMethod: "account",
    });

    const vehicleType = parsed.vehicleType;
    let quote;
    try {
      quote = await this.pricing.quoteForBooking(merged, vehicleType);
    } catch (error) {
      const publicError = toPublicError(error);
      const details = publicError.details as Record<string, string[]> | undefined;
      const friendly =
        publicError.code === "CRM_VALIDATION_ERROR"
          ? firstTransferCrmValidationMessage(details) || publicError.message
          : publicError.message;
      this.log.error(`partner book-account quote failed requestId=${requestId} code=${publicError.code}`);
      const status =
        publicError.code === "CRM_VALIDATION_ERROR" ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.BAD_GATEWAY;
      throw new HttpException({ success: false, message: friendly, requestId, details: publicError.details }, status);
    }

    const price = quote.price;
    const currency = quote.currency?.trim();
    if (price === undefined || price === null || !currency) {
      throw new HttpException(
        { success: false, message: "Could not determine price from TransferCRM.", requestId },
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (currency.toUpperCase() !== "EUR") {
      throw new HttpException(
        {
          success: false,
          code: "ACCOUNT_EUR_ONLY" as const,
          message: "Pay on account is only available when the quoted currency is EUR.",
          requestId,
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      throw new HttpException({ success: false, message: "Invalid quote amount.", requestId }, HttpStatus.BAD_GATEWAY);
    }

    const creditRow = await ensurePartnerCreditRow(parsed.slug);
    if (!creditRow) {
      throw new HttpException({ success: false, message: "Unknown partner.", requestId }, HttpStatus.UNAUTHORIZED);
    }

    const store = getPartnerCreditStore();
    if (!(store instanceof SupabasePartnerCreditStore)) {
      throw new HttpException(
        {
          success: false,
          code: "PERSISTENCE_CONFIG" as const,
          message: "Pay on account requires Supabase (service role) for atomic credit.",
          requestId,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!this.publicStore) {
      throw new HttpException(
        {
          success: false,
          code: "PERSISTENCE_CONFIG" as const,
          message: "Booking persistence is not configured.",
          requestId,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const reserved = await store.tryConsumeCreditAtomic(parsed.slug, priceNum);
    if (!reserved.ok) {
      const snap = await store.getAccount(parsed.slug);
      const limit = snap?.creditLimit ?? 0;
      const usage = snap?.currentUsage ?? 0;
      const available = Math.max(0, limit - usage);
      throw new HttpException(
        {
          success: false,
          code: "INSUFFICIENT_CREDIT" as const,
          message: "Insufficient account credit for this booking. Pay with card instead.",
          requestId,
          credit: { limit, currentUsage: usage, available },
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const mergedWithDistance = mergeQuoteDistanceIntoPayload(merged, quote);
    const bookPayload = {
      ...mergedWithDistance,
      vehicleType,
      quotedPrice: { amount: priceNum, currency: currency.toUpperCase() },
    };

    const id = randomUUID();
    const split = validated.data.route;
    const datetimeRaw = `${split.date}T${split.time}:00`;
    const distanceKm = mergedWithDistance.details.distanceKm ?? null;
    const estimatedTime = estimatedMinutesFromPayload(mergedWithDistance);

    await this.publicStore.insert({
      id,
      status: "PENDING",
      pickup: split.pickup,
      dropoff: split.dropoff,
      trip_date: split.date,
      trip_time: split.time,
      datetime_raw: datetimeRaw,
      passengers: validated.data.details.passengers,
      vehicle_type: vehicleType,
      customer: {
        name: validated.data.contact.fullName,
        email: validated.data.contact.email,
        phone: validated.data.contact.phone,
      },
      price: priceNum,
      currency: currency.toUpperCase(),
      distance_km: distanceKm,
      estimated_time_min: estimatedTime,
      payment_method: "account",
      partner_slug: parsed.slug,
    });

    let booking;
    try {
      booking = await submitBooking(bookPayload);
    } catch (e) {
      try {
        await store.releaseCreditAtomic(parsed.slug, priceNum);
      } catch (relErr) {
        this.log.error(
          `release_credit_failed slug=${parsed.slug} requestId=${requestId} ${relErr instanceof Error ? relErr.message : String(relErr)}`,
        );
      }
      await this.publicStore.patch(id, {
        status: "FAILED_SYNC",
        sync_error: (e instanceof Error ? e.message : String(e)).slice(0, 2000),
      });
      const pub = toPublicError(e);
      const details = pub.details as Record<string, string[]> | undefined;
      const friendly =
        pub.code === "CRM_VALIDATION_ERROR" ? firstTransferCrmValidationMessage(details) || pub.message : pub.message;
      this.log.error(`partner book-account CRM error requestId=${requestId} code=${pub.code}`);
      const status = pub.code === "CRM_VALIDATION_ERROR" ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.BAD_GATEWAY;
      throw new HttpException({ success: false, message: friendly, requestId, details: pub.details }, status);
    }

    const crmBookingId =
      booking.bookingId !== undefined && booking.bookingId !== null ? String(booking.bookingId) : "";
    const orderNumber = booking.orderNumber?.trim() ?? "";
    const crmStatus = booking.status?.trim();

    await this.publicStore.patch(id, {
      status: "SYNCED",
      crm_booking_id: crmBookingId || null,
      crm_order_number: orderNumber || null,
      crm_status: crmStatus ?? null,
      sync_error: null,
    });

    const externalCrmId = crmBookingId || orderNumber;
    if (externalCrmId) {
      await this.dispatch.assignCandidates(externalCrmId);
    }

    const pricing = computePartnerCommissionBreakdown(priceNum, creditRow.commissionRate, creditRow.pricingModel);
    await store.incrementCommissionsEarned(parsed.slug, pricing.partnerEarnings);

    const curU = (booking.currency ?? currency).toUpperCase();
    const totalRetailFormatted =
      Number.isFinite(pricing.retailPrice) && curU
        ? formatMoneyAmount(pricing.retailPrice, curU, validated.data.locale)
        : "";
    const partnerEarningsFormatted =
      Number.isFinite(pricing.partnerEarnings) && curU
        ? formatMoneyAmount(pricing.partnerEarnings, curU, validated.data.locale)
        : "";

    const response: BookingApiSuccess & {
      trip: { pickup: string; dropoff: string; date: string; time: string };
      totalFormatted: string;
      totalRetailFormatted: string;
      partnerEarningsFormatted: string;
      partnerPricing: PartnerCommissionPricingPayload & { currency: string };
      billing: "monthly_account";
    } = {
      success: true,
      orderId: booking.bookingId,
      orderReference: booking.orderNumber,
      trackingUrl: booking.trackingUrl ?? undefined,
      status: booking.status,
      trip: {
        pickup: validated.data.route.pickup,
        dropoff: validated.data.route.dropoff,
        date: validated.data.route.date,
        time: validated.data.route.time,
      },
      totalFormatted: totalRetailFormatted,
      totalRetailFormatted,
      partnerEarningsFormatted,
      partnerPricing: { ...pricing, currency: curU },
      billing: "monthly_account",
    };

    return response;
  }
}

import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { estimateDriveMinutesFromKm } from "@/lib/booking/drive-time-estimate";
import {
  buildBookingPayloadFromBookingRequestDto,
  parseBookingRequestDto,
} from "@/lib/booking/book-public";
import { createStripeCheckoutSessionStoreFromEnv } from "@/lib/booking/stripe-checkout-session-store";
import { createB2cTransferPaymentIntent } from "@/lib/checkout/stripe-payment-intent-b2c";
import { createStripeClient } from "@/lib/checkout/stripe-client";
import { formatMoneyAmount } from "@/lib/checkout/format-money";
import {
  assertPaymentIntentAmountMatchesMetadata,
  finalizePaidBookingCore,
} from "@/lib/checkout/finalize-paid-booking-core";
import {
  createPublicBookingsStoreFromEnv,
  PublicBookingInsertDuplicateError,
  type PublicBookingInsertRow,
} from "@/lib/booking/public-bookings-store";
import { getTransferCrmApiClient } from "@/lib/transfercrm/client";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import type { BookingApiError } from "@/lib/transfercrm/types";
import type { CheckoutCompleteSuccess } from "@/lib/transfercrm/types";
import type Stripe from "stripe";

import { DispatchService } from "../public/dispatch.service";
import { PricingService } from "../public/pricing.service";

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function asError(message: string, requestId: string, code = "VALIDATION_ERROR"): BookingApiError {
  return { success: false, code, message, requestId };
}

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);

  constructor(
    private readonly pricing: PricingService,
    private readonly dispatch: DispatchService,
  ) {}

  async createIntent(body: unknown, idempotencyKey?: string): Promise<{
    success: true;
    requestId: string;
    clientSecret: string;
    paymentIntentId: string;
    currency: string;
    amountMinor: number;
  }> {
    const requestId = createRequestId();
    const parsed = parseBookingRequestDto(body);
    if (!parsed.ok) {
      throw new HttpException(asError(parsed.message, requestId), HttpStatus.BAD_REQUEST);
    }
    const dto = parsed.data;

    const sessionStore = createStripeCheckoutSessionStoreFromEnv();
    if (!sessionStore) {
      throw new HttpException(
        asError("Checkout persistence is not configured (Supabase).", requestId, "PERSISTENCE_CONFIG"),
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const basePayload = buildBookingPayloadFromBookingRequestDto(dto);
    const validated = validateBookingPayload(basePayload);
    if (!validated.ok) {
      throw new HttpException(asError(validated.message, requestId), HttpStatus.BAD_REQUEST);
    }

    const quote = await this.pricing.quoteForBooking(validated.data, dto.vehicleType);
    const sessionId = randomUUID();
    await sessionStore.insert(sessionId, dto);

    const stripe = createStripeClient();
    const idem = idempotencyKey?.trim();
    const pi = await createB2cTransferPaymentIntent(
      stripe,
      quote,
      validated.data,
      dto.vehicleType,
      {
        way2go_session_id: sessionId,
        ...(idem ? { way2go_idempotency_key: idem.slice(0, 200) } : {}),
      },
      idem ? { idempotencyKey: idem } : undefined,
    );
    await sessionStore.setPaymentIntent(sessionId, pi.paymentIntentId);

    this.log.log(`create-intent session=${sessionId} pi=${pi.paymentIntentId}`);

    return {
      success: true as const,
      requestId,
      clientSecret: pi.clientSecret,
      paymentIntentId: pi.paymentIntentId,
      currency: pi.currency,
      amountMinor: pi.amountMinor,
    };
  }

  async getCheckoutStatus(paymentIntentId: string): Promise<
    | { state: "pending"; requestId: string }
    | { state: "failed"; requestId: string; message: string }
    | { state: "ready"; requestId: string; booking: CheckoutCompleteSuccess }
  > {
    const requestId = createRequestId();
    const store = createStripeCheckoutSessionStoreFromEnv();
    if (!store) {
      throw new HttpException(
        asError("Checkout persistence is not configured.", requestId, "PERSISTENCE_CONFIG"),
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const row = await store.getByPaymentIntentId(paymentIntentId.trim());
    if (!row) {
      return { state: "pending", requestId };
    }
    if (row.status === "failed") {
      return { state: "failed", requestId, message: row.error_message ?? "Payment confirmation failed." };
    }
    if (row.status === "completed" && row.result) {
      return { state: "ready", requestId, booking: row.result };
    }
    return { state: "pending", requestId };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined): Promise<{ received: boolean }> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) {
      this.log.error("STRIPE_WEBHOOK_SECRET not set");
      throw new HttpException("Webhook not configured.", HttpStatus.SERVICE_UNAVAILABLE);
    }
    if (!signature) {
      throw new HttpException("Missing stripe-signature.", HttpStatus.BAD_REQUEST);
    }

    const stripe = createStripeClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (e) {
      this.log.warn(`webhook signature invalid: ${e instanceof Error ? e.message : String(e)}`);
      throw new HttpException("Invalid signature.", HttpStatus.BAD_REQUEST);
    }

    if (event.type !== "payment_intent.succeeded") {
      return { received: true };
    }

    const intent = event.data.object as Stripe.PaymentIntent;
    const sessionId = intent.metadata?.way2go_session_id?.trim();
    if (!sessionId) {
      return { received: true };
    }

    const sessionStore = createStripeCheckoutSessionStoreFromEnv();
    const publicStore = createPublicBookingsStoreFromEnv();
    if (!sessionStore || !publicStore) {
      this.log.error("Supabase not configured; cannot finalize webhook");
      throw new HttpException("Persistence not configured.", HttpStatus.SERVICE_UNAVAILABLE);
    }

    const row = await sessionStore.getById(sessionId);
    if (!row) {
      this.log.warn(`session not found ${sessionId}`);
      return { received: true };
    }
    if (row.status === "completed") {
      return { received: true };
    }

    const dto = row.dto;
    const payload = buildBookingPayloadFromBookingRequestDto(dto);
    const validated = validateBookingPayload(payload);
    if (!validated.ok) {
      await sessionStore.markFailed(sessionId, validated.message);
      return { received: true };
    }

    const crm = getTransferCrmApiClient();

    try {
      assertPaymentIntentAmountMatchesMetadata(intent);
      const { booking } = await finalizePaidBookingCore(stripe, crm, {
        payload: validated.data,
        vehicleType: dto.vehicleType.trim(),
        paymentIntentId: intent.id,
      });

      let publicBookingDbId: string = randomUUID();
      const split = validated.data.route;
      const priceNum = booking.price !== undefined ? Number(booking.price) : NaN;
      const cur = (booking.currency ?? "").trim().toUpperCase() || "EUR";
      const totalPaidFormatted =
        Number.isFinite(priceNum) && cur ? formatMoneyAmount(priceNum, cur, validated.data.locale) : "";

      const success: CheckoutCompleteSuccess = {
        success: true,
        orderId: booking.bookingId,
        orderReference: booking.orderNumber,
        trackingUrl: booking.trackingUrl,
        status: booking.status,
        trip: {
          pickup: validated.data.route.pickup,
          dropoff: validated.data.route.dropoff,
          date: validated.data.route.date,
          time: validated.data.route.time,
        },
        totalPaidFormatted,
      };

      let dist: number | null = validated.data.details.distanceKm ?? null;
      if (dist == null) {
        const dr = intent.metadata?.way2go_distance_km?.trim();
        if (dr) {
          const d = Number(dr);
          if (Number.isFinite(d)) dist = d;
        }
      }
      const insertRow: PublicBookingInsertRow = {
        id: publicBookingDbId,
        status: "SYNCED",
        pickup: validated.data.route.pickup,
        dropoff: validated.data.route.dropoff,
        trip_date: split.date,
        trip_time: split.time,
        datetime_raw: dto.datetime,
        passengers: validated.data.details.passengers,
        vehicle_type: dto.vehicleType,
        customer: {
          name: validated.data.contact.fullName,
          email: validated.data.contact.email,
          phone: validated.data.contact.phone,
        },
        price: Number.isFinite(priceNum) ? priceNum : null,
        currency: cur || null,
        distance_km: dist,
        estimated_time_min: dist != null ? estimateDriveMinutesFromKm(dist) : null,
        stripe_payment_intent_id: intent.id,
      };
      try {
        await publicStore.insert(insertRow);
      } catch (insertErr) {
        if (!(insertErr instanceof PublicBookingInsertDuplicateError)) {
          throw insertErr;
        }
        this.log.log(`public_bookings idempotent (unique) pi=${intent.id}`);
        const existing = await publicStore.getByStripePaymentIntentId(intent.id);
        if (!existing) {
          throw insertErr;
        }
        publicBookingDbId = existing.id;
      }

      const crmExternal =
        booking.bookingId?.trim() || (booking.orderNumber != null ? String(booking.orderNumber) : "");
      if (crmExternal) {
        await this.dispatch.assignCandidates(crmExternal);
      }

      await sessionStore.markCompleted(sessionId, { result: success, public_booking_id: publicBookingDbId });
      this.log.log(`webhook completed session=${sessionId} crm=${booking.bookingId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.error(`webhook finalize failed session=${sessionId} ${msg}`);
      await sessionStore.markFailed(sessionId, msg.slice(0, 4000));
    }

    return { received: true };
  }
}

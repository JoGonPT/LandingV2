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
  createDriverAssignmentUpsertFromEnv,
  createPublicBookingsStoreFromEnv,
  PublicBookingInsertDuplicateError,
  type PublicBookingInsertRow,
} from "@/lib/booking/public-bookings-store";
import { getTransferCrmApiClient, postQuoteForBooking } from "@/lib/transfercrm/client";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import type { BookingApiError } from "@/lib/transfercrm/types";
import type { CheckoutCompleteSuccess } from "@/lib/transfercrm/types";
import type Stripe from "stripe";

const LOG_PREFIX = "[payments-app]";

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function asError(message: string, requestId: string, code = "VALIDATION_ERROR"): BookingApiError {
  return { success: false, code, message, requestId };
}

export class PaymentsAppHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: BookingApiError,
  ) {
    super(body.message);
    this.name = "PaymentsAppHttpError";
  }
}

function throwHttp(status: number, body: BookingApiError): never {
  throw new PaymentsAppHttpError(status, body);
}

async function assignDispatchCandidates(crmBookingId: string): Promise<void> {
  if (!crmBookingId.trim()) return;
  const raw = process.env.PUBLIC_BOOK_DISPATCH_DRIVER_KEYS?.trim();
  if (!raw) return;
  const keys = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!keys.length) return;

  const upsert = createDriverAssignmentUpsertFromEnv();
  if (!upsert) {
    console.warn(LOG_PREFIX, "Supabase not configured; skip driver_booking_assignments");
    return;
  }

  const driverKey = keys[0];
  try {
    await upsert(crmBookingId.trim(), driverKey);
    console.info(LOG_PREFIX, `dispatch assigned driver_key=${driverKey} booking=${crmBookingId}`);
  } catch (e) {
    console.warn(
      LOG_PREFIX,
      `dispatch failed booking=${crmBookingId} err=${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

export async function paymentsCreateIntent(
  body: unknown,
  idempotencyKey?: string,
): Promise<{
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
    throwHttp(400, asError(parsed.message, requestId));
  }
  const dto = parsed.data;

  const sessionStore = createStripeCheckoutSessionStoreFromEnv();
  if (!sessionStore) {
    throwHttp(
      503,
      asError("Checkout persistence is not configured (Supabase).", requestId, "PERSISTENCE_CONFIG"),
    );
  }

  const basePayload = buildBookingPayloadFromBookingRequestDto(dto);
  const validated = validateBookingPayload(basePayload);
  if (!validated.ok) {
    throwHttp(400, asError(validated.message, requestId));
  }

  const quote = await postQuoteForBooking(validated.data, dto.vehicleType);
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

  console.info(LOG_PREFIX, `create-intent session=${sessionId} pi=${pi.paymentIntentId}`);

  return {
    success: true as const,
    requestId,
    clientSecret: pi.clientSecret,
    paymentIntentId: pi.paymentIntentId,
    currency: pi.currency,
    amountMinor: pi.amountMinor,
  };
}

export async function paymentsGetCheckoutStatus(paymentIntentId: string): Promise<
  | { state: "pending"; requestId: string }
  | { state: "failed"; requestId: string; message: string }
  | { state: "ready"; requestId: string; booking: CheckoutCompleteSuccess }
> {
  const requestId = createRequestId();
  const store = createStripeCheckoutSessionStoreFromEnv();
  if (!store) {
    throwHttp(
      503,
      asError("Checkout persistence is not configured.", requestId, "PERSISTENCE_CONFIG"),
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

export async function paymentsHandleStripeWebhook(
  rawBody: string | Buffer,
  signature: string | undefined,
): Promise<{ received: boolean }> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error(LOG_PREFIX, "STRIPE_WEBHOOK_SECRET not set");
    throwHttp(503, asError("Webhook not configured.", createRequestId(), "WEBHOOK_CONFIG"));
  }
  if (!signature) {
    throwHttp(400, asError("Missing stripe-signature.", createRequestId(), "BAD_REQUEST"));
  }

  const stripe = createStripeClient();
  const raw = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (e) {
    console.warn(LOG_PREFIX, `webhook signature invalid: ${e instanceof Error ? e.message : String(e)}`);
    throwHttp(400, asError("Invalid signature.", createRequestId(), "BAD_REQUEST"));
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
    console.error(LOG_PREFIX, "Supabase not configured; cannot finalize webhook");
    throwHttp(
      503,
      asError("Persistence not configured.", createRequestId(), "PERSISTENCE_CONFIG"),
    );
  }

  const row = await sessionStore.getById(sessionId);
  if (!row) {
    console.warn(LOG_PREFIX, `session not found ${sessionId}`);
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
      console.info(LOG_PREFIX, `public_bookings idempotent (unique) pi=${intent.id}`);
      const existing = await publicStore.getByStripePaymentIntentId(intent.id);
      if (!existing) {
        throw insertErr;
      }
      publicBookingDbId = existing.id;
    }

    const crmExternal =
      booking.bookingId?.trim() || (booking.orderNumber != null ? String(booking.orderNumber) : "");
    if (crmExternal) {
      await assignDispatchCandidates(crmExternal);
    }

    await sessionStore.markCompleted(sessionId, { result: success, public_booking_id: publicBookingDbId });
    console.info(LOG_PREFIX, `webhook completed session=${sessionId} crm=${booking.bookingId}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(LOG_PREFIX, `webhook finalize failed session=${sessionId} ${msg}`);
    await sessionStore.markFailed(sessionId, msg.slice(0, 4000));
  }

  return { received: true };
}

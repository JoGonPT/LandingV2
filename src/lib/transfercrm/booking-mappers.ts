import { createHash } from "node:crypto";
import type { BookingPayload } from "@/lib/transfercrm/types";
import type { AvailabilityQuery, BookingRequest, QuoteRequest } from "@/lib/transfercrm/openapi.types";

export function toIsoDateTimeUtc(date: string, time: string): string {
  const local = new Date(`${date}T${time}:00`);
  return local.toISOString();
}

/** Deterministic idempotency key when Way2Go has no internal order id yet. */
export function createExternalReference(payload: BookingPayload): string {
  const raw = [
    payload.contact.email.toLowerCase(),
    payload.contact.phone,
    payload.route.pickup.toLowerCase(),
    payload.route.dropoff.toLowerCase(),
    payload.route.date,
    payload.route.time,
  ].join("|");

  return `w2g_${createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
}

/** Map Way2Go internal / draft order id → API external_reference (stable, URL-safe). */
export function externalReferenceForWay2GoOrder(internalOrderId: string): string {
  const safe = internalOrderId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (safe.length > 0) return `w2g_ord_${safe}`;
  return `w2g_ord_${createHash("sha256").update(internalOrderId).digest("hex").slice(0, 20)}`;
}

export function resolveExternalReference(payload: BookingPayload): string {
  const internal = payload.internalOrderId?.trim();
  if (internal) return externalReferenceForWay2GoOrder(internal);
  return createExternalReference(payload);
}

export function mapBookingPayloadToAvailabilityQuery(payload: BookingPayload): AvailabilityQuery {
  const q: AvailabilityQuery = {
    pickup_location: payload.route.pickup,
    dropoff_location: payload.route.dropoff,
    pickup_date: toIsoDateTimeUtc(payload.route.date, payload.route.time),
    passengers: payload.details.passengers,
  };
  if (payload.details.distanceKm !== undefined) {
    q.distance_km = payload.details.distanceKm;
  }
  return q;
}

export function mapBookingPayloadToQuoteRequest(payload: BookingPayload, vehicleType?: string): QuoteRequest {
  const base = mapBookingPayloadToAvailabilityQuery(payload);
  const distance = payload.details.distanceKm;
  if (distance === undefined || distance === null || Number.isNaN(distance)) {
    throw new Error("distanceKm is required for TransferCRM quotes.");
  }
  const vt = vehicleType ?? payload.vehicleType;
  return {
    pickup_location: base.pickup_location,
    dropoff_location: base.dropoff_location,
    pickup_date: base.pickup_date,
    distance_km: distance,
    ...(vt ? { vehicle_type: vt } : {}),
    ...(base.passengers !== undefined ? { passengers: base.passengers } : {}),
  };
}

function buildNotesFromPayload(payload: BookingPayload): string | undefined {
  const parts: string[] = [];
  if (payload.details.notes?.trim()) {
    parts.push(payload.details.notes.trim());
  }
  if (payload.route.childSeat) {
    parts.push("Child seat requested.");
  }
  if (payload.details.luggage > 0) {
    parts.push(`Luggage pieces: ${payload.details.luggage}`);
  }
  parts.push(`Locale: ${payload.locale}`);
  const merged = parts.join(" | ");
  return merged ? merged.slice(0, 2000) : undefined;
}

/** Paid checkout: Stripe PaymentIntent id is the CRM idempotency key. */
export interface PaidBookingOverrides {
  externalReference: string;
  price: number;
  currency: string;
  vehicleType?: string;
}

export function mapBookingPayloadToBookingRequest(
  payload: BookingPayload,
  paid?: PaidBookingOverrides,
): BookingRequest {
  const pickup_date = toIsoDateTimeUtc(payload.route.date, payload.route.time);
  const request: BookingRequest = {
    pickup_location: payload.route.pickup.slice(0, 500),
    dropoff_location: payload.route.dropoff.slice(0, 500),
    pickup_date,
    passenger_name: payload.contact.fullName.slice(0, 200),
    external_reference: paid?.externalReference ?? resolveExternalReference(payload),
  };

  const phone = payload.contact.phone.trim();
  if (phone) {
    request.passenger_phone = phone;
  }

  const email = payload.contact.email.trim();
  if (email) {
    request.passenger_email = email;
  }

  if (payload.route.flightNumber?.trim()) {
    request.flight_number = payload.route.flightNumber.trim();
  }

  if (payload.details.passengers >= 1) {
    request.passengers_count = payload.details.passengers;
  }

  if (payload.details.distanceKm !== undefined && Number.isFinite(payload.details.distanceKm)) {
    request.distance_km = payload.details.distanceKm;
  }

  const vehicle = paid?.vehicleType?.trim() || payload.vehicleType?.trim();
  if (vehicle) {
    request.vehicle_type = vehicle;
  }

  if (paid) {
    request.price = paid.price;
    request.currency = paid.currency;
  } else if (payload.quotedPrice) {
    request.price = payload.quotedPrice.amount;
    request.currency = payload.quotedPrice.currency;
  }

  const notes = buildNotesFromPayload(payload);
  if (notes) {
    request.notes = notes;
  }

  return request;
}

/** @deprecated Use mapBookingPayloadToBookingRequest — alias for OpenAPI BookingRequest body */
export const mapBookingToB2bBookBody = mapBookingPayloadToBookingRequest;

/** @deprecated Use mapBookingPayloadToAvailabilityQuery */
export function mapBookingToAvailabilityParams(payload: BookingPayload): URLSearchParams {
  const q = mapBookingPayloadToAvailabilityQuery(payload);
  const params = new URLSearchParams();
  params.set("pickup_location", q.pickup_location);
  params.set("dropoff_location", q.dropoff_location);
  params.set("pickup_date", q.pickup_date);
  if (q.passengers !== undefined) {
    params.set("passengers", String(q.passengers));
  }
  if (q.distance_km !== undefined) {
    params.set("distance_km", String(q.distance_km));
  }
  return params;
}

import { estimateDriveMinutesFromKm } from "@/lib/booking/drive-time-estimate";
import { splitQuoteDatetime } from "@/lib/booking/quote-public";
import {
  mapBookingPayloadToBookingRequest,
  mergeQuoteDistanceIntoPayload,
} from "@/lib/transfercrm/booking-mappers";
import type { BookingRequest, QuoteResponse } from "@/lib/transfercrm/openapi.types";
import type { BookingLocale, BookingPayload } from "@/lib/transfercrm/types";

/** Public book API request — frontend does not send BookingPayload. */
export interface BookingRequestDto {
  pickup: string;
  dropoff: string;
  datetime: string;
  passengers: number;
  vehicleType: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  fiscalName?: string;
  fiscalVat?: string;
  distanceKm?: number;
  locale?: BookingLocale;
  flightNumber?: string;
  childSeat?: boolean;
  luggage?: number;
  notes?: string;
}

export interface PublicBookResponseData {
  bookingId: string;
  status: string;
  price: number | null;
  /** Drive-time estimate in minutes (from distance when available). */
  estimatedTime: number | null;
}

/** Internal shape passed to TransferCRM mapper. */
export interface Way2GoPublicBooking {
  payload: BookingPayload;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseBookingRequestDto(body: unknown): { ok: true; data: BookingRequestDto } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Invalid body." };
  }
  const b = body as Record<string, unknown>;
  if (!isNonEmptyString(b.pickup)) return { ok: false, message: "Pickup is required." };
  if (!isNonEmptyString(b.dropoff)) return { ok: false, message: "Dropoff is required." };
  if (!isNonEmptyString(b.datetime)) return { ok: false, message: "Datetime is required." };
  if (typeof b.passengers !== "number" || !Number.isInteger(b.passengers) || b.passengers < 1) {
    return { ok: false, message: "Passengers must be an integer >= 1." };
  }
  if (!isNonEmptyString(b.vehicleType)) return { ok: false, message: "Vehicle type is required." };
  if (!b.customer || typeof b.customer !== "object") {
    return { ok: false, message: "Customer is required." };
  }
  const c = b.customer as Record<string, unknown>;
  if (!isNonEmptyString(c.name)) return { ok: false, message: "Customer name is required." };
  if (!isNonEmptyString(c.email)) return { ok: false, message: "Customer email is required." };
  if (!isNonEmptyString(c.phone)) return { ok: false, message: "Customer phone is required." };
  if (!splitQuoteDatetime(b.datetime)) {
    return { ok: false, message: "Invalid datetime. Use YYYY-MM-DD HH:mm or ISO format." };
  }
  const locale: BookingLocale | undefined = b.locale === "en" || b.locale === "pt" ? b.locale : undefined;
  const flightNumber =
    typeof b.flightNumber === "string" && b.flightNumber.trim() ? b.flightNumber.trim() : undefined;
  const childSeat = typeof b.childSeat === "boolean" ? b.childSeat : undefined;
  const luggage =
    typeof b.luggage === "number" && Number.isInteger(b.luggage) && b.luggage >= 0 ? b.luggage : undefined;
  const notes = typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : undefined;
  const fiscalName = typeof b.fiscalName === "string" && b.fiscalName.trim() ? b.fiscalName.trim() : undefined;
  const fiscalVat = typeof b.fiscalVat === "string" && b.fiscalVat.trim() ? b.fiscalVat.trim() : undefined;
  const distanceKm =
    typeof b.distanceKm === "number" && Number.isFinite(b.distanceKm) && b.distanceKm > 0 ? b.distanceKm : undefined;

  return {
    ok: true,
    data: {
      pickup: b.pickup.trim(),
      dropoff: b.dropoff.trim(),
      datetime: b.datetime.trim(),
      passengers: b.passengers,
      vehicleType: b.vehicleType.trim(),
      customer: {
        name: c.name.trim(),
        email: c.email.trim(),
        phone: c.phone.trim(),
      },
      ...(locale !== undefined ? { locale } : {}),
      ...(flightNumber !== undefined ? { flightNumber } : {}),
      ...(childSeat !== undefined ? { childSeat } : {}),
      ...(luggage !== undefined ? { luggage } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(fiscalName !== undefined ? { fiscalName } : {}),
      ...(fiscalVat !== undefined ? { fiscalVat } : {}),
      ...(distanceKm !== undefined ? { distanceKm } : {}),
    },
  };
}

/** Build BookingPayload before quote (distance/quoted price filled later). */
export function buildBookingPayloadFromBookingRequestDto(dto: BookingRequestDto): BookingPayload {
  const split = splitQuoteDatetime(dto.datetime);
  if (!split) {
    throw new Error("Invalid datetime.");
  }
  const loc: BookingLocale = dto.locale === "en" ? "en" : "pt";
  return {
    locale: loc,
    route: {
      pickup: dto.pickup.trim(),
      dropoff: dto.dropoff.trim(),
      date: split.date,
      time: split.time,
      childSeat: dto.childSeat === true,
      ...(dto.flightNumber?.trim() ? { flightNumber: dto.flightNumber.trim() } : {}),
    },
    details: {
      passengers: dto.passengers,
      luggage: typeof dto.luggage === "number" && dto.luggage >= 0 ? dto.luggage : 0,
      ...(typeof dto.distanceKm === "number" && Number.isFinite(dto.distanceKm) && dto.distanceKm > 0
        ? { distanceKm: dto.distanceKm }
        : {}),
      ...(dto.notes?.trim() ? { notes: dto.notes.trim() } : {}),
    },
    vehicleType: dto.vehicleType.trim(),
    contact: {
      fullName: dto.customer.name.trim(),
      email: dto.customer.email.trim(),
      phone: dto.customer.phone.trim(),
    },
    gdprAccepted: true,
  };
}

/** Map internal booking snapshot to TransferCRM POST /book body. */
export function mapBookingToTransferCRM(booking: Way2GoPublicBooking): BookingRequest {
  return mapBookingPayloadToBookingRequest(booking.payload);
}

export function applyQuoteToPayload(payload: BookingPayload, quote: QuoteResponse): BookingPayload {
  const withDist = mergeQuoteDistanceIntoPayload(payload, quote);
  const priceRaw = quote.price;
  const price = priceRaw != null && Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : NaN;
  const currency = quote.currency?.trim();
  if (!Number.isFinite(price) || !currency) {
    return withDist;
  }
  return {
    ...withDist,
    quotedPrice: { amount: price, currency },
  };
}

export function estimatedMinutesFromPayload(payload: BookingPayload): number | null {
  const d = payload.details.distanceKm;
  if (d == null || !Number.isFinite(d)) return null;
  return estimateDriveMinutesFromKm(d);
}

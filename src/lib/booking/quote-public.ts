import { estimateDriveMinutesFromKm } from "@/lib/booking/drive-time-estimate";
import type { BookingPayload } from "@/lib/transfercrm/types";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";
import { validateBookingPayload } from "@/lib/transfercrm/validation";

/** Public quote API request — frontend does not send BookingPayload. */
export interface QuoteRequestDto {
  pickup: string;
  dropoff: string;
  /** e.g. `2026-05-01 10:00` or ISO `2026-05-01T10:00` */
  datetime: string;
  passengers: number;
  vehicleType?: string;
}

/** Public quote API response — CRM details hidden behind this shape. */
export interface PublicQuoteResponse {
  price: number | null;
  /** Included for money formatting in UI (from CRM quote). */
  currency: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  vehicleType: string | null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Split `datetime` into CRM route.date and route.time (HH:mm). */
export function splitQuoteDatetime(raw: string): { date: string; time: string } | null {
  const s = raw.trim();
  if (!s) return null;

  if (s.includes("T")) {
    const [date, rest] = s.split("T", 2);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !rest) return null;
    const time = normalizeTimePart(rest);
    return time ? { date, time } : null;
  }

  const m = /^(\d{4}-\d{2}-\d{2})[ \t]+(\d{1,2}:\d{2}(?::\d{2})?)/.exec(s);
  if (!m) return null;
  const time = normalizeTimePart(m[2]);
  return time ? { date: m[1], time } : null;
}

function normalizeTimePart(part: string): string | null {
  const p = part.trim();
  const hm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(p);
  if (!hm) return null;
  const h = Number(hm[1]);
  const min = Number(hm[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function parseQuoteRequestDto(body: unknown): { ok: true; data: QuoteRequestDto } | { ok: false; message: string } {
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
  const split = splitQuoteDatetime(b.datetime);
  if (!split) {
    return { ok: false, message: "Invalid datetime. Use YYYY-MM-DD HH:mm or ISO format." };
  }
  const vehicleType =
    b.vehicleType === undefined || b.vehicleType === null
      ? undefined
      : typeof b.vehicleType === "string"
        ? b.vehicleType.trim() || undefined
        : undefined;
  return {
    ok: true,
    data: {
      pickup: b.pickup.trim(),
      dropoff: b.dropoff.trim(),
      datetime: b.datetime.trim(),
      passengers: b.passengers,
      ...(vehicleType !== undefined ? { vehicleType } : {}),
    },
  };
}

const QUOTE_DUMMY_CONTACT = {
  fullName: "Quote",
  email: "quote@way2go.invalid",
  phone: "000000000",
};

/** Build BookingPayload for TransferCRM quote only (contact/GDPR relaxed at validation layer). */
export function buildBookingPayloadFromQuoteRequest(dto: QuoteRequestDto): BookingPayload {
  const split = splitQuoteDatetime(dto.datetime);
  if (!split) {
    throw new Error("Invalid datetime.");
  }
  return {
    locale: "pt",
    route: {
      pickup: dto.pickup.trim(),
      dropoff: dto.dropoff.trim(),
      date: split.date,
      time: split.time,
      childSeat: false,
    },
    details: {
      passengers: dto.passengers,
      luggage: 0,
    },
    contact: { ...QUOTE_DUMMY_CONTACT },
    gdprAccepted: true,
    ...(dto.vehicleType?.trim() ? { vehicleType: dto.vehicleType.trim() } : {}),
  };
}

/** Validate internal payload built from QuoteRequestDto (no real contact required). */
export function validateQuoteBookingPayload(payload: BookingPayload) {
  return validateBookingPayload(payload, { requireContact: false, requireGdpr: false });
}

export function mapQuoteResponseToPublic(quote: QuoteResponse, requestedVehicleType?: string): PublicQuoteResponse {
  const distRaw = quote.distance_km;
  const distanceKm =
    distRaw != null && Number.isFinite(Number(distRaw)) ? Number(distRaw) : null;
  const durationMin = distanceKm != null ? estimateDriveMinutesFromKm(distanceKm) : null;
  const priceRaw = quote.price;
  const price = priceRaw != null && Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : null;
  const vt = requestedVehicleType?.trim() || quote.vehicle_type?.trim() || null;
  return {
    price,
    currency: quote.currency?.trim() ? quote.currency.trim() : null,
    distanceKm,
    durationMin,
    vehicleType: vt,
  };
}

export function quotePublicRequestCacheKey(d: QuoteRequestDto): string {
  return JSON.stringify({
    pickup: d.pickup.trim(),
    dropoff: d.dropoff.trim(),
    datetime: d.datetime.trim(),
    passengers: d.passengers,
    vehicleType: (d.vehicleType ?? "").trim(),
  });
}

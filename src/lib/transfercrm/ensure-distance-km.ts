import { estimateRouteDistanceKm } from "@/lib/routing/estimate-route-distance-km";
import { mapBookingPayloadToQuoteRequest } from "@/lib/transfercrm/booking-mappers";
import type { BookingPayload } from "@/lib/transfercrm/types";
import type { TransferCrmApiClient } from "@/lib/transfercrm/TransferCrmApiClient";

type QuoteCapable = Pick<TransferCrmApiClient, "postQuote">;

/**
 * When TransferCRM requires `distance_km` on POST /v2/quote, bootstrap it from a no-vehicle quote,
 * or from OSM geocode + OSRM (fallback), so pricing and booking flows keep working.
 */
export async function ensureDistanceKmOnPayload(payload: BookingPayload, crm: QuoteCapable): Promise<BookingPayload> {
  const existing = payload.details.distanceKm;
  if (existing !== undefined && Number.isFinite(existing) && existing > 0) {
    return payload;
  }
  try {
    const routeQuote = await crm.postQuote(mapBookingPayloadToQuoteRequest(payload));
    const d = Number(routeQuote.distance_km);
    if (Number.isFinite(d) && d > 0) {
      return { ...payload, details: { ...payload.details, distanceKm: d } };
    }
  } catch {
    // e.g. Laravel: "The distance km field is required."
  }
  const est = await estimateRouteDistanceKm(payload.route.pickup, payload.route.dropoff);
  if (est != null && est > 0) {
    return { ...payload, details: { ...payload.details, distanceKm: est } };
  }
  return payload;
}

const readyByPayload = new WeakMap<BookingPayload, Promise<BookingPayload>>();

/** Dedupes OSRM/Nominatim work when the same payload object is quoted multiple times (e.g. per vehicle type). */
export function resolveBookingPayloadDistance(payload: BookingPayload, crm: QuoteCapable): Promise<BookingPayload> {
  const existing = payload.details.distanceKm;
  if (existing !== undefined && Number.isFinite(existing) && existing > 0) {
    return Promise.resolve(payload);
  }
  let p = readyByPayload.get(payload);
  if (!p) {
    p = ensureDistanceKmOnPayload(payload, crm);
    readyByPayload.set(payload, p);
  }
  return p;
}

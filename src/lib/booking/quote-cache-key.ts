import type { BookingPayload } from "@/lib/transfercrm/types";

/** Stable cache key for TransferCRM quote responses (rate-limit friendly). */
export function quoteCacheKey(payload: BookingPayload, vehicleType: string): string {
  return JSON.stringify({
    pickup: payload.route.pickup,
    dropoff: payload.route.dropoff,
    date: payload.route.date,
    time: payload.route.time,
    distanceKm: payload.details.distanceKm,
    passengers: payload.details.passengers,
    luggage: payload.details.luggage,
    childSeat: payload.route.childSeat,
    flight: payload.route.flightNumber ?? "",
    vehicleType: vehicleType.trim(),
  });
}

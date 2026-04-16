import { getTransferCrmConfig } from "@/lib/transfercrm/config";
import type { BookingPayload, TransferCrmAvailabilityResult, TransferCrmBookingResult, TransferCrmVehicleOption } from "@/lib/transfercrm/types";
import type {
  AvailabilityQuery,
  AvailabilityResponse,
  BookingRequest,
  BookingResponse,
  QuoteRequest,
  QuoteResponse,
} from "@/lib/transfercrm/openapi.types";
import type { TransferCrmHttpOptions } from "@/lib/transfercrm/http-core";
import { transferCrmFetch, unwrapData, withRateLimitRetry } from "@/lib/transfercrm/http-core";
import {
  mapBookingPayloadToAvailabilityQuery,
  mapBookingPayloadToBookingRequest,
  mapBookingPayloadToQuoteRequest,
  type PaidBookingOverrides,
} from "@/lib/transfercrm/booking-mappers";

export class TransferCrmApiClient {
  constructor(private readonly http: TransferCrmHttpOptions) {}

  async getAvailability(query: AvailabilityQuery): Promise<AvailabilityResponse> {
    const params = new URLSearchParams();
    params.set("pickup_location", query.pickup_location);
    params.set("dropoff_location", query.dropoff_location);
    params.set("pickup_date", query.pickup_date);
    if (query.passengers !== undefined) {
      params.set("passengers", String(query.passengers));
    }
    if (query.distance_km !== undefined) {
      params.set("distance_km", String(query.distance_km));
    }
    const json = await withRateLimitRetry(() =>
      transferCrmFetch<unknown>(this.http, `/availability?${params.toString()}`, { method: "GET" }),
    );
    return unwrapData<AvailabilityResponse>(json);
  }

  async getAvailabilityForBooking(payload: BookingPayload): Promise<TransferCrmAvailabilityResult> {
    const query = mapBookingPayloadToAvailabilityQuery(payload);
    const data = await this.getAvailability(query);
    const vehicleOptions: TransferCrmVehicleOption[] = (data.vehicle_types ?? []).map((item) => ({
      vehicleType: item.vehicle_type ?? "unknown",
      estimatedPrice:
        item.estimated_price != null && typeof item.estimated_price === "number" ? item.estimated_price : 0,
      currency: item.currency ?? "EUR",
      seatsAvailable: typeof item.seats_available === "number" ? item.seats_available : 0,
      includesDistance: item.includes_distance,
    }));

    return {
      available: Boolean(data.available),
      vehicleOptions,
      pickupLocation: data.pickup_location ?? query.pickup_location,
      dropoffLocation: data.dropoff_location ?? query.dropoff_location,
      pickupDate: data.pickup_date ?? query.pickup_date,
    };
  }

  async postQuote(body: QuoteRequest): Promise<QuoteResponse> {
    const json = await withRateLimitRetry(() =>
      transferCrmFetch<unknown>(this.http, "/quote", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
    return unwrapData<QuoteResponse>(json);
  }

  async postQuoteForBooking(payload: BookingPayload, vehicleType?: string): Promise<QuoteResponse> {
    const body = mapBookingPayloadToQuoteRequest(payload, vehicleType);
    return this.postQuote(body);
  }

  async postBook(body: BookingRequest): Promise<BookingResponse> {
    const json = await withRateLimitRetry(() =>
      transferCrmFetch<unknown>(this.http, "/book", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
    return unwrapData<BookingResponse>(json);
  }

  /**
   * Create booking after Stripe payment: `external_reference` must be the PaymentIntent id (`pi_…`)
   * so retries are idempotent and aligned with the charged amount.
   */
  async postBookForPaidCheckout(payload: BookingPayload, paid: PaidBookingOverrides): Promise<TransferCrmBookingResult> {
    const body = mapBookingPayloadToBookingRequest(payload, paid);
    const data = await this.postBook(body);
    if (data.booking_id === undefined && !data.order_number) {
      throw new Error("TransferCRM booking response missing data.");
    }
    return {
      bookingId: data.booking_id !== undefined ? String(data.booking_id) : String(data.order_number),
      orderNumber: data.order_number,
      status: data.status,
      trackingUrl: data.tracking_url ?? undefined,
      pickupDate: data.pickup_date,
      price: data.price !== undefined && data.price !== null ? String(data.price) : undefined,
      currency: data.currency,
    };
  }

  async postBookForPayload(payload: BookingPayload): Promise<TransferCrmBookingResult> {
    const body = mapBookingPayloadToBookingRequest(payload);
    const data = await this.postBook(body);
    if (data.booking_id === undefined && !data.order_number) {
      throw new Error("TransferCRM booking response missing data.");
    }
    return {
      bookingId: data.booking_id !== undefined ? String(data.booking_id) : String(data.order_number),
      orderNumber: data.order_number,
      status: data.status,
      trackingUrl: data.tracking_url ?? undefined,
      pickupDate: data.pickup_date,
      price: data.price !== undefined && data.price !== null ? String(data.price) : undefined,
      currency: data.currency,
    };
  }

  async getBooking(bookingId: string): Promise<unknown> {
    return withRateLimitRetry(() =>
      transferCrmFetch<unknown>(this.http, `/bookings/${encodeURIComponent(bookingId)}`, { method: "GET" }),
    );
  }

  /** GET /v2/bookings — list assigned bookings (query keys depend on TransferCRM tenant). */
  async listBookings(query?: Record<string, string | undefined>): Promise<unknown> {
    const params = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== "") params.set(k, v);
      }
    }
    const qs = params.toString();
    const path = qs ? `/bookings?${qs}` : `/bookings`;
    return withRateLimitRetry(() => transferCrmFetch<unknown>(this.http, path, { method: "GET" }));
  }

  /** PATCH /v2/bookings/{id} — partial update (e.g. travel_status). */
  async patchBooking(bookingId: string, body: Record<string, unknown>): Promise<unknown> {
    return withRateLimitRetry(() =>
      transferCrmFetch<unknown>(this.http, `/bookings/${encodeURIComponent(bookingId)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    );
  }
}

export function createTransferCrmClientFromEnv(): TransferCrmApiClient {
  const cfg = getTransferCrmConfig();
  return new TransferCrmApiClient({
    baseUrl: cfg.baseUrl,
    timeoutMs: cfg.timeoutMs,
    auth: cfg.auth,
  });
}

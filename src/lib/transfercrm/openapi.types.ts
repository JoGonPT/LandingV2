/**
 * TransferCRM B2B API v2 — types aligned with `openapi/transfercrm-b2b.placeholder.json`.
 */

/** ISO-8601 datetime string, e.g. 2026-04-15T14:00:00.000Z */
export type Iso8601DateTime = string;

export interface TransferCrmApiEnvelope<T> {
  data: T;
}

/** GET /v2/availability — query (all optional beyond what the server requires). */
export interface AvailabilityQuery {
  pickup_location: string;
  dropoff_location: string;
  pickup_date: Iso8601DateTime;
  passengers?: number;
  distance_km?: number;
}

export interface VehicleTypeAvailability {
  vehicle_type: string;
  seats_available?: number;
  estimated_price?: number | null;
  currency?: string;
  includes_distance?: boolean;
}

export interface AvailabilityResponse {
  available: boolean;
  pickup_location?: string;
  dropoff_location?: string;
  pickup_date?: Iso8601DateTime;
  passengers?: number;
  vehicle_types?: VehicleTypeAvailability[];
}

/** POST /v2/quote */
export interface QuoteRequest {
  pickup_location: string;
  dropoff_location: string;
  pickup_date: Iso8601DateTime;
  distance_km: number;
  vehicle_type?: string | null;
  passengers?: number | null;
}

export interface QuoteBreakdown {
  base_fee?: number;
  per_km_rate?: number;
  per_min_rate?: number;
  vehicle_multiplier?: number;
  time_surcharge?: number;
  minimum_fare?: number;
}

export interface QuoteResponse {
  price?: number;
  currency?: string;
  distance_km?: number;
  vehicle_type?: string | null;
  breakdown?: QuoteBreakdown;
  valid_until?: Iso8601DateTime;
}

/** POST /v2/book */
export interface BookingRequest {
  pickup_location: string;
  dropoff_location: string;
  pickup_date: Iso8601DateTime;
  passenger_name: string;
  passenger_phone?: string | null;
  passenger_email?: string | null;
  flight_number?: string | null;
  vehicle_type?: string | null;
  passengers_count?: number | null;
  distance_km?: number | null;
  price?: number | null;
  currency?: string | null;
  meet_board_name?: string | null;
  notes?: string | null;
  external_reference?: string | null;
}

export interface BookingResponse {
  booking_id?: number;
  order_number?: string;
  status?: string;
  travel_status?: string | null;
  pickup_location?: string;
  dropoff_location?: string;
  pickup_date?: Iso8601DateTime;
  distance_km?: number | null;
  flight_number?: string | null;
  price?: number | null;
  currency?: string;
  tracking_url?: string | null;
  external_reference?: string | null;
}

export interface BookingDetailResponse extends BookingResponse {
  driver?: { name?: string; phone?: string | null } | null;
  vehicle?: {
    name?: string;
    type?: string;
    registration?: string;
    color?: string;
  } | null;
  flight_status?: string | null;
}

export interface BookingEnvelope {
  data: BookingResponse;
  message?: string | null;
}

/** Laravel-style validation payload */
export interface TransferCrmValidationErrorBody {
  message: string;
  errors?: Record<string, string[]>;
}

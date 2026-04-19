import { SupabaseService } from "@/modules/booking-engine/services/supabase.service";

export type BookingOrderStatus =
  | "PENDING_QUOTE"
  | "QUOTED"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "ASSIGNED"
  | "DRIVER_EN_ROUTE"
  | "PASSENGER_ON_BOARD"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
  | "PENDING_INTERNAL_PROCESSING";

export interface BookingOrderRow {
  id: string;
  public_reference: string | null;
  provider: "TRANSFER_CRM" | "WAY2GO_NATIVE";
  provider_booking_id: string | null;
  status: string;
  idempotency_key: string;
  failover_reason: string | null;
  request_payload: unknown;
  provider_response: unknown;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusEventInput {
  bookingId: string;
  fromStatus?: string | null;
  toStatus: string;
  travelStatus?: string | null;
  actor?: string | null;
  source?: string | null;
  provider?: string | null;
  providerBookingId?: string | null;
  eventPayload?: unknown;
  occurredAtIso?: string;
}

export interface UpsertMirrorInput {
  idempotencyKey: string;
  requestPayload: Record<string, unknown>;
  provider: "TRANSFER_CRM" | "WAY2GO_NATIVE";
  providerBookingId?: string;
  status: string;
  orderReference?: string;
  trackingUrl?: string;
  failoverReason?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
}

function normalizeUnifiedStatus(status?: string): BookingOrderStatus {
  const s = (status ?? "").trim().toUpperCase();
  switch (s) {
    case "PENDING_QUOTE":
    case "QUOTED":
    case "PENDING_CONFIRMATION":
    case "CONFIRMED":
    case "ASSIGNED":
    case "DRIVER_EN_ROUTE":
    case "PASSENGER_ON_BOARD":
    case "COMPLETED":
    case "CANCELLED":
    case "FAILED":
    case "PENDING_INTERNAL_PROCESSING":
      return s;
    case "EN_ROUTE_PICKUP":
    case "ARRIVED_PICKUP":
      return "DRIVER_EN_ROUTE";
    case "DRIVER_ASSIGNED":
      return "ASSIGNED";
    case "ON_ROUTE":
      return "DRIVER_EN_ROUTE";
    case "ON_BOARD":
      return "PASSENGER_ON_BOARD";
    case "DONE":
      return "COMPLETED";
    default:
      return "CONFIRMED";
  }
}

function mirrorRowIdForIdempotencyKey(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);
  if (safe) return `bo_${safe}`;
  return `bo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export class BookingRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async upsertMirror(input: UpsertMirrorInput): Promise<BookingOrderRow | null> {
    const status = normalizeUnifiedStatus(input.status);
    const existing = await this.supabase.getBookingOrderByIdempotencyKey(input.idempotencyKey);
    const publicReference = existing?.public_reference ?? input.idempotencyKey;
    return this.supabase.upsertBookingOrder({
      id: existing?.id ?? mirrorRowIdForIdempotencyKey(input.idempotencyKey),
      public_reference: publicReference,
      provider: input.provider,
      provider_booking_id: input.providerBookingId ?? null,
      status,
      idempotency_key: input.idempotencyKey,
      failover_reason: input.failoverReason ?? null,
      request_payload: input.requestPayload,
      provider_response: {
        orderReference: input.orderReference ?? null,
        trackingUrl: input.trackingUrl ?? null,
      },
      last_error_code: input.lastErrorCode ?? (input.failoverReason ? "FAILOVER_PENDING_INTERNAL_PROCESSING" : null),
      last_error_message: input.lastErrorMessage ?? input.failoverReason ?? null,
    });
  }

  async getByProviderBookingId(provider: string, providerBookingId: string): Promise<BookingOrderRow | null> {
    return this.supabase.getBookingOrderByProviderBookingId(provider, providerBookingId);
  }

  async appendStatusEvent(input: {
    bookingId: string;
    status: string;
    travelStatus?: string;
    actor?: string;
    payload?: Record<string, unknown>;
    provider?: string;
  }): Promise<void> {
    const booking = await this.supabase.getBookingOrderById(input.bookingId);
    if (!booking) return;
    const toStatus = normalizeUnifiedStatus(input.status);
    await this.supabase.insertBookingStatusEvent({
      booking_id: booking.id,
      from_status: booking.status ?? null,
      to_status: toStatus,
      travel_status: input.travelStatus ?? null,
      actor: input.actor ?? null,
      source: "booking_engine",
      provider: input.provider ?? booking.provider ?? null,
      event_payload: input.payload ?? null,
      occurred_at: new Date().toISOString(),
    });
    await this.supabase.patchBookingOrderById(booking.id, {
      status: toStatus,
      updated_at: new Date().toISOString(),
    });
  }

  async createStatusEventByProviderBookingId(input: Omit<StatusEventInput, "bookingId"> & { providerBookingId: string }): Promise<void> {
    const booking = await this.getByProviderBookingId(input.provider ?? "TRANSFER_CRM", input.providerBookingId);
    if (!booking) return;
    await this.appendStatusEvent({
      bookingId: booking.id,
      status: input.toStatus,
      travelStatus: input.travelStatus ?? undefined,
      actor: input.actor ?? undefined,
      payload: (input.eventPayload as Record<string, unknown> | undefined) ?? undefined,
      provider: input.provider ?? undefined,
    });
  }
}

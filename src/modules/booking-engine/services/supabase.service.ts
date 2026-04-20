export class SupabaseHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "SupabaseHttpError";
  }
}

type Primitive = string | number | boolean | null;

function encodeFilterValue(value: Primitive): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return encodeURIComponent(String(value));
}

function buildFilterQuery(filters: Record<string, Primitive>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === null) {
      params.set(key, "is.null");
      continue;
    }
    params.set(key, `eq.${encodeFilterValue(value)}`);
  }
  return params.toString();
}

export class SupabaseService {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceKey: string,
  ) {}

  static fromEnv(): SupabaseService | null {
    const baseUrl = process.env.SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!baseUrl || !serviceKey) {
      return null;
    }
    return new SupabaseService(baseUrl.replace(/\/+$/, ""), serviceKey);
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  private async parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }

  async selectOne<T>(
    table: string,
    filters: Record<string, Primitive>,
    select = "*",
  ): Promise<T | null> {
    const where = buildFilterQuery(filters);
    const url = `${this.baseUrl}/rest/v1/${table}?${where}&select=${encodeURIComponent(select)}&limit=1`;
    const response = await fetch(url, { method: "GET", headers: this.headers() });
    if (!response.ok) {
      throw new SupabaseHttpError(`Supabase select failed for ${table}.`, response.status, await this.parseBody(response));
    }
    const rows = (await response.json()) as T[];
    return rows[0] ?? null;
  }

  async selectMany<T>(
    table: string,
    filters: Record<string, Primitive> = {},
    select = "*",
  ): Promise<T[]> {
    const where = buildFilterQuery(filters);
    const qs = where ? `${where}&` : "";
    const url = `${this.baseUrl}/rest/v1/${table}?${qs}select=${encodeURIComponent(select)}`;
    const response = await fetch(url, { method: "GET", headers: this.headers() });
    if (!response.ok) {
      throw new SupabaseHttpError(`Supabase select failed for ${table}.`, response.status, await this.parseBody(response));
    }
    return (await response.json()) as T[];
  }

  async insertOne<T>(table: string, payload: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl}/rest/v1/${table}`, {
      method: "POST",
      headers: this.headers({ Prefer: "return=representation" }),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new SupabaseHttpError(`Supabase insert failed for ${table}.`, response.status, await this.parseBody(response));
    }
    const rows = (await response.json()) as T[];
    if (!rows[0]) {
      throw new SupabaseHttpError(`Supabase insert returned no row for ${table}.`, 500);
    }
    return rows[0];
  }

  async upsertOne<T>(
    table: string,
    payload: Record<string, unknown>,
    onConflict: string,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: "POST",
      headers: this.headers({ Prefer: "return=representation,resolution=merge-duplicates" }),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new SupabaseHttpError(`Supabase upsert failed for ${table}.`, response.status, await this.parseBody(response));
    }
    const rows = (await response.json()) as T[];
    if (!rows[0]) {
      throw new SupabaseHttpError(`Supabase upsert returned no row for ${table}.`, 500);
    }
    return rows[0];
  }

  async patchOne<T>(
    table: string,
    filters: Record<string, Primitive>,
    patch: Record<string, unknown>,
  ): Promise<T | null> {
    const where = buildFilterQuery(filters);
    const response = await fetch(`${this.baseUrl}/rest/v1/${table}?${where}`, {
      method: "PATCH",
      headers: this.headers({ Prefer: "return=representation" }),
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      throw new SupabaseHttpError(`Supabase patch failed for ${table}.`, response.status, await this.parseBody(response));
    }
    const rows = (await response.json()) as T[];
    return rows[0] ?? null;
  }

  async getBookingOrderById(id: string): Promise<BookingOrderRow | null> {
    return this.selectOne<BookingOrderRow>("booking_orders", { id });
  }

  async getBookingOrderByIdempotencyKey(idempotencyKey: string): Promise<BookingOrderRow | null> {
    return this.selectOne<BookingOrderRow>("booking_orders", { idempotency_key: idempotencyKey });
  }

  async getBookingOrderByProviderBookingId(
    provider: string,
    providerBookingId: string,
  ): Promise<BookingOrderRow | null> {
    return this.selectOne<BookingOrderRow>("booking_orders", {
      provider,
      provider_booking_id: providerBookingId,
    });
  }

  async upsertBookingOrder(payload: BookingOrderUpsertPayload): Promise<BookingOrderRow> {
    return this.upsertOne<BookingOrderRow>(
      "booking_orders",
      payload as unknown as Record<string, unknown>,
      "idempotency_key",
    );
  }

  async patchBookingOrderById(id: string, patch: Record<string, unknown>): Promise<BookingOrderRow | null> {
    return this.patchOne<BookingOrderRow>("booking_orders", { id }, patch);
  }

  async insertBookingStatusEvent(payload: BookingStatusEventInsertPayload): Promise<BookingStatusEventRow> {
    return this.insertOne<BookingStatusEventRow>(
      "booking_status_events",
      payload as unknown as Record<string, unknown>,
    );
  }

  async getRateCardByVehicleClass(vehicleClass: string): Promise<RateCardRow | null> {
    const normalized = vehicleClass.trim().toUpperCase();
    return this.selectOne<RateCardRow>("rate_cards", { vehicle_class: normalized, active: true });
  }

  async listRateCards(): Promise<RateCardRow[]> {
    return this.selectMany<RateCardRow>("rate_cards", { active: true });
  }

  async countAvailableFleetSlots(): Promise<number> {
    const rows = await this.selectMany<FleetAvailabilityRow>("fleet_availability", { is_available: true }, "available_units");
    return rows.reduce((sum, row) => sum + Math.max(0, Number(row.available_units) || 0), 0);
  }

  async listActiveDrivers(): Promise<DriverRow[]> {
    return this.selectMany<DriverRow>("drivers", { active: true });
  }

  async listFleetVehiclesByClass(vehicleClass: string): Promise<FleetVehicleRow[]> {
    const normalized = vehicleClass.trim().toUpperCase();
    return this.selectMany<FleetVehicleRow>("fleet_vehicles", { vehicle_class: normalized, active: true });
  }

  async listActiveDriverCandidatesByVehicleClass(vehicleClass: string): Promise<DriverCandidateRow[]> {
    const normalized = vehicleClass.trim().toUpperCase();
    return this.selectMany<DriverCandidateRow>(
      "driver_vehicle_live",
      { vehicle_class: normalized, active: true },
      "driver_id,vehicle_id,current_lat,current_lng,available_units,active,vehicle_class",
    );
  }

  async insertDriverBookingAssignment(payload: DriverBookingAssignmentInsertPayload): Promise<DriverBookingAssignmentRow> {
    return this.insertOne<DriverBookingAssignmentRow>(
      "native_driver_booking_assignments",
      payload as unknown as Record<string, unknown>,
    );
  }

  async patchDriverLocation(driverId: string, lat: number, lng: number): Promise<DriverRow | null> {
    return this.patchOne<DriverRow>(
      "drivers",
      { id: driverId },
      { current_lat: lat, current_lng: lng, updated_at: new Date().toISOString() },
    );
  }

  async getEngineAuditSummary(): Promise<EngineAuditSummary> {
    const bookings = await this.selectMany<BookingOrderRow>("booking_orders");
    let comparedQuotesCount = 0;
    let deltaSum = 0;
    let nativeTotalCount = 0;
    let nativeAssignedCount = 0;
    let failoverCount = 0;

    for (const booking of bookings) {
      const providerResponse =
        booking.provider_response && typeof booking.provider_response === "object"
          ? (booking.provider_response as Record<string, unknown>)
          : null;
      const requestPayload =
        booking.request_payload && typeof booking.request_payload === "object"
          ? (booking.request_payload as Record<string, unknown>)
          : null;
      const quote =
        providerResponse?.quote && typeof providerResponse.quote === "object"
          ? (providerResponse.quote as Record<string, unknown>)
          : null;
      const crmPrice = Number((requestPayload?.quotedPrice as { amount?: unknown } | undefined)?.amount);
      const nativePrice = Number(quote?.price ?? providerResponse?.price);
      if (Number.isFinite(crmPrice) && Number.isFinite(nativePrice)) {
        comparedQuotesCount += 1;
        deltaSum += nativePrice - crmPrice;
      }

      if (booking.provider === "WAY2GO_NATIVE") {
        nativeTotalCount += 1;
        if (booking.status === "ASSIGNED" || booking.status === "DRIVER_EN_ROUTE" || booking.status === "PASSENGER_ON_BOARD" || booking.status === "COMPLETED") {
          nativeAssignedCount += 1;
        }
      }

      if (booking.status === "PENDING_INTERNAL_PROCESSING" || booking.failover_reason) {
        failoverCount += 1;
      }
    }

    const nativeAssignmentSuccessRate = nativeTotalCount > 0 ? nativeAssignedCount / nativeTotalCount : 0;
    const averagePriceDelta = comparedQuotesCount > 0 ? deltaSum / comparedQuotesCount : 0;

    return {
      average_price_delta: Number(averagePriceDelta.toFixed(4)),
      compared_quotes_count: comparedQuotesCount,
      native_assignment_success_rate: Number(nativeAssignmentSuccessRate.toFixed(4)),
      native_total_count: nativeTotalCount,
      native_assigned_count: nativeAssignedCount,
      failover_count: failoverCount,
    };
  }
}

export interface BookingOrderRow {
  id: string;
  public_reference: string | null;
  provider: "TRANSFER_CRM" | "WAY2GO_NATIVE";
  provider_booking_id: string | null;
  status:
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
  idempotency_key: string;
  failover_reason: string | null;
  request_payload: unknown;
  provider_response: unknown;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingOrderUpsertPayload {
  id: string;
  public_reference: string;
  provider: "TRANSFER_CRM" | "WAY2GO_NATIVE";
  provider_booking_id: string | null;
  status: string;
  idempotency_key: string;
  failover_reason: string | null;
  request_payload: unknown;
  provider_response: unknown;
  last_error_code: string | null;
  last_error_message: string | null;
  updated_at?: string;
}

export interface BookingStatusEventInsertPayload {
  booking_id: string;
  from_status: string | null;
  to_status: string;
  travel_status: string | null;
  actor: string | null;
  source: string;
  provider: string;
  event_payload: unknown;
  occurred_at: string;
}

export interface BookingStatusEventRow {
  id: number;
  booking_id: string;
  from_status: string | null;
  to_status: string;
  travel_status: string | null;
  actor: string | null;
  source: string;
  provider: string;
  event_payload: unknown;
  occurred_at: string;
  created_at: string;
}

export interface RateCardRow {
  id: string;
  vehicle_class: string;
  base_fee: number | string;
  per_km_rate: number | string;
  min_fare: number | string;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FleetAvailabilityRow {
  available_units: number | string;
}

export interface DriverRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  current_lat: number | string | null;
  current_lng: number | string | null;
  default_vehicle_id: string | null;
}

export interface FleetVehicleRow {
  id: string;
  vehicle_class: string;
  plate: string | null;
  active: boolean;
}

export interface DriverBookingAssignmentInsertPayload {
  id: string;
  booking_id: string;
  driver_id: string;
  vehicle_id: string;
  status: string;
  assigned_at: string;
  notes?: string | null;
}

export interface DriverBookingAssignmentRow {
  id: string;
  booking_id: string;
  driver_id: string;
  vehicle_id: string;
  status: string;
  assigned_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverCandidateRow {
  driver_id: string;
  vehicle_id: string;
  current_lat: number | string | null;
  current_lng: number | string | null;
  available_units: number | string | null;
  active: boolean;
  vehicle_class: string;
}

export interface EngineAuditSummary {
  average_price_delta: number;
  compared_quotes_count: number;
  native_assignment_success_rate: number;
  native_total_count: number;
  native_assigned_count: number;
  failover_count: number;
}

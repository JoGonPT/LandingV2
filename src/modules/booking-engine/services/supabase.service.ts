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

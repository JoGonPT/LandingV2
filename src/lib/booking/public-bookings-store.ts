export type PublicBookingDbStatus = "PENDING" | "SYNCED" | "FAILED_SYNC";

/** Postgres unique violation / PostgREST 409 — booking row already exists (e.g. Stripe webhook retry). */
export class PublicBookingInsertDuplicateError extends Error {
  constructor(message = "public_bookings unique violation") {
    super(message);
    this.name = "PublicBookingInsertDuplicateError";
  }
}

export type PublicBookingFetchedRow = {
  id: string;
  status: string;
  pickup: string;
  dropoff: string;
  trip_date: string;
  trip_time: string;
  datetime_raw?: string;
  crm_booking_id: string | null;
  crm_order_number: string | null;
  crm_status: string | null;
  price: number | string | null;
  currency: string | null;
  stripe_payment_intent_id: string | null;
  customer: unknown;
  estimated_time_min?: number | null;
  idempotency_key?: string | null;
};

export interface PublicBookingInsertRow {
  id: string;
  status: PublicBookingDbStatus;
  pickup: string;
  dropoff: string;
  trip_date: string;
  trip_time: string;
  datetime_raw: string;
  passengers: number;
  vehicle_type: string;
  customer: { name: string; email: string; phone: string };
  price: number | null;
  currency: string | null;
  distance_km: number | null;
  estimated_time_min: number | null;
  crm_booking_id?: string | null;
  crm_order_number?: string | null;
  crm_status?: string | null;
  stripe_payment_intent_id?: string | null;
  payment_method?: string | null;
  partner_slug?: string | null;
  idempotency_key?: string | null;
}

export interface PublicBookingPatch {
  status?: PublicBookingDbStatus;
  price?: number | null;
  currency?: string | null;
  distance_km?: number | null;
  estimated_time_min?: number | null;
  crm_booking_id?: string | null;
  crm_order_number?: string | null;
  crm_status?: string | null;
  /** Chauffeur phase from driver PWA / TransferCRM travel_status sync. */
  driver_travel_status?: string | null;
  idempotency_key?: string | null;
  sync_error?: string | null;
  updated_at?: string;
}

function headers(serviceKey: string, extra?: Record<string, string>) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export function createPublicBookingsStoreFromEnv():
  | {
      insert: (row: PublicBookingInsertRow) => Promise<void>;
      patch: (id: string, patch: PublicBookingPatch) => Promise<void>;
      patchByCrmBookingId: (crmBookingId: string, patch: PublicBookingPatch) => Promise<void>;
      getById: (id: string) => Promise<PublicBookingFetchedRow | null>;
      getByCrmBookingId: (crmBookingId: string) => Promise<PublicBookingFetchedRow | null>;
      getByStripePaymentIntentId: (paymentIntentId: string) => Promise<PublicBookingFetchedRow | null>;
      getByIdempotencyKey: (key: string) => Promise<PublicBookingFetchedRow | null>;
    }
  | null {
  const baseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey) return null;

  return {
    async insert(row: PublicBookingInsertRow) {
      const res = await fetch(`${baseUrl}/rest/v1/public_bookings`, {
        method: "POST",
        headers: headers(serviceKey, { Prefer: "return=minimal" }),
        body: JSON.stringify({
          id: row.id,
          status: row.status,
          pickup: row.pickup,
          dropoff: row.dropoff,
          trip_date: row.trip_date,
          trip_time: row.trip_time,
          datetime_raw: row.datetime_raw,
          passengers: row.passengers,
          vehicle_type: row.vehicle_type,
          customer: row.customer,
          price: row.price,
          currency: row.currency,
          distance_km: row.distance_km,
          estimated_time_min: row.estimated_time_min,
          ...(row.crm_booking_id ? { crm_booking_id: row.crm_booking_id } : {}),
          ...(row.crm_order_number ? { crm_order_number: row.crm_order_number } : {}),
          ...(row.crm_status ? { crm_status: row.crm_status } : {}),
          ...(row.stripe_payment_intent_id ? { stripe_payment_intent_id: row.stripe_payment_intent_id } : {}),
          ...(row.payment_method != null && row.payment_method !== "" ? { payment_method: row.payment_method } : {}),
          ...(row.partner_slug != null && row.partner_slug !== "" ? { partner_slug: row.partner_slug } : {}),
          ...(row.idempotency_key != null && row.idempotency_key !== ""
            ? { idempotency_key: row.idempotency_key }
            : {}),
        }),
      });
      if (res.status === 409) {
        throw new PublicBookingInsertDuplicateError();
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`public_bookings insert failed: ${res.status} ${t}`);
      }
    },

    async getByStripePaymentIntentId(paymentIntentId: string) {
      const res = await fetch(
        `${baseUrl}/rest/v1/public_bookings?stripe_payment_intent_id=eq.${encodeURIComponent(paymentIntentId)}&select=*`,
        { headers: headers(serviceKey) },
      );
      if (!res.ok) return null;
      const rows = (await res.json()) as PublicBookingFetchedRow[];
      if (!rows?.length) return null;
      return rows[0];
    },

    async getById(id: string) {
      const key = id.trim();
      if (!key) return null;
      const res = await fetch(`${baseUrl}/rest/v1/public_bookings?id=eq.${encodeURIComponent(key)}&select=*`, {
        headers: headers(serviceKey),
      });
      if (!res.ok) return null;
      const rows = (await res.json()) as PublicBookingFetchedRow[];
      if (!rows?.length) return null;
      return rows[0];
    },

    async getByCrmBookingId(crmBookingId: string) {
      const key = crmBookingId.trim();
      if (!key) return null;
      const res = await fetch(
        `${baseUrl}/rest/v1/public_bookings?crm_booking_id=eq.${encodeURIComponent(key)}&select=*`,
        { headers: headers(serviceKey) },
      );
      if (!res.ok) return null;
      const rows = (await res.json()) as PublicBookingFetchedRow[];
      if (!rows?.length) return null;
      return rows[0];
    },

    async getByIdempotencyKey(key: string) {
      const k = key.trim();
      if (!k) return null;
      const res = await fetch(
        `${baseUrl}/rest/v1/public_bookings?idempotency_key=eq.${encodeURIComponent(k)}&select=*`,
        { headers: headers(serviceKey) },
      );
      if (!res.ok) return null;
      const rows = (await res.json()) as PublicBookingFetchedRow[];
      if (!rows?.length) return null;
      return rows[0];
    },

    async patch(id: string, patch: PublicBookingPatch) {
      const body = {
        ...patch,
        updated_at: patch.updated_at ?? new Date().toISOString(),
      };
      const res = await fetch(`${baseUrl}/rest/v1/public_bookings?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: headers(serviceKey, { Prefer: "return=minimal" }),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`public_bookings patch failed: ${res.status} ${t}`);
      }
    },

    async patchByCrmBookingId(crmBookingId: string, patch: PublicBookingPatch) {
      const body = {
        ...patch,
        updated_at: patch.updated_at ?? new Date().toISOString(),
      };
      const res = await fetch(
        `${baseUrl}/rest/v1/public_bookings?crm_booking_id=eq.${encodeURIComponent(crmBookingId.trim())}`,
        {
          method: "PATCH",
          headers: headers(serviceKey, { Prefer: "return=minimal" }),
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`public_bookings patch by crm_booking_id failed: ${res.status} ${t}`);
      }
    },
  };
}

export function createDriverAssignmentUpsertFromEnv(): ((crmBookingId: string, driverKey: string) => Promise<void>) | null {
  const baseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey) return null;

  return async (crmBookingId: string, driverKey: string) => {
    const res = await fetch(`${baseUrl}/rest/v1/driver_booking_assignments`, {
      method: "POST",
      headers: headers(serviceKey, {
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify([
        {
          transfercrm_booking_id: crmBookingId,
          driver_key: driverKey,
        },
      ]),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`driver_booking_assignments upsert failed: ${res.status} ${t}`);
    }
  };
}

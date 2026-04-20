import type { BookingRequestDto } from "@/lib/booking/book-public";
import type { CheckoutCompleteSuccess } from "@/lib/transfercrm/types";

export type StripeCheckoutSessionStatus = "pending" | "completed" | "failed";

function headers(serviceKey: string, extra?: Record<string, string>) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export type StripeCheckoutSessionRow = {
  id: string;
  dto: BookingRequestDto;
  status: StripeCheckoutSessionStatus;
  result: CheckoutCompleteSuccess | null;
  error_message: string | null;
  public_booking_id: string | null;
  stripe_payment_intent_id: string | null;
};

function parseSessionRow(r: Record<string, unknown>): StripeCheckoutSessionRow {
  const dto = r.dto as BookingRequestDto;
  const rawResult = r.result as CheckoutCompleteSuccess | null;
  return {
    id: String(r.id),
    dto,
    status: r.status as StripeCheckoutSessionStatus,
    result:
      rawResult && typeof rawResult === "object" && "success" in rawResult && rawResult.success === true
        ? rawResult
        : null,
    error_message: typeof r.error_message === "string" ? r.error_message : null,
    public_booking_id: r.public_booking_id != null ? String(r.public_booking_id) : null,
    stripe_payment_intent_id: typeof r.stripe_payment_intent_id === "string" ? r.stripe_payment_intent_id : null,
  };
}

export function createStripeCheckoutSessionStoreFromEnv():
  | {
      insert: (id: string, dto: BookingRequestDto) => Promise<void>;
      setPaymentIntent: (id: string, paymentIntentId: string) => Promise<void>;
      getById: (id: string) => Promise<StripeCheckoutSessionRow | null>;
      getByPaymentIntentId: (pi: string) => Promise<StripeCheckoutSessionRow | null>;
      markCompleted: (id: string, patch: { result: CheckoutCompleteSuccess; public_booking_id: string }) => Promise<void>;
      markFailed: (id: string, message: string) => Promise<void>;
    }
  | null {
  const baseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey) return null;

  return {
    async insert(id: string, dto: BookingRequestDto) {
      const res = await fetch(`${baseUrl}/rest/v1/stripe_checkout_sessions`, {
        method: "POST",
        headers: headers(serviceKey, { Prefer: "return=minimal" }),
        body: JSON.stringify({
          id,
          dto,
          status: "pending",
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`stripe_checkout_sessions insert failed: ${res.status} ${t}`);
      }
    },

    async setPaymentIntent(id: string, paymentIntentId: string) {
      const res = await fetch(`${baseUrl}/rest/v1/stripe_checkout_sessions?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: headers(serviceKey, { Prefer: "return=minimal" }),
        body: JSON.stringify({
          stripe_payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`stripe_checkout_sessions patch pi failed: ${res.status} ${t}`);
      }
    },

    async getById(id: string) {
      const res = await fetch(
        `${baseUrl}/rest/v1/stripe_checkout_sessions?id=eq.${encodeURIComponent(id)}&select=*`,
        { headers: headers(serviceKey) },
      );
      if (!res.ok) return null;
      const rows = (await res.json()) as Record<string, unknown>[];
      if (!rows?.length) return null;
      return parseSessionRow(rows[0]);
    },

    async getByPaymentIntentId(pi: string) {
      const res = await fetch(
        `${baseUrl}/rest/v1/stripe_checkout_sessions?stripe_payment_intent_id=eq.${encodeURIComponent(pi)}&select=*`,
        { headers: headers(serviceKey) },
      );
      if (!res.ok) return null;
      const rows = (await res.json()) as Record<string, unknown>[];
      if (!rows?.length) return null;
      return parseSessionRow(rows[0]);
    },

    async markCompleted(id: string, patch: { result: CheckoutCompleteSuccess; public_booking_id: string }) {
      const res = await fetch(`${baseUrl}/rest/v1/stripe_checkout_sessions?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: headers(serviceKey, { Prefer: "return=minimal" }),
        body: JSON.stringify({
          status: "completed",
          result: patch.result,
          public_booking_id: patch.public_booking_id,
          error_message: null,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`stripe_checkout_sessions complete failed: ${res.status} ${t}`);
      }
    },

    async markFailed(id: string, message: string) {
      const res = await fetch(`${baseUrl}/rest/v1/stripe_checkout_sessions?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: headers(serviceKey, { Prefer: "return=minimal" }),
        body: JSON.stringify({
          status: "failed",
          error_message: message.slice(0, 4000),
          updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`stripe_checkout_sessions fail failed: ${res.status} ${t}`);
      }
    },
  };
}

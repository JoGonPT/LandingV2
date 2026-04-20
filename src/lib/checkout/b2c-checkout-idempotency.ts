/** sessionStorage key for B2C checkout idempotency (Stripe + optional public book dedupe). */
export const B2C_CHECKOUT_IDEMPOTENCY_STORAGE_KEY = "way2go_b2c_checkout_idempotency_v1";

export function ensureB2CCheckoutIdempotencyKey(): string {
  if (typeof window === "undefined") {
    throw new Error("ensureB2CCheckoutIdempotencyKey must run in the browser.");
  }
  try {
    const existing = window.sessionStorage.getItem(B2C_CHECKOUT_IDEMPOTENCY_STORAGE_KEY)?.trim();
    if (existing && existing.length > 0) return existing;
    const id = crypto.randomUUID();
    window.sessionStorage.setItem(B2C_CHECKOUT_IDEMPOTENCY_STORAGE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function clearB2CCheckoutIdempotencyKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(B2C_CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

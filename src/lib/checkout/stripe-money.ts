/**
 * Stripe amounts are in the smallest currency unit (e.g. cents for EUR).
 * @see https://docs.stripe.com/currencies#zero-decimal
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

export function toStripeMinorUnits(amount: number, currency: string): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Amount must be a non-negative finite number.");
  }
  const code = currency.trim().toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

export function minorUnitsMatchStripeIntent(amountMinor: number, stripeAmount: number | null | undefined): boolean {
  if (stripeAmount == null) return false;
  return amountMinor === stripeAmount;
}

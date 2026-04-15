import Stripe from "stripe";

export function createStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

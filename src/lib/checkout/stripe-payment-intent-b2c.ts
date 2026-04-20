import type Stripe from "stripe";
import type { BookingPayload } from "@/lib/transfercrm/types";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";
import { toStripeMinorUnits } from "@/lib/checkout/stripe-money";

export interface B2cPaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  amountMinor: number;
  currency: string;
}

/**
 * B2C PaymentIntent: CRM quote amount charged; PI metadata holds reconciliation + optional distance.
 */
export async function createB2cTransferPaymentIntent(
  stripe: Stripe,
  quote: QuoteResponse,
  payload: BookingPayload,
  vehicleType: string,
  metadataExtra?: Record<string, string>,
  requestOptions?: { idempotencyKey?: string },
): Promise<B2cPaymentIntentResult> {
  const price = quote.price;
  const currency = quote.currency?.trim();

  if (price === undefined || price === null || !currency) {
    throw new Error("Quote missing price or currency.");
  }

  const crmMajor = Number(price);
  if (!Number.isFinite(crmMajor)) {
    throw new Error("Invalid quote price.");
  }

  const amountMinor = toStripeMinorUnits(crmMajor, currency);
  const quoteDistance =
    quote.distance_km != null && Number.isFinite(Number(quote.distance_km)) ? String(Number(quote.distance_km)) : "";

  const intent = await stripe.paymentIntents.create(
    {
      amount: amountMinor,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        way2go_price: String(crmMajor),
        way2go_stripe_total: String(crmMajor),
        way2go_currency: currency.toUpperCase(),
        way2go_vehicle: vehicleType.slice(0, 500),
        ...(payload.details.distanceKm === undefined && quoteDistance
          ? { way2go_distance_km: quoteDistance.slice(0, 32) }
          : {}),
        ...(metadataExtra ?? {}),
      },
      description: `Way2Go transfer: ${payload.route.pickup.slice(0, 120)} → ${payload.route.dropoff.slice(0, 120)}`,
    },
    requestOptions?.idempotencyKey ? { idempotencyKey: requestOptions.idempotencyKey.slice(0, 255) } : undefined,
  );

  const clientSecret = intent.client_secret;
  if (!clientSecret) {
    throw new Error("Stripe did not return a client secret for the PaymentIntent.");
  }

  return {
    paymentIntentId: intent.id,
    clientSecret,
    amountMinor,
    currency: currency.toUpperCase(),
  };
}

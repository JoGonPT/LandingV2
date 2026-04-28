import { createStripeClient } from "@/lib/checkout/stripe-client";

export interface GenerateStripePaymentLinkInput {
  bookingId: string;
  amount: number;
  currency: string;
  description: string;
}

function resolveSuccessReturnUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.way2go.pt");
  return `${base.replace(/\/+$/, "")}/pt/checkout/success`;
}

export async function generateStripePaymentLink(
  bookingId: string,
  amount: number,
  currency: string,
  description: string,
): Promise<string> {
  const amountMinor = Math.round((amount + Number.EPSILON) * 100);
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    throw new Error("Invalid payment amount for Stripe Payment Link.");
  }
  const cur = currency.trim().toLowerCase();
  if (!cur) {
    throw new Error("Invalid payment currency for Stripe Payment Link.");
  }

  const stripe = createStripeClient();
  const product = await stripe.products.create({
    name: `Way2Go Transfer Booking ${bookingId}`,
    description: description.slice(0, 500),
    metadata: {
      way2go_booking_id: bookingId,
      way2go_payment_mode: "manual_link",
    },
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: cur,
    unit_amount: amountMinor,
  });
  const link = await stripe.paymentLinks.create({
    line_items: [
      {
        quantity: 1,
        price: price.id,
      },
    ],
    metadata: {
      way2go_booking_id: bookingId,
      way2go_payment_mode: "manual_link",
    },
    after_completion: {
      type: "redirect",
      redirect: {
        url: resolveSuccessReturnUrl(),
      },
    },
  });

  return link.url;
}


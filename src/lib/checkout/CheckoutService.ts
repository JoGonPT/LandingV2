import type Stripe from "stripe";
import type { BookingPayload } from "@/lib/transfercrm/types";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";
import type { TransferCrmApiClient } from "@/lib/transfercrm/TransferCrmApiClient";
import {
  CheckoutQuoteIncompleteError,
} from "@/lib/checkout/checkout-errors";
import { toStripeMinorUnits } from "@/lib/checkout/stripe-money";
import {
  computePartnerCommissionBreakdown,
  type PartnerCommissionPricingPayload,
  type PartnerPricingModel,
} from "@/lib/partner/commission-pricing";
import type { TransferCrmBookingResult } from "@/lib/transfercrm/types";
import { createB2cTransferPaymentIntent } from "@/lib/checkout/stripe-payment-intent-b2c";
import { finalizePaidBookingCore } from "@/lib/checkout/finalize-paid-booking-core";

export interface CheckoutServiceDeps {
  stripe: Stripe;
  crm: TransferCrmApiClient;
}

export interface QuoteAndPaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  quote: QuoteResponse;
  amountMinor: number;
  currency: string;
}

export interface PartnerCommercialInput {
  commissionRate: number;
  pricingModel: PartnerPricingModel;
}

export interface FinalizePaidBookingArgs {
  payload: BookingPayload;
  vehicleType: string;
  paymentIntentId: string;
}

export interface FinalizePaidBookingResult {
  booking: TransferCrmBookingResult;
  /** Present when partner Stripe checkout recorded commission metadata. */
  partnerCommissionDelta?: { slug: string; amount: number };
  partnerPricing?: PartnerCommissionPricingPayload;
}

/**
 * Coordinates TransferCRM quoting, Stripe PaymentIntents, and paid booking creation.
 * - B2C create-intent is implemented in Next (`/api/payments/create-intent`); this class remains for partner Stripe checkout.
 */
export class CheckoutService {
  constructor(private readonly deps: CheckoutServiceDeps) {}

  /**
   * Phase 1–2: firm price from CRM + Stripe PaymentIntent for Elements.
   */
  async createQuoteAndPaymentIntent(
    payload: BookingPayload,
    vehicleType: string,
    partnerCommercial?: PartnerCommercialInput,
  ): Promise<QuoteAndPaymentIntentResult & { partnerPricing?: PartnerCommissionPricingPayload }> {
    const quote = await this.deps.crm.postQuoteForBooking(payload, vehicleType);
    const price = quote.price;
    const currency = quote.currency?.trim();

    if (price === undefined || price === null || !currency) {
      throw new CheckoutQuoteIncompleteError();
    }

    const crmMajor = Number(price);
    const partnerSlug = payload.partnerBooking?.partnerRefId?.trim();
    let stripeMajor = crmMajor;
    let crmBookMajor = crmMajor;
    let partnerPricing: PartnerCommissionPricingPayload | undefined;

    if (partnerCommercial && partnerSlug) {
      partnerPricing = computePartnerCommissionBreakdown(
        crmMajor,
        partnerCommercial.commissionRate,
        partnerCommercial.pricingModel,
      );
      stripeMajor = partnerPricing.retailPrice;
      crmBookMajor = partnerPricing.crmPrice;
    }

    if (!partnerCommercial || !partnerSlug) {
      const b2c = await createB2cTransferPaymentIntent(this.deps.stripe, quote, payload, vehicleType);
      return {
        paymentIntentId: b2c.paymentIntentId,
        clientSecret: b2c.clientSecret,
        quote,
        amountMinor: b2c.amountMinor,
        currency: b2c.currency,
      };
    }

    const amountMinor = toStripeMinorUnits(stripeMajor, currency);
    const quoteDistance =
      quote.distance_km != null && Number.isFinite(Number(quote.distance_km)) ? String(Number(quote.distance_km)) : "";

    const intent = await this.deps.stripe.paymentIntents.create({
      amount: amountMinor,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        way2go_price: String(crmBookMajor),
        way2go_stripe_total: String(stripeMajor),
        way2go_currency: currency.toUpperCase(),
        way2go_vehicle: vehicleType.slice(0, 500),
        ...(payload.details.distanceKm === undefined && quoteDistance
          ? { way2go_distance_km: quoteDistance.slice(0, 32) }
          : {}),
        ...(partnerSlug ? { way2go_partner_slug: partnerSlug.slice(0, 200) } : {}),
        ...(partnerPricing
          ? {
              way2go_partner_commission: String(partnerPricing.partnerEarnings),
              way2go_partner_retail: String(partnerPricing.retailPrice),
              way2go_commission_rate: String(partnerPricing.commissionRatePercent),
              way2go_pricing_model: partnerPricing.pricingModel,
            }
          : {}),
      },
      description: `Way2Go transfer: ${payload.route.pickup.slice(0, 120)} → ${payload.route.dropoff.slice(0, 120)}`,
    });

    const clientSecret = intent.client_secret;
    if (!clientSecret) {
      throw new Error("Stripe did not return a client secret for the PaymentIntent.");
    }

    return {
      paymentIntentId: intent.id,
      clientSecret,
      quote,
      amountMinor,
      currency: currency.toUpperCase(),
      partnerPricing,
    };
  }

  /**
   * Phase 3: verify Stripe succeeded, reconcile amount, then create CRM booking.
   */
  async finalizePaidBooking(args: FinalizePaidBookingArgs): Promise<FinalizePaidBookingResult> {
    return finalizePaidBookingCore(this.deps.stripe, this.deps.crm, args);
  }
}

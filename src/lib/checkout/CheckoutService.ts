import type Stripe from "stripe";
import type { BookingPayload } from "@/lib/transfercrm/types";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";
import type { TransferCrmApiClient } from "@/lib/transfercrm/TransferCrmApiClient";
import { TransferCrmValidationFailedError } from "@/lib/transfercrm/http-core";
import {
  CheckoutAmountMismatchError,
  CheckoutPaymentMetadataError,
  CheckoutPaymentNotCompleteError,
  CheckoutQuoteIncompleteError,
  CheckoutRefundFailedError,
} from "@/lib/checkout/checkout-errors";
import { minorUnitsMatchStripeIntent, toStripeMinorUnits } from "@/lib/checkout/stripe-money";

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

export interface FinalizePaidBookingArgs {
  payload: BookingPayload;
  vehicleType: string;
  paymentIntentId: string;
}

/**
 * Coordinates TransferCRM quoting, Stripe PaymentIntents, and paid booking creation.
 * - Quote is priced by CRM; PI amount is derived from the quote (stored in PI metadata for verification).
 * - After successful charge, CRM `/book` uses the PaymentIntent id as `external_reference` (idempotent).
 * - On CRM validation failure (422), the PaymentIntent is refunded to avoid charging without a booking.
 */
export class CheckoutService {
  constructor(private readonly deps: CheckoutServiceDeps) {}

  /**
   * Phase 1–2: firm price from CRM + Stripe PaymentIntent for Elements.
   */
  async createQuoteAndPaymentIntent(payload: BookingPayload, vehicleType: string): Promise<QuoteAndPaymentIntentResult> {
    const quote = await this.deps.crm.postQuoteForBooking(payload, vehicleType);
    const price = quote.price;
    const currency = quote.currency?.trim();

    if (price === undefined || price === null || !currency) {
      throw new CheckoutQuoteIncompleteError();
    }

    const amountMinor = toStripeMinorUnits(Number(price), currency);

    const intent = await this.deps.stripe.paymentIntents.create({
      amount: amountMinor,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        way2go_price: String(price),
        way2go_currency: currency.toUpperCase(),
        way2go_vehicle: vehicleType.slice(0, 500),
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
    };
  }

  /**
   * Phase 3: verify Stripe succeeded, reconcile amount, then create CRM booking.
   * Refunds on CRM 422 so the user is not left paid without a reservation.
   */
  async finalizePaidBooking(args: FinalizePaidBookingArgs) {
    const { payload, vehicleType, paymentIntentId } = args;

    const intent = await this.deps.stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status !== "succeeded") {
      throw new CheckoutPaymentNotCompleteError(intent.status);
    }

    const meta = intent.metadata ?? {};
    const price = Number(meta.way2go_price);
    const currency = meta.way2go_currency?.trim();

    if (!Number.isFinite(price) || !currency) {
      throw new CheckoutPaymentMetadataError();
    }

    const expectedMinor = toStripeMinorUnits(price, currency);
    if (!minorUnitsMatchStripeIntent(expectedMinor, intent.amount)) {
      throw new CheckoutAmountMismatchError();
    }

    const paid = {
      externalReference: paymentIntentId,
      price,
      currency,
      vehicleType,
    };

    try {
      return await this.deps.crm.postBookForPaidCheckout(payload, paid);
    } catch (error) {
      if (error instanceof TransferCrmValidationFailedError) {
        try {
          await this.deps.stripe.refunds.create({
            payment_intent: paymentIntentId,
            metadata: { way2go_reason: "crm_validation_422" },
          });
        } catch (refundErr) {
          throw new CheckoutRefundFailedError(
            "Booking could not be completed and automatic refund failed. Please contact support.",
            refundErr,
          );
        }
        throw error;
      }
      throw error;
    }
  }
}

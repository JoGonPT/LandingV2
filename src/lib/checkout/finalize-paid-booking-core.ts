import type Stripe from "stripe";
import type { TransferCrmApiClient } from "@/lib/transfercrm/TransferCrmApiClient";
import { TransferCrmValidationFailedError } from "@/lib/transfercrm/http-core";
import {
  CheckoutAmountMismatchError,
  CheckoutPaymentMetadataError,
  CheckoutPaymentNotCompleteError,
  CheckoutRefundFailedError,
} from "@/lib/checkout/checkout-errors";
import { toStripeMinorUnits } from "@/lib/checkout/stripe-money";
import {
  computePartnerCommissionBreakdown,
  type PartnerCommissionPricingPayload,
} from "@/lib/partner/commission-pricing";
import type { TransferCrmBookingResult } from "@/lib/transfercrm/types";
import type { BookingPayload } from "@/lib/transfercrm/types";

export interface FinalizePaidBookingArgs {
  payload: BookingPayload;
  vehicleType: string;
  paymentIntentId: string;
}

export interface FinalizePaidBookingResult {
  booking: TransferCrmBookingResult;
  partnerCommissionDelta?: { slug: string; amount: number };
  partnerPricing?: PartnerCommissionPricingPayload;
}

/**
 * Ensures the PI is succeeded and `amount` (minor units) matches metadata (`way2go_stripe_total` / currency).
 * If not, do not create a CRM booking.
 */
export function assertPaymentIntentAmountMatchesMetadata(intent: Stripe.PaymentIntent): void {
  if (intent.status !== "succeeded") {
    throw new CheckoutPaymentNotCompleteError(intent.status);
  }

  const meta = intent.metadata ?? {};
  const crmPrice = Number(meta.way2go_price);
  const stripeTotal = Number(meta.way2go_stripe_total ?? meta.way2go_price);
  const currency = meta.way2go_currency?.trim();

  if (!Number.isFinite(crmPrice) || !Number.isFinite(stripeTotal) || !currency) {
    throw new CheckoutPaymentMetadataError();
  }

  const expectedAmount = toStripeMinorUnits(stripeTotal, currency);
  const charged = intent.amount;
  if (charged == null || charged !== expectedAmount) {
    throw new CheckoutAmountMismatchError();
  }
}

export async function finalizePaidBookingCore(
  stripe: Stripe,
  crm: TransferCrmApiClient,
  args: FinalizePaidBookingArgs,
): Promise<FinalizePaidBookingResult> {
  const { payload, vehicleType, paymentIntentId } = args;

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  assertPaymentIntentAmountMatchesMetadata(intent);

  const meta = intent.metadata ?? {};
  const crmPrice = Number(meta.way2go_price);
  const currency = meta.way2go_currency!.trim();

  const paid = {
    externalReference: paymentIntentId,
    price: crmPrice,
    currency,
    vehicleType,
  };

  let bookingPayload = payload;
  const fiscalName = meta.fiscal_name?.trim();
  const fiscalVat = meta.fiscal_vat?.trim();
  if (fiscalName || fiscalVat) {
    const fiscalBits = [
      fiscalName ? `Fiscal name: ${fiscalName}` : "",
      fiscalVat ? `Fiscal VAT: ${fiscalVat}` : "",
    ].filter(Boolean);
    const fiscalText = fiscalBits.join(" | ");
    bookingPayload = {
      ...bookingPayload,
      details: {
        ...bookingPayload.details,
        notes: [bookingPayload.details.notes?.trim() || "", fiscalText].filter(Boolean).join(" | ").slice(0, 2000),
      },
    };
  }
  if (payload.details.distanceKm === undefined) {
    const distRaw = meta.way2go_distance_km?.trim();
    if (distRaw) {
      const d = Number(distRaw);
      if (Number.isFinite(d)) {
        bookingPayload = {
          ...payload,
          details: { ...payload.details, distanceKm: d },
        };
      }
    }
  }

  const commission = Number(meta.way2go_partner_commission);
  const slug = meta.way2go_partner_slug?.trim();
  const partnerCommissionDelta =
    slug && Number.isFinite(commission) && commission > 0 ? { slug, amount: commission } : undefined;

  let partnerPricing: PartnerCommissionPricingPayload | undefined;
  if (meta.way2go_commission_rate && meta.way2go_pricing_model) {
    const rate = Number(meta.way2go_commission_rate);
    const model = meta.way2go_pricing_model === "NET_PRICE" ? "NET_PRICE" : "MARKUP";
    if (Number.isFinite(crmPrice) && Number.isFinite(rate)) {
      partnerPricing = computePartnerCommissionBreakdown(crmPrice, rate, model);
    }
  }

  try {
    const booking = await crm.postBookForPaidCheckout(bookingPayload, paid);
    return { booking, partnerCommissionDelta, partnerPricing };
  } catch (error) {
    if (error instanceof TransferCrmValidationFailedError) {
      try {
        await stripe.refunds.create({
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

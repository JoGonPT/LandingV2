import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { attachPartnerToPayload } from "@/lib/partner/attach-context";
import { computePartnerCommissionBreakdown, type PartnerCommissionPricingPayload } from "@/lib/partner/commission-pricing";
import { getPartnerCreditStore } from "@/lib/partner/credit/factory";
import { PartnerAuthError, requirePartnerSession } from "@/lib/partner/require-partner-session";
import { ensurePartnerCreditRow } from "@/lib/partner/sync-credit";
import { formatMoneyAmount } from "@/lib/checkout/format-money";
import { mergeQuoteDistanceIntoPayload } from "@/lib/transfercrm/booking-mappers";
import { postQuoteForBooking, submitBooking, toPublicError } from "@/lib/transfercrm/client";
import type { BookingApiSuccess } from "@/lib/transfercrm/types";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";

const Body = z.object({
  slug: z.string().min(1),
  payload: z.unknown(),
  vehicleType: z.string().min(1),
  internalReference: z.string().optional(),
  vipRequests: z.string().optional(),
});

function requestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(req: Request) {
  const rid = requestId();
  try {
    const body = Body.parse(await req.json());
    const { displayName } = await requirePartnerSession(body.slug);

    const validated = validateBookingPayload(body.payload);
    if (!validated.ok) {
      return NextResponse.json({ success: false, message: validated.message, requestId: rid }, { status: 400 });
    }

    const merged = attachPartnerToPayload(validated.data, displayName, body.slug, {
      internalReference: body.internalReference,
      vipRequests: body.vipRequests,
      paymentMethod: "account",
    });

    const vehicleType = body.vehicleType.trim();
    const quote = await postQuoteForBooking(merged, vehicleType);
    const price = quote.price;
    const currency = quote.currency?.trim();
    if (price === undefined || price === null || !currency) {
      return NextResponse.json(
        { success: false, message: "Could not determine price from TransferCRM.", requestId: rid },
        { status: 502 },
      );
    }

    if (currency.toUpperCase() !== "EUR") {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_EUR_ONLY" as const,
          message: "Pay on account is only available when the quoted currency is EUR.",
          requestId: rid,
        },
        { status: 422 },
      );
    }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json({ success: false, message: "Invalid quote amount.", requestId: rid }, { status: 502 });
    }

    const creditRow = await ensurePartnerCreditRow(body.slug);
    if (!creditRow) {
      return NextResponse.json({ success: false, message: "Unknown partner.", requestId: rid }, { status: 401 });
    }

    const store = getPartnerCreditStore();
    const reserved = await store.tryConsumeCredit(body.slug, priceNum);
    if (!reserved.ok) {
      return NextResponse.json(
        {
          success: false,
          code: "INSUFFICIENT_CREDIT" as const,
          message: "Insufficient account credit for this booking. Pay with card instead.",
          requestId: rid,
          credit: {
            limit: reserved.limit,
            currentUsage: reserved.usage,
            available: reserved.available,
          },
        },
        { status: 402 },
      );
    }

    const mergedWithDistance = mergeQuoteDistanceIntoPayload(merged, quote);
    const bookPayload = {
      ...mergedWithDistance,
      vehicleType,
      quotedPrice: { amount: priceNum, currency: currency.toUpperCase() },
    };

    let booking;
    try {
      booking = await submitBooking(bookPayload);
    } catch (e) {
      await store.releaseCredit(body.slug, priceNum);
      throw e;
    }

    const pricing = computePartnerCommissionBreakdown(priceNum, creditRow.commissionRate, creditRow.pricingModel);
    await store.incrementCommissionsEarned(body.slug, pricing.partnerEarnings);

    const curU = (booking.currency ?? currency).toUpperCase();
    const totalRetailFormatted =
      Number.isFinite(pricing.retailPrice) && curU
        ? formatMoneyAmount(pricing.retailPrice, curU, validated.data.locale)
        : "";
    const partnerEarningsFormatted =
      Number.isFinite(pricing.partnerEarnings) && curU
        ? formatMoneyAmount(pricing.partnerEarnings, curU, validated.data.locale)
        : "";

    const response: BookingApiSuccess & {
      trip: { pickup: string; dropoff: string; date: string; time: string };
      totalFormatted: string;
      totalRetailFormatted: string;
      partnerEarningsFormatted: string;
      partnerPricing: PartnerCommissionPricingPayload & { currency: string };
      billing: "monthly_account";
    } = {
      success: true,
      orderId: booking.bookingId,
      orderReference: booking.orderNumber,
      trackingUrl: booking.trackingUrl ?? undefined,
      status: booking.status,
      trip: {
        pickup: validated.data.route.pickup,
        dropoff: validated.data.route.dropoff,
        date: validated.data.route.date,
        time: validated.data.route.time,
      },
      totalFormatted: totalRetailFormatted,
      totalRetailFormatted,
      partnerEarningsFormatted,
      partnerPricing: { ...pricing, currency: curU },
      billing: "monthly_account",
    };

    return NextResponse.json(response, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ success: false, message: "Invalid body.", requestId: rid }, { status: 400 });
    }
    if (e instanceof PartnerAuthError) {
      return NextResponse.json({ success: false, message: "Unauthorized.", requestId: rid }, { status: 401 });
    }
    const pub = toPublicError(e);
    const details = pub.details as Record<string, string[]> | undefined;
    const friendly =
      pub.code === "CRM_VALIDATION_ERROR" ? firstTransferCrmValidationMessage(details) || pub.message : pub.message;
    console.error("[partner-book-account]", { rid, code: pub.code });
    const status = pub.code === "CRM_VALIDATION_ERROR" ? 422 : 502;
    return NextResponse.json({ success: false, message: friendly, requestId: rid, details: pub.details }, { status });
  }
}

import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { createCheckoutServiceFromEnv } from "@/lib/checkout/create-checkout-service";
import { formatMoneyAmount } from "@/lib/checkout/format-money";
import { toPublicCheckoutError } from "@/lib/checkout/to-public-checkout-error";
import { attachPartnerToPayload } from "@/lib/partner/attach-context";
import { getPartnerCreditStore } from "@/lib/partner/credit/factory";
import { PartnerAuthError, requirePartnerSession } from "@/lib/partner/require-partner-session";
import type { CheckoutCompleteSuccess } from "@/lib/transfercrm/types";
import { validateBookingPayload } from "@/lib/transfercrm/validation";

const Body = z.object({
  slug: z.string().min(1),
  payload: z.unknown(),
  vehicleType: z.string().min(1),
  paymentIntentId: z.string().min(1),
  internalReference: z.string().optional(),
  vipRequests: z.string().optional(),
});

function requestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPaymentIntentId(value: string): boolean {
  return value.startsWith("pi_") && value.length > 10;
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

    const vehicleType = body.vehicleType.trim();
    if (!isNonEmptyString(vehicleType)) {
      return NextResponse.json({ success: false, message: "Vehicle is required.", requestId: rid }, { status: 400 });
    }

    const paymentIntentId = body.paymentIntentId.trim();
    if (!isPaymentIntentId(paymentIntentId)) {
      return NextResponse.json(
        { success: false, message: "Invalid payment session. Please start again.", requestId: rid },
        { status: 400 },
      );
    }

    const merged = attachPartnerToPayload(validated.data, displayName, body.slug, {
      internalReference: body.internalReference,
      vipRequests: body.vipRequests,
      paymentMethod: "stripe",
    });

    const checkout = createCheckoutServiceFromEnv();
    const { booking, partnerCommissionDelta, partnerPricing } = await checkout.finalizePaidBooking({
      payload: merged,
      vehicleType,
      paymentIntentId,
    });

    if (partnerCommissionDelta) {
      const store = getPartnerCreditStore();
      await store.incrementCommissionsEarned(partnerCommissionDelta.slug, partnerCommissionDelta.amount);
    }

    const cur = (booking.currency ?? "").toUpperCase() || "EUR";
    const guestPaid =
      partnerPricing != null
        ? partnerPricing.retailPrice
        : booking.price !== undefined
          ? Number(booking.price)
          : NaN;
    const totalPaidFormatted =
      Number.isFinite(guestPaid) && cur ? formatMoneyAmount(guestPaid, cur, validated.data.locale) : "";

    const response: CheckoutCompleteSuccess = {
      success: true,
      orderId: booking.bookingId,
      orderReference: booking.orderNumber,
      trackingUrl: booking.trackingUrl,
      status: booking.status,
      trip: {
        pickup: validated.data.route.pickup,
        dropoff: validated.data.route.dropoff,
        date: validated.data.route.date,
        time: validated.data.route.time,
      },
      totalPaidFormatted,
      ...(partnerPricing
        ? {
            partnerPricing: {
              ...partnerPricing,
              currency: cur,
            },
          }
        : {}),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ success: false, message: "Invalid body.", requestId: rid }, { status: 400 });
    }
    if (e instanceof PartnerAuthError) {
      return NextResponse.json({ success: false, message: "Unauthorized.", requestId: rid }, { status: 401 });
    }
    const pub = toPublicCheckoutError(e);
    console.error("[partner-checkout-complete]", { rid, code: pub.code });
    return NextResponse.json(
      { success: false as const, code: pub.code, message: pub.message, requestId: rid, details: pub.details },
      { status: pub.status >= 400 && pub.status < 600 ? pub.status : 500 },
    );
  }
}

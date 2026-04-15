import { NextResponse } from "next/server";
import { createCheckoutServiceFromEnv } from "@/lib/checkout/create-checkout-service";
import { formatMoneyAmount } from "@/lib/checkout/format-money";
import { toPublicCheckoutError } from "@/lib/checkout/to-public-checkout-error";
import type { CheckoutCompleteSuccess } from "@/lib/transfercrm/types";
import { validateBookingPayload } from "@/lib/transfercrm/validation";

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPaymentIntentId(value: string): boolean {
  return value.startsWith("pi_") && value.length > 10;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const body = (await request.json()) as {
      payload?: unknown;
      vehicleType?: unknown;
      paymentIntentId?: unknown;
    };

    const validated = validateBookingPayload(body.payload);
    if (!validated.ok) {
      return NextResponse.json(
        { success: false as const, code: "VALIDATION_ERROR", message: validated.message, requestId },
        { status: 400 },
      );
    }

    if (!isNonEmptyString(body.vehicleType)) {
      return NextResponse.json(
        { success: false as const, code: "VEHICLE_REQUIRED", message: "Please choose a vehicle.", requestId },
        { status: 400 },
      );
    }

    const paymentIntentId = body.paymentIntentId;
    if (!isNonEmptyString(paymentIntentId) || !isPaymentIntentId(paymentIntentId.trim())) {
      return NextResponse.json(
        { success: false as const, code: "INVALID_PAYMENT", message: "Invalid payment session. Please start again.", requestId },
        { status: 400 },
      );
    }

    const vehicleType = String(body.vehicleType).trim();
    const checkout = createCheckoutServiceFromEnv();
    const booking = await checkout.finalizePaidBooking({
      payload: validated.data,
      vehicleType,
      paymentIntentId: paymentIntentId.trim(),
    });

    const priceNum = booking.price !== undefined ? Number(booking.price) : NaN;
    const totalPaidFormatted =
      Number.isFinite(priceNum) && booking.currency
        ? formatMoneyAmount(priceNum, booking.currency, validated.data.locale)
        : "";

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
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const pub = toPublicCheckoutError(error);
    const details = pub.details;
    console.error("[checkout-complete]", { requestId, code: pub.code, message: pub.message });
    return NextResponse.json(
      { success: false as const, code: pub.code, message: pub.message, requestId, details },
      { status: pub.status >= 400 && pub.status < 600 ? pub.status : 500 },
    );
  }
}

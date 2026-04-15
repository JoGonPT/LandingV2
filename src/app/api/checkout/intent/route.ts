import { NextResponse } from "next/server";
import { createCheckoutServiceFromEnv } from "@/lib/checkout/create-checkout-service";
import { toPublicCheckoutError } from "@/lib/checkout/to-public-checkout-error";
import { validateBookingPayload } from "@/lib/transfercrm/validation";

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const body = (await request.json()) as { payload?: unknown; vehicleType?: unknown };
    const validated = validateBookingPayload(body.payload);
    if (!validated.ok) {
      return NextResponse.json(
        { success: false as const, code: "VALIDATION_ERROR", message: validated.message, requestId },
        { status: 400 },
      );
    }

    if (validated.data.details.distanceKm === undefined) {
      return NextResponse.json(
        {
          success: false as const,
          code: "DISTANCE_REQUIRED",
          message: "Trip distance (km) is required to confirm your price and pay online.",
          requestId,
        },
        { status: 400 },
      );
    }

    if (!isNonEmptyString(body.vehicleType)) {
      return NextResponse.json(
        { success: false as const, code: "VEHICLE_REQUIRED", message: "Please choose a vehicle.", requestId },
        { status: 400 },
      );
    }

    const vehicleType = String(body.vehicleType).trim();
    const checkout = createCheckoutServiceFromEnv();
    const result = await checkout.createQuoteAndPaymentIntent(validated.data, vehicleType);

    return NextResponse.json(
      {
        success: true as const,
        requestId,
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        quote: result.quote,
        currency: result.currency,
        amountMinor: result.amountMinor,
      },
      { status: 200 },
    );
  } catch (error) {
    const pub = toPublicCheckoutError(error);
    console.error("[checkout-intent]", { requestId, code: pub.code, message: pub.message });
    return NextResponse.json(
      { success: false as const, code: pub.code, message: pub.message, requestId, details: pub.details },
      { status: pub.status },
    );
  }
}

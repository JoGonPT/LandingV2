import { NextResponse } from "next/server";
import { PaymentsAppHttpError, paymentsCreatePendingBooking } from "@/lib/payments/payments-app-service";
import { IS_MANUAL_PAYMENT } from "@/lib/payments/payment-flags";

/** B2C manual payment mode: confirms reservation immediately as pending payment. */
export async function POST(request: Request) {
  if (!IS_MANUAL_PAYMENT) {
    return NextResponse.json(
      {
        success: false as const,
        code: "DEPRECATED",
        message:
          "This endpoint is no longer used for public checkout. Payment confirmation is processed automatically after Stripe succeeds.",
      },
      { status: 410 },
    );
  }

  const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, code: "BAD_REQUEST", message: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await paymentsCreatePendingBooking(body, idempotencyKey);
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof PaymentsAppHttpError) {
      return NextResponse.json(e.body, { status: e.status });
    }
    console.error("[api/checkout/complete]", e);
    return NextResponse.json(
      { success: false, code: "INTERNAL_ERROR", message: "Unexpected error creating pending booking." },
      { status: 500 },
    );
  }
}

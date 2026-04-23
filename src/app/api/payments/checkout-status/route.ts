import { NextResponse } from "next/server";

import { PaymentsAppHttpError, paymentsGetCheckoutStatus } from "@/lib/payments/payments-app-service";

export async function GET(request: Request) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const pi = new URL(request.url).searchParams.get("payment_intent")?.trim();
  if (!pi || !pi.startsWith("pi_")) {
    return NextResponse.json(
      { success: false, code: "BAD_REQUEST", message: "payment_intent required", requestId },
      { status: 400 },
    );
  }

  try {
    const result = await paymentsGetCheckoutStatus(pi);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof PaymentsAppHttpError) {
      return NextResponse.json(e.body, { status: e.status });
    }
    console.error("[api/payments/checkout-status]", e);
    return NextResponse.json(
      { success: false, code: "INTERNAL_ERROR", message: "Unexpected error.", requestId },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { PaymentsAppHttpError, paymentsCreateIntent } from "@/lib/payments/payments-app-service";

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, code: "BAD_REQUEST", message: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await paymentsCreateIntent(body, idempotencyKey);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof PaymentsAppHttpError) {
      return NextResponse.json(e.body, { status: e.status });
    }
    console.error("[api/payments/create-intent]", e);
    return NextResponse.json(
      { success: false, code: "INTERNAL_ERROR", message: "Unexpected error creating payment intent." },
      { status: 500 },
    );
  }
}

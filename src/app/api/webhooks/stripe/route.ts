import { NextResponse } from "next/server";

import { PaymentsAppHttpError, paymentsHandleStripeWebhook } from "@/lib/payments/payments-app-service";

export async function POST(request: Request) {
  const raw = await request.text();
  const sig = request.headers.get("stripe-signature") ?? undefined;
  try {
    const result = await paymentsHandleStripeWebhook(raw, sig);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof PaymentsAppHttpError) {
      if (e.body.code === "WEBHOOK_CONFIG") {
        return NextResponse.json({ received: false, message: e.body.message }, { status: e.status });
      }
      return NextResponse.json(e.body, { status: e.status });
    }
    console.error("[api/webhooks/stripe]", e);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}

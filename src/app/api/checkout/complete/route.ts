import { NextResponse } from "next/server";

/**
 * B2C booking confirmation runs in Nest via Stripe webhook + GET /api/checkout/status.
 * Partner Stripe checkout still uses /api/partner/checkout/complete.
 */
export async function POST() {
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

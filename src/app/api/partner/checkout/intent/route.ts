import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { createCheckoutServiceFromEnv } from "@/lib/checkout/create-checkout-service";
import { toPublicCheckoutError } from "@/lib/checkout/to-public-checkout-error";
import { attachPartnerToPayload } from "@/lib/partner/attach-context";
import { getPartnerCreditStore } from "@/lib/partner/credit/factory";
import { PartnerAuthError, requirePartnerSession } from "@/lib/partner/require-partner-session";
import { ensurePartnerCreditRow } from "@/lib/partner/sync-credit";
import { validateBookingPayload } from "@/lib/transfercrm/validation";

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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

    const merged = attachPartnerToPayload(validated.data, displayName, body.slug, {
      internalReference: body.internalReference,
      vipRequests: body.vipRequests,
      paymentMethod: "stripe",
    });

    await ensurePartnerCreditRow(body.slug);
    const store = getPartnerCreditStore();
    const acc = await store.getAccount(body.slug);
    if (!acc) {
      return NextResponse.json({ success: false, message: "Partner account not found.", requestId: rid }, { status: 404 });
    }

    const checkout = createCheckoutServiceFromEnv();
    const result = await checkout.createQuoteAndPaymentIntent(merged, vehicleType, {
      commissionRate: acc.commissionRate,
      pricingModel: acc.pricingModel,
    });

    return NextResponse.json({
      success: true as const,
      requestId: rid,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      quote: result.quote,
      currency: result.currency,
      amountMinor: result.amountMinor,
      partnerPricing: result.partnerPricing
        ? {
            ...result.partnerPricing,
            currency: result.currency,
          }
        : undefined,
    });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ success: false, message: "Invalid body.", requestId: rid }, { status: 400 });
    }
    if (e instanceof PartnerAuthError) {
      return NextResponse.json({ success: false, message: "Unauthorized.", requestId: rid }, { status: 401 });
    }
    const pub = toPublicCheckoutError(e);
    console.error("[partner-checkout-intent]", { rid, code: pub.code });
    return NextResponse.json(
      { success: false as const, code: pub.code, message: pub.message, requestId: rid, details: pub.details },
      { status: pub.status },
    );
  }
}

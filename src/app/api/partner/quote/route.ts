import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { attachPartnerToPayload } from "@/lib/partner/attach-context";
import { computePartnerCommissionBreakdown } from "@/lib/partner/commission-pricing";
import { getPartnerCreditStore } from "@/lib/partner/credit/factory";
import { PartnerAuthError, requirePartnerSession } from "@/lib/partner/require-partner-session";
import { ensurePartnerCreditRow } from "@/lib/partner/sync-credit";
import { postQuoteForBooking, toPublicError } from "@/lib/transfercrm/client";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";

const Body = z.object({
  slug: z.string().min(1),
  payload: z.unknown(),
  vehicleType: z.string().optional(),
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
    });

    const quote = await postQuoteForBooking(merged, body.vehicleType);

    await ensurePartnerCreditRow(body.slug);
    const store = getPartnerCreditStore();
    const acc = await store.getAccount(body.slug);

    const price = quote.price;
    const currency = quote.currency?.trim();
    const partnerPricing =
      acc && price !== undefined && price !== null && currency
        ? {
            ...computePartnerCommissionBreakdown(Number(price), acc.commissionRate, acc.pricingModel),
            currency: currency.toUpperCase(),
          }
        : undefined;

    return NextResponse.json({ success: true as const, data: quote, partnerPricing, requestId: rid });
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
    console.error("[partner-quote]", { rid, code: pub.code });
    const status = pub.code === "CRM_VALIDATION_ERROR" ? 422 : 502;
    return NextResponse.json({ success: false, message: friendly, requestId: rid, details: pub.details }, { status });
  }
}

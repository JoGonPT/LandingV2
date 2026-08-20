import { NextResponse } from "next/server";
import { z } from "zod";

import { computePartnerCommissionBreakdown } from "@/lib/partner/commission-pricing";
import { getPartnerCreditStore } from "@/lib/partner/credit/factory";
import { PartnerAuthError, requirePartnerSession } from "@/lib/partner/require-partner-session";
import { ensurePartnerCreditRow } from "@/lib/partner/sync-credit";
import { getVehicleOptions, toPublicError } from "@/lib/transfercrm/client";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";

const Body = z.object({
  slug: z.string().min(1),
  payload: z.unknown(),
});

function requestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(req: Request) {
  const rid = requestId();
  try {
    let body: z.infer<typeof Body>;
    try {
      body = Body.parse(await req.json());
    } catch {
      return NextResponse.json({ success: false, message: "Invalid body.", requestId: rid }, { status: 400 });
    }

    await requirePartnerSession(body.slug);

    const validated = validateBookingPayload(body.payload);
    if (!validated.ok) {
      return NextResponse.json({ success: false, message: validated.message, requestId: rid }, { status: 400 });
    }

    const result = await getVehicleOptions(validated.data);

    await ensurePartnerCreditRow(body.slug);
    const store = getPartnerCreditStore();
    const acc = await store.getAccount(body.slug);

    const aplicarMarkup = <T extends { estimatedPrice?: number }>(item: T): T => {
      if (!acc || acc.pricingModel !== "MARKUP" || item.estimatedPrice === undefined) return item;
      const b = computePartnerCommissionBreakdown(item.estimatedPrice, acc.commissionRate, acc.pricingModel);
      return { ...item, guestRetailPrice: b.retailPrice };
    };

    const vehicles = result.vehicleOptions.map(aplicarMarkup);
    // As classes vêm do catálogo do CRM e são a fonte de verdade do preço:
    // `vehicles` (categoria grosseira) não distingue standard de premium.
    const vehicleClasses = result.vehicleClasses.map(aplicarMarkup);

    return NextResponse.json({
      success: true as const,
      requestId: rid,
      available: result.available,
      vehicles,
      vehicleClasses,
      pickupLocation: result.pickupLocation,
      dropoffLocation: result.dropoffLocation,
      pickupDate: result.pickupDate,
      commercial: acc
        ? { commissionRate: acc.commissionRate, pricingModel: acc.pricingModel }
        : undefined,
    });
  } catch (e) {
    if (e instanceof PartnerAuthError) {
      return NextResponse.json({ success: false, message: "Unauthorized.", requestId: rid }, { status: 401 });
    }
    const pub = toPublicError(e);
    const details = pub.details as Record<string, string[]> | undefined;
    const friendly =
      pub.code === "CRM_VALIDATION_ERROR" ? firstTransferCrmValidationMessage(details) || pub.message : pub.message;
    console.error("[partner-vehicles]", { rid, code: pub.code });
    const status = pub.code === "CRM_VALIDATION_ERROR" ? 422 : 502;
    return NextResponse.json({ success: false, message: friendly, requestId: rid, details: pub.details }, { status });
  }
}

import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getPartnerCreditStore } from "@/lib/partner/credit/factory";
import { PartnerAuthError, requirePartnerSession } from "@/lib/partner/require-partner-session";
import { ensurePartnerCreditRow } from "@/lib/partner/sync-credit";

const Query = z.object({
  slug: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { slug } = Query.parse({ slug: url.searchParams.get("slug") ?? "" });
    await requirePartnerSession(slug);

    await ensurePartnerCreditRow(slug);
    const store = getPartnerCreditStore();
    const account = await store.getAccount(slug);
    if (!account) {
      return NextResponse.json({ success: false, message: "Credit account not found." }, { status: 404 });
    }

    const available = Math.max(0, account.creditLimit - account.currentUsage);
    return NextResponse.json({
      success: true as const,
      credit: {
        creditLimit: account.creditLimit,
        currentUsage: account.currentUsage,
        available,
        currency: "EUR",
        commissionRate: account.commissionRate,
        pricingModel: account.pricingModel,
        totalCommissionsEarned: account.totalCommissionsEarned,
      },
    });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ success: false, message: "Invalid query." }, { status: 400 });
    }
    if (e instanceof PartnerAuthError) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }
    throw e;
  }
}

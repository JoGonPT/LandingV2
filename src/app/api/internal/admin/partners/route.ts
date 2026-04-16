import { NextResponse } from "next/server";

import { MasterAdminAuthError, requireMasterAdminSession } from "@/lib/internal-admin/require-master-admin";
import { getAllPartners } from "@/lib/partner/config";
import { getPartnerCreditStore, getPartnerDefaultCreditLimit } from "@/lib/partner/credit/factory";

export async function GET() {
  try {
    await requireMasterAdminSession();
  } catch (e) {
    if (e instanceof MasterAdminAuthError) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
    throw e;
  }

  const partners = getAllPartners();
  const store = getPartnerCreditStore();
  const defaultLimit = getPartnerDefaultCreditLimit();

  const data = await Promise.all(
    partners.map(async (p) => {
      const acc = await store.ensureAccount(p.slug, p.displayName, defaultLimit);
      const available = Math.max(0, acc.creditLimit - acc.currentUsage);
      return {
        slug: p.slug,
        displayName: p.displayName,
        partnerKind: p.partnerKind ?? "Partner",
        creditLimit: acc.creditLimit,
        currentUsage: acc.currentUsage,
        available,
        commissionRate: acc.commissionRate,
        pricingModel: acc.pricingModel,
        totalCommissionsEarned: acc.totalCommissionsEarned,
      };
    }),
  );

  return NextResponse.json({ ok: true as const, data });
}

import { NextResponse } from "next/server";

import { MasterAdminAuthError, requireMasterAdminSession } from "@/lib/internal-admin/require-master-admin";
import { getPartnerBySlug } from "@/lib/partner/config";
import { getPartnerCreditStore, getPartnerDefaultCreditLimit } from "@/lib/partner/credit/factory";

export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    await requireMasterAdminSession();
  } catch (e) {
    if (e instanceof MasterAdminAuthError) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
    throw e;
  }

  const { slug: rawSlug } = await ctx.params;
  const slug = rawSlug.trim();
  const partner = getPartnerBySlug(slug);
  if (!partner) {
    return NextResponse.json({ ok: false, message: "Unknown partner." }, { status: 404 });
  }

  const store = getPartnerCreditStore();
  await store.ensureAccount(partner.slug, partner.displayName, getPartnerDefaultCreditLimit());
  const acc = await store.resetUsage(partner.slug);
  const available = Math.max(0, acc.creditLimit - acc.currentUsage);

  return NextResponse.json({
    ok: true as const,
    partner: {
      slug: acc.slug,
      displayName: acc.displayName,
      creditLimit: acc.creditLimit,
      currentUsage: acc.currentUsage,
      available,
    },
  });
}

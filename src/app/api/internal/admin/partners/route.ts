import { NextResponse } from "next/server";

import { MasterAdminAuthError, requireMasterAdminSession } from "@/lib/internal-admin/require-master-admin";
import { getPartnerCreditStore, getPartnerDefaultCreditLimit } from "@/lib/partner/credit/factory";
import { PartnerService } from "@/lib/partner/partner.service";

export async function GET() {
  try {
    await requireMasterAdminSession();
  } catch (e) {
    if (e instanceof MasterAdminAuthError) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
    throw e;
  }

  const service = new PartnerService();
  let partners = [] as Awaited<ReturnType<PartnerService["listPartners"]>>;
  try {
    partners = await service.listPartners();
  } catch {
    partners = [];
  }
  const store = getPartnerCreditStore();
  const defaultLimit = getPartnerDefaultCreditLimit();

  const data = await Promise.all(
    partners.map(async (p) => {
      const acc = await store.ensureAccount(p.slug, p.display_name || p.name, defaultLimit);
      const available = Math.max(0, acc.creditLimit - acc.currentUsage);
      return {
        id: p.id,
        slug: p.slug,
        displayName: p.display_name || p.name,
        token: p.token,
        partnerKind: p.partner_kind ?? "Partner",
        isActive: p.is_active,
        commissionPercentage: p.commission_percentage,
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

export async function POST(req: Request) {
  try {
    await requireMasterAdminSession();
  } catch (e) {
    if (e instanceof MasterAdminAuthError) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
    throw e;
  }

  let body: {
    slug?: string;
    name?: string;
    token?: string;
    commissionPercentage?: number;
    isActive?: boolean;
    partnerKind?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });
  }

  const slug = String(body.slug ?? "").trim();
  const name = String(body.name ?? "").trim();
  const token = String(body.token ?? "").trim();
  const commission = Number(body.commissionPercentage ?? 0);
  const isActive = body.isActive ?? true;
  if (!slug || !name || !token) {
    return NextResponse.json({ ok: false, message: "slug, name and token are required." }, { status: 400 });
  }
  if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
    return NextResponse.json({ ok: false, message: "commissionPercentage must be between 0 and 100." }, { status: 400 });
  }

  const service = new PartnerService();
  try {
    const created = await service.createPartner({
      slug,
      name,
      token,
      commissionPercentage: commission,
      isActive: Boolean(isActive),
      partnerKind: body.partnerKind,
    });
    return NextResponse.json({
      ok: true as const,
      partner: {
        id: created.id,
        slug: created.slug,
        name: created.name,
        token: created.token,
        commissionPercentage: created.commission_percentage,
        isActive: created.is_active,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to create partner." },
      { status: 400 },
    );
  }
}

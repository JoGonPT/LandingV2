import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { MasterAdminAuthError, requireMasterAdminSession } from "@/lib/internal-admin/require-master-admin";
import type { PartnerPricingModel } from "@/lib/partner/commission-pricing";
import { getPartnerBySlug } from "@/lib/partner/config";
import { getPartnerCreditStore, getPartnerDefaultCreditLimit } from "@/lib/partner/credit/factory";
import { PartnerService } from "@/lib/partner/partner.service";

const Body = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    token: z.string().trim().min(4).max(256).optional(),
    commissionPercentage: z.number().finite().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
    creditLimit: z.number().finite().nonnegative().optional(),
    commissionRate: z.number().finite().min(0).max(100).optional(),
    pricingModel: z.enum(["MARKUP", "NET_PRICE"]).optional(),
  })
  .strict()
  .refine(
    (d) =>
      d.name !== undefined ||
      d.token !== undefined ||
      d.commissionPercentage !== undefined ||
      d.isActive !== undefined ||
      d.creditLimit !== undefined ||
      d.commissionRate !== undefined ||
      d.pricingModel !== undefined,
    {
      message:
        "At least one of name, token, commissionPercentage, isActive, creditLimit, commissionRate, or pricingModel is required.",
    },
  );

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
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
  const partner = await getPartnerBySlug(slug);
  if (!partner) {
    return NextResponse.json({ ok: false, message: "Unknown partner." }, { status: 404 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });
    }
    throw e;
  }

  const store = getPartnerCreditStore();
  await store.ensureAccount(partner.slug, partner.displayName, getPartnerDefaultCreditLimit());

  const patch: {
    creditLimit?: number;
    commissionRate?: number;
    pricingModel?: PartnerPricingModel;
  } = {};
  if (body.creditLimit !== undefined) patch.creditLimit = body.creditLimit;
  if (body.commissionRate !== undefined) patch.commissionRate = body.commissionRate;
  if (body.pricingModel !== undefined) patch.pricingModel = body.pricingModel;

  const partnerService = new PartnerService();
  const commissionPct =
    body.commissionPercentage !== undefined
      ? body.commissionPercentage
      : body.commissionRate !== undefined
        ? body.commissionRate
        : undefined;

  if (
    body.name !== undefined ||
    body.token !== undefined ||
    body.isActive !== undefined ||
    commissionPct !== undefined
  ) {
    await partnerService.patchPartner(partner.slug, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.token !== undefined ? { token: body.token } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(commissionPct !== undefined ? { commissionPercentage: commissionPct } : {}),
    });
  }

  if (commissionPct !== undefined) {
    patch.commissionRate = commissionPct;
  }

  const acc = await store.updatePartnerTerms(partner.slug, patch);
  const available = Math.max(0, acc.creditLimit - acc.currentUsage);
  const refreshedPartner = await partnerService.getPartnerBySlug(partner.slug);

  return NextResponse.json({
    ok: true as const,
    partner: {
      slug: acc.slug,
      id: refreshedPartner?.id,
      name: refreshedPartner?.name ?? acc.displayName,
      displayName: refreshedPartner?.display_name ?? acc.displayName,
      token: refreshedPartner?.token,
      isActive: refreshedPartner?.is_active ?? true,
      commissionPercentage: refreshedPartner?.commission_percentage ?? acc.commissionRate,
      creditLimit: acc.creditLimit,
      currentUsage: acc.currentUsage,
      available,
      commissionRate: acc.commissionRate,
      pricingModel: acc.pricingModel,
      totalCommissionsEarned: acc.totalCommissionsEarned,
    },
  });
}

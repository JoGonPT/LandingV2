import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { MasterAdminAuthError, requireMasterAdminSession } from "@/lib/internal-admin/require-master-admin";
import type { PartnerPricingModel } from "@/lib/partner/commission-pricing";
import { getPartnerBySlug } from "@/lib/partner/config";
import { getPartnerCreditStore, getPartnerDefaultCreditLimit } from "@/lib/partner/credit/factory";
import { PartnerService } from "@/lib/partner/partner.service";

const Body = z
  .object({
    creditLimit: z.number().finite().nonnegative().optional(),
    commissionRate: z.number().finite().min(0).max(100).optional(),
    pricingModel: z.enum(["MARKUP", "NET_PRICE"]).optional(),
  })
  .strict()
  .refine((d) => d.creditLimit !== undefined || d.commissionRate !== undefined || d.pricingModel !== undefined, {
    message: "At least one of creditLimit, commissionRate, or pricingModel is required.",
  });

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
  if (body.commissionRate !== undefined) {
    await partnerService.patchPartner(partner.slug, {
      commissionPercentage: body.commissionRate,
    });
  }

  const acc = await store.updatePartnerTerms(partner.slug, patch);
  const available = Math.max(0, acc.creditLimit - acc.currentUsage);

  return NextResponse.json({
    ok: true as const,
    partner: {
      slug: acc.slug,
      displayName: acc.displayName,
      creditLimit: acc.creditLimit,
      currentUsage: acc.currentUsage,
      available,
      commissionRate: acc.commissionRate,
      pricingModel: acc.pricingModel,
      totalCommissionsEarned: acc.totalCommissionsEarned,
    },
  });
}

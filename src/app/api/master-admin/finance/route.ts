import { NextResponse } from "next/server";

import { MasterAdminAuthError, requireMasterAdminSession } from "@/lib/internal-admin/require-master-admin";
import { bookingRowIsPayOnAccount, bookingRowMatchesPartner, bookingSortKeyDesc, normalizePartnerBookingRow } from "@/lib/partner/bookings-list";
import { getAllPartners } from "@/lib/partner/config";
import { getPartnerCreditStore, getPartnerDefaultCreditLimit } from "@/lib/partner/credit/factory";
import { normalizeBookingsList } from "@/lib/drivers/booking-json";
import { buildTransferCrmBookingUrl } from "@/lib/transfercrm/booking-deep-link";
import { createTransferCrmClientFromEnv } from "@/lib/transfercrm/TransferCrmApiClient";

export async function GET() {
  try {
    await requireMasterAdminSession();
  } catch (e) {
    if (e instanceof MasterAdminAuthError) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
    throw e;
  }

  const partners = await getAllPartners();
  const store = getPartnerCreditStore();
  const defaultLimit = getPartnerDefaultCreditLimit();

  let allBookings: unknown[] = [];
  try {
    const client = createTransferCrmClientFromEnv();
    const raw = await client.listBookings();
    allBookings = normalizeBookingsList(raw);
  } catch (err) {
    console.error("[master-admin-finance] TransferCRM listBookings failed", err);
  }

  let totalOutstandingEur = 0;
  const data = await Promise.all(
    partners.map(async (p) => {
      const acc = await store.ensureAccount(p.slug, p.displayName, defaultLimit);
      totalOutstandingEur += acc.currentUsage;

      const mine = allBookings.filter((r) => bookingRowMatchesPartner(r, p.slug, p.displayName));
      const onAccount = mine.filter((r) => bookingRowIsPayOnAccount(r));
      const sorted = [...onAccount].sort((a, b) => bookingSortKeyDesc(b) - bookingSortKeyDesc(a));
      const recentBookings = sorted
        .slice(0, 10)
        .map((raw) => {
          const n = normalizePartnerBookingRow(raw);
          if (!n) return null;
          return {
            id: n.id,
            orderNumber: n.orderNumber,
            status: n.status,
            pickupDate: n.pickupDate,
            price: n.price,
            currency: n.currency,
            crmUrl: buildTransferCrmBookingUrl(n.id),
          };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

      const pctUsed = acc.creditLimit > 0 ? Math.min(100, (acc.currentUsage / acc.creditLimit) * 100) : 0;
      const alert = acc.creditLimit > 0 && acc.currentUsage / acc.creditLimit >= 0.9;

      return {
        slug: p.slug,
        displayName: p.displayName,
        partnerKind: p.partnerKind ?? "Partner",
        creditLimit: acc.creditLimit,
        currentUsage: acc.currentUsage,
        available: Math.max(0, acc.creditLimit - acc.currentUsage),
        pctUsed,
        alert,
        commissionRate: acc.commissionRate,
        pricingModel: acc.pricingModel,
        totalCommissionsEarned: acc.totalCommissionsEarned,
        recentBookings,
      };
    }),
  );

  return NextResponse.json({
    ok: true as const,
    summary: {
      totalOutstandingEur,
      partnerCount: partners.length,
      currency: "EUR",
    },
    partners: data,
  });
}

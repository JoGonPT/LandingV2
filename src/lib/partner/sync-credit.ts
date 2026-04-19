import { getPartnerBySlug } from "@/lib/partner/config";
import { getPartnerCreditStore, getPartnerDefaultCreditLimit } from "@/lib/partner/credit/factory";
import type { PartnerCreditAccount } from "@/lib/partner/credit/types";

export async function ensurePartnerCreditRow(slug: string): Promise<PartnerCreditAccount | null> {
  const p = await getPartnerBySlug(slug);
  if (!p) return null;
  const store = getPartnerCreditStore();
  return store.ensureAccount(slug, p.displayName, getPartnerDefaultCreditLimit());
}

import type { PartnerPricingModel } from "@/lib/partner/commission-pricing";

export interface PartnerCreditAccount {
  slug: string;
  displayName: string;
  creditLimit: number;
  currentUsage: number;
  /** Commission percentage 0–100 (applied to CRM quote). */
  commissionRate: number;
  pricingModel: PartnerPricingModel;
  /** Cumulative partner earnings recorded on completed bookings (EUR). */
  totalCommissionsEarned: number;
}

export interface PartnerCreditStore {
  getAccount(slug: string): Promise<PartnerCreditAccount | null>;
  ensureAccount(slug: string, displayName: string, defaultLimit: number): Promise<PartnerCreditAccount>;
  setCreditLimit(slug: string, limit: number): Promise<PartnerCreditAccount>;
  /** Update credit limit, commission %, and/or pricing model (omitted fields unchanged). */
  updatePartnerTerms(
    slug: string,
    patch: { creditLimit?: number; commissionRate?: number; pricingModel?: PartnerPricingModel },
  ): Promise<PartnerCreditAccount>;
  resetUsage(slug: string): Promise<PartnerCreditAccount>;
  incrementCommissionsEarned(slug: string, delta: number): Promise<PartnerCreditAccount>;
  /** Atomically increase usage if within limit. */
  tryConsumeCredit(slug: string, amount: number): Promise<
    { ok: true; account: PartnerCreditAccount } | { ok: false; available: number; limit: number; usage: number }
  >;
  /** Roll back usage after a failed booking (best-effort). */
  releaseCredit(slug: string, amount: number): Promise<PartnerCreditAccount>;
}

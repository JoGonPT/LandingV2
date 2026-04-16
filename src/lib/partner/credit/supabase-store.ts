import { parsePartnerPricingModel, type PartnerPricingModel } from "@/lib/partner/commission-pricing";
import type { PartnerCreditAccount, PartnerCreditStore } from "@/lib/partner/credit/types";

type PartnersRow = {
  display_name: string;
  credit_limit: string | number;
  current_usage: string | number;
  commission_rate?: string | number | null;
  pricing_model?: string | null;
  total_commissions_earned?: string | number | null;
};

/**
 * Supabase table `public.partners` (see supabase/migrations).
 */
export class SupabasePartnerCreditStore implements PartnerCreditStore {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceKey: string,
  ) {}

  private headers(extra?: Record<string, string>) {
    return {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  private rowToAccount(slug: string, row: PartnersRow): PartnerCreditAccount {
    return {
      slug,
      displayName: row.display_name,
      creditLimit: Number(row.credit_limit),
      currentUsage: Number(row.current_usage),
      commissionRate: row.commission_rate != null ? Number(row.commission_rate) : 0,
      pricingModel: parsePartnerPricingModel(row.pricing_model ?? undefined),
      totalCommissionsEarned: row.total_commissions_earned != null ? Number(row.total_commissions_earned) : 0,
    };
  }

  async getAccount(slug: string): Promise<PartnerCreditAccount | null> {
    const url = `${this.baseUrl}/rest/v1/partners?slug=eq.${encodeURIComponent(slug)}&select=*`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) return null;
    const rows = (await res.json()) as PartnersRow[];
    if (!rows?.length) return null;
    return this.rowToAccount(slug, rows[0]);
  }

  async ensureAccount(slug: string, displayName: string, defaultLimit: number): Promise<PartnerCreditAccount> {
    const existing = await this.getAccount(slug);
    if (existing) {
      if (existing.displayName !== displayName) {
        await fetch(`${this.baseUrl}/rest/v1/partners?slug=eq.${encodeURIComponent(slug)}`, {
          method: "PATCH",
          headers: this.headers({ Prefer: "return=representation" }),
          body: JSON.stringify({ display_name: displayName, updated_at: new Date().toISOString() }),
        });
        return { ...existing, displayName };
      }
      return existing;
    }
    const res = await fetch(`${this.baseUrl}/rest/v1/partners`, {
      method: "POST",
      headers: this.headers({ Prefer: "return=representation,resolution=merge-duplicates" }),
      body: JSON.stringify({
        slug,
        display_name: displayName,
        partner_kind: "Partner",
        credit_limit: defaultLimit,
        current_usage: 0,
        commission_rate: 0,
        pricing_model: "MARKUP",
        total_commissions_earned: 0,
      }),
    });
    if (!res.ok) {
      const again = await this.getAccount(slug);
      if (again) return again;
      throw new Error("Failed to create partner row in Supabase.");
    }
    const created = (await res.json()) as PartnersRow[];
    if (created?.[0]) return this.rowToAccount(slug, created[0]);
    const refetch = await this.getAccount(slug);
    if (refetch) return refetch;
    throw new Error("Partner row missing after insert.");
  }

  async setCreditLimit(slug: string, limit: number): Promise<PartnerCreditAccount> {
    return this.updatePartnerTerms(slug, { creditLimit: limit });
  }

  async updatePartnerTerms(
    slug: string,
    patch: { creditLimit?: number; commissionRate?: number; pricingModel?: PartnerPricingModel },
  ): Promise<PartnerCreditAccount> {
    const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.creditLimit !== undefined) body.credit_limit = Math.max(0, patch.creditLimit);
    if (patch.commissionRate !== undefined) body.commission_rate = Math.max(0, Math.min(100, patch.commissionRate));
    if (patch.pricingModel !== undefined) body.pricing_model = patch.pricingModel;

    const res = await fetch(`${this.baseUrl}/rest/v1/partners?slug=eq.${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: this.headers({ Prefer: "return=representation" }),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to update partner terms.");
    const rows = (await res.json()) as PartnersRow[];
    if (!rows?.[0]) throw new Error("Partner not found.");
    return this.rowToAccount(slug, rows[0]);
  }

  async resetUsage(slug: string): Promise<PartnerCreditAccount> {
    const res = await fetch(`${this.baseUrl}/rest/v1/partners?slug=eq.${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: this.headers({ Prefer: "return=representation" }),
      body: JSON.stringify({ current_usage: 0, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error("Failed to reset usage.");
    const rows = (await res.json()) as PartnersRow[];
    if (!rows?.[0]) throw new Error("Partner not found.");
    return this.rowToAccount(slug, rows[0]);
  }

  async incrementCommissionsEarned(slug: string, delta: number): Promise<PartnerCreditAccount> {
    if (!Number.isFinite(delta) || delta <= 0) {
      const a = await this.getAccount(slug);
      if (!a) throw new Error(`Partner ${slug} not found.`);
      return a;
    }
    const cur = await this.getAccount(slug);
    if (!cur) throw new Error(`Partner ${slug} not found.`);
    const next = cur.totalCommissionsEarned + delta;
    const res = await fetch(`${this.baseUrl}/rest/v1/partners?slug=eq.${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: this.headers({ Prefer: "return=representation" }),
      body: JSON.stringify({ total_commissions_earned: next, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error("Failed to increment commissions.");
    const rows = (await res.json()) as PartnersRow[];
    if (!rows?.[0]) throw new Error("Partner not found.");
    return this.rowToAccount(slug, rows[0]);
  }

  async releaseCredit(slug: string, amount: number): Promise<PartnerCreditAccount> {
    if (!Number.isFinite(amount) || amount <= 0) {
      const a = await this.getAccount(slug);
      if (!a) throw new Error(`Partner ${slug} not found.`);
      return a;
    }
    const cur = await this.getAccount(slug);
    if (!cur) throw new Error(`Partner ${slug} not found.`);
    const next = Math.max(0, cur.currentUsage - amount);
    const res = await fetch(`${this.baseUrl}/rest/v1/partners?slug=eq.${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: this.headers({ Prefer: "return=representation" }),
      body: JSON.stringify({ current_usage: next, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error("Failed to release credit.");
    const rows = (await res.json()) as PartnersRow[];
    if (!rows?.[0]) throw new Error("Partner not found.");
    return this.rowToAccount(slug, rows[0]);
  }

  async tryConsumeCredit(
    slug: string,
    amount: number,
  ): Promise<
    { ok: true; account: PartnerCreditAccount } | { ok: false; available: number; limit: number; usage: number }
  > {
    if (!Number.isFinite(amount) || amount < 0) {
      return { ok: false, available: 0, limit: 0, usage: 0 };
    }
    const cur = await this.getAccount(slug);
    if (!cur) return { ok: false, available: 0, limit: 0, usage: 0 };
    const available = cur.creditLimit - cur.currentUsage;
    if (amount > available) {
      return { ok: false, available, limit: cur.creditLimit, usage: cur.currentUsage };
    }
    const nextUsage = cur.currentUsage + amount;
    const res = await fetch(`${this.baseUrl}/rest/v1/partners?slug=eq.${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: this.headers({ Prefer: "return=representation" }),
      body: JSON.stringify({ current_usage: nextUsage, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) return { ok: false, available, limit: cur.creditLimit, usage: cur.currentUsage };
    const rows = (await res.json()) as PartnersRow[];
    const row = rows?.[0];
    if (!row) return { ok: false, available, limit: cur.creditLimit, usage: cur.currentUsage };
    return { ok: true, account: this.rowToAccount(slug, row) };
  }
}

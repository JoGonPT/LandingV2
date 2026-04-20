import { parsePartnerPricingModel } from "@/lib/partner/commission-pricing";

export interface PartnerRow {
  id: number;
  slug: string;
  name: string;
  token: string;
  commission_percentage: number;
  is_active: boolean;
  display_name: string;
  partner_kind: string;
  credit_limit: number;
  current_usage: number;
  commission_rate: number;
  pricing_model: "MARKUP" | "NET_PRICE";
  total_commissions_earned: number;
  updated_at: string;
}

export interface PartnerWriteInput {
  slug: string;
  name: string;
  token: string;
  commissionPercentage: number;
  isActive: boolean;
  partnerKind?: string;
}

function toNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRow(raw: Record<string, unknown>): PartnerRow {
  return {
    id: toNum(raw.id),
    slug: String(raw.slug ?? "").trim(),
    name: String(raw.name ?? raw.display_name ?? raw.slug ?? "").trim(),
    token: String(raw.token ?? ""),
    commission_percentage: toNum(raw.commission_percentage, toNum(raw.commission_rate, 0)),
    is_active: Boolean(raw.is_active ?? true),
    display_name: String(raw.display_name ?? raw.name ?? raw.slug ?? "").trim(),
    partner_kind: String(raw.partner_kind ?? "Partner").trim() || "Partner",
    credit_limit: toNum(raw.credit_limit, 0),
    current_usage: toNum(raw.current_usage, 0),
    commission_rate: toNum(raw.commission_rate, toNum(raw.commission_percentage, 0)),
    pricing_model: parsePartnerPricingModel(
      typeof raw.pricing_model === "string" ? raw.pricing_model : undefined,
    ),
    total_commissions_earned: toNum(raw.total_commissions_earned, 0),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

function getSupabaseEnv():
  | { baseUrl: string; serviceKey: string }
  | null {
  const baseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), serviceKey };
}

export class PartnerService {
  private readonly env = getSupabaseEnv();

  private headers(extra?: Record<string, string>) {
    if (!this.env) {
      throw new Error("Supabase is not configured.");
    }
    return {
      apikey: this.env.serviceKey,
      Authorization: `Bearer ${this.env.serviceKey}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  private ensureEnv(): { baseUrl: string; serviceKey: string } {
    if (!this.env) {
      throw new Error("Supabase is not configured.");
    }
    return this.env;
  }

  async listPartners(options?: { activeOnly?: boolean }): Promise<PartnerRow[]> {
    const { baseUrl } = this.ensureEnv();
    const activeOnly = options?.activeOnly ?? false;
    const filter = activeOnly ? "is_active=eq.true&" : "";
    const url = `${baseUrl}/rest/v1/partners?${filter}select=*&order=name.asc`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Failed to fetch partners (${res.status}).`);
    }
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows.map(normalizeRow).filter((p) => Boolean(p.slug));
  }

  async getPartnerBySlug(slug: string, options?: { activeOnly?: boolean }): Promise<PartnerRow | null> {
    const safeSlug = slug.trim();
    if (!safeSlug) return null;
    const { baseUrl } = this.ensureEnv();
    const activeOnly = options?.activeOnly ?? false;
    const activeFilter = activeOnly ? "&is_active=eq.true" : "";
    const url =
      `${baseUrl}/rest/v1/partners?slug=eq.${encodeURIComponent(safeSlug)}` +
      `&select=*${activeFilter}&limit=1`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Failed to fetch partner ${safeSlug} (${res.status}).`);
    }
    const rows = (await res.json()) as Record<string, unknown>[];
    if (!rows[0]) return null;
    return normalizeRow(rows[0]);
  }

  async createPartner(input: PartnerWriteInput): Promise<PartnerRow> {
    const { baseUrl } = this.ensureEnv();
    const now = new Date().toISOString();
    const payload = {
      slug: input.slug.trim(),
      name: input.name.trim(),
      token: input.token,
      commission_percentage: Math.max(0, Math.min(100, input.commissionPercentage)),
      is_active: input.isActive,
      display_name: input.name.trim(),
      partner_kind: input.partnerKind?.trim() || "Partner",
      commission_rate: Math.max(0, Math.min(100, input.commissionPercentage)),
      updated_at: now,
    };
    const res = await fetch(`${baseUrl}/rest/v1/partners`, {
      method: "POST",
      headers: this.headers({ Prefer: "return=representation" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to create partner (${res.status}): ${body}`);
    }
    const rows = (await res.json()) as Record<string, unknown>[];
    if (!rows[0]) throw new Error("Failed to create partner.");
    return normalizeRow(rows[0]);
  }

  async patchPartner(slug: string, patch: Partial<PartnerWriteInput>): Promise<PartnerRow> {
    const safeSlug = slug.trim();
    if (!safeSlug) throw new Error("slug is required.");
    const { baseUrl } = this.ensureEnv();
    const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) {
      body.name = patch.name.trim();
      body.display_name = patch.name.trim();
    }
    if (patch.token !== undefined) body.token = patch.token;
    if (patch.commissionPercentage !== undefined) {
      const capped = Math.max(0, Math.min(100, patch.commissionPercentage));
      body.commission_percentage = capped;
      body.commission_rate = capped;
    }
    if (patch.isActive !== undefined) body.is_active = patch.isActive;
    if (patch.partnerKind !== undefined) body.partner_kind = patch.partnerKind.trim() || "Partner";

    const res = await fetch(`${baseUrl}/rest/v1/partners?slug=eq.${encodeURIComponent(safeSlug)}`, {
      method: "PATCH",
      headers: this.headers({ Prefer: "return=representation" }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to patch partner (${res.status}): ${text}`);
    }
    const rows = (await res.json()) as Record<string, unknown>[];
    if (!rows[0]) {
      throw new Error("Partner not found.");
    }
    return normalizeRow(rows[0]);
  }
}

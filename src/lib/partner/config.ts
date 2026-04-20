export interface PartnerRecord {
  slug: string;
  accessSecret: string;
  displayName: string;
  /** Shown in owner dashboards (e.g. Hotel, Agency). */
  partnerKind?: string;
  id?: number;
  commissionPercentage?: number;
  isActive?: boolean;
}

function parseJsonPartners(raw: string): PartnerRecord[] {
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) return [];
  const out: PartnerRecord[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const slug = typeof o.slug === "string" ? o.slug.trim() : "";
    const accessSecret = typeof o.accessSecret === "string" ? o.accessSecret : "";
    const displayName = typeof o.displayName === "string" ? o.displayName.trim() : "";
    if (!slug || !accessSecret || !displayName) continue;
    const kindRaw = o.partnerKind ?? o.kind ?? o.organizationType ?? o.type;
    const partnerKind = typeof kindRaw === "string" && kindRaw.trim() ? kindRaw.trim() : undefined;
    out.push({ slug, accessSecret, displayName, partnerKind });
  }
  return out;
}

let cache: PartnerRecord[] | null = null;

export function getAllPartnersFromEnv(): PartnerRecord[] {
  if (cache) return cache;
  const jsonRaw = process.env.PARTNERS_JSON?.trim();
  if (jsonRaw) {
    try {
      cache = parseJsonPartners(jsonRaw);
      if (cache.length > 0) return cache;
    } catch {
      cache = [];
    }
  }
  const slug = process.env.PARTNER_BOOKING_SLUG?.trim();
  const secret = process.env.PARTNER_BOOKING_SECRET?.trim();
  const name = process.env.PARTNER_BOOKING_DISPLAY_NAME?.trim();
  const kind = process.env.PARTNER_BOOKING_KIND?.trim();
  if (slug && secret && name) {
    cache = [{ slug, accessSecret: secret, displayName: name, partnerKind: kind || undefined }];
    return cache;
  }
  cache = [];
  return cache;
}

async function getPartnersFromSupabase(): Promise<PartnerRecord[] | null> {
  const baseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey) return null;
  const clean = baseUrl.replace(/\/+$/, "");
  const url = `${clean}/rest/v1/partners?is_active=eq.true&select=*&order=name.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    // Production-safe fallback: if table/schema is missing or temporarily unavailable,
    // do not break the portal rendering flow; return empty and let env fallback apply.
    console.warn(`[partner-config] Supabase partners lookup failed with HTTP ${res.status}; falling back.`);
    return [];
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  const mapped = rows
    .map((row) => {
      const slug = String(row.slug ?? "").trim();
      const token = String(row.token ?? "").trim();
      const displayName = String(row.name ?? row.display_name ?? slug).trim();
      if (!slug || !token || !displayName) return null;
      const kindRaw = row.partner_kind;
      const kind = typeof kindRaw === "string" && kindRaw.trim() ? kindRaw.trim() : undefined;
      const commission = Number(row.commission_percentage ?? row.commission_rate ?? 0);
      return {
        id: Number(row.id ?? 0) || undefined,
        slug,
        accessSecret: token,
        displayName,
        partnerKind: kind,
        commissionPercentage: Number.isFinite(commission) ? commission : 0,
        isActive: Boolean(row.is_active ?? true),
      } as PartnerRecord;
    })
    .filter((v): v is PartnerRecord => v !== null);
  return mapped;
}

export async function getAllPartners(): Promise<PartnerRecord[]> {
  const fromDb = await getPartnersFromSupabase();
  if (fromDb) return fromDb;
  return getAllPartnersFromEnv();
}

export async function getPartnerBySlug(slug: string): Promise<PartnerRecord | null> {
  const s = slug.trim();
  const all = await getAllPartners();
  return all.find((p) => p.slug === s) ?? null;
}

export async function isPartnerPortalConfigured(): Promise<boolean> {
  return (await getAllPartners()).length > 0;
}

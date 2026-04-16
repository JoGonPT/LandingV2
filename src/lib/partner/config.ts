export interface PartnerRecord {
  slug: string;
  accessSecret: string;
  displayName: string;
  /** Shown in owner dashboards (e.g. Hotel, Agency). */
  partnerKind?: string;
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

export function getAllPartners(): PartnerRecord[] {
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

export function getPartnerBySlug(slug: string): PartnerRecord | null {
  const s = slug.trim();
  return getAllPartners().find((p) => p.slug === s) ?? null;
}

export function isPartnerPortalConfigured(): boolean {
  return getAllPartners().length > 0;
}

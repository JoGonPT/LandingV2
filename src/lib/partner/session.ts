import { createHmac, timingSafeEqual } from "crypto";

export const PARTNER_SESSION_COOKIE = "w2g_partner_sess";

const SEP = ".";

export function signPartnerSession(secret: string, slug: string, maxAgeSec: number): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = Buffer.from(JSON.stringify({ slug, exp, v: 1 }), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}${SEP}${sig}`;
}

export function verifyPartnerSessionToken(secret: string, token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(SEP);
  if (i <= 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let json: { slug?: string; exp?: number };
  try {
    json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { slug?: string; exp?: number };
  } catch {
    return null;
  }
  if (typeof json.slug !== "string" || !json.slug.trim()) return null;
  if (typeof json.exp !== "number" || json.exp < Math.floor(Date.now() / 1000)) return null;
  return json.slug.trim();
}

export function getPartnerSessionSecret(): string {
  const s = process.env.PARTNER_SESSION_SECRET?.trim() ?? "";
  if (s.length < 16) {
    throw new Error("PARTNER_SESSION_SECRET must be set and at least 16 characters.");
  }
  return s;
}

export function getPartnerSessionMaxAgeSec(): number {
  const n = Number(process.env.PARTNER_SESSION_MAX_AGE_SEC ?? 60 * 60 * 24 * 7);
  return Number.isFinite(n) && n > 0 ? n : 60 * 60 * 24 * 7;
}

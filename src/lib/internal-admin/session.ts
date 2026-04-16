import { createHmac, timingSafeEqual } from "crypto";

export const MASTER_ADMIN_SESSION_COOKIE = "w2g_master_admin";

const SEP = ".";

export function signMasterAdminSession(secret: string, maxAgeSec: number): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = Buffer.from(JSON.stringify({ role: "master", exp, v: 1 }), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}${SEP}${sig}`;
}

export function verifyMasterAdminSession(secret: string, token: string | undefined): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(SEP);
  if (i <= 0) return false;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  let json: { role?: string; exp?: number };
  try {
    json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: string; exp?: number };
  } catch {
    return false;
  }
  if (json.role !== "master") return false;
  if (typeof json.exp !== "number" || json.exp < Math.floor(Date.now() / 1000)) return false;
  return true;
}

export function getMasterAdminSessionSecret(): string {
  const s = process.env.W2G_MASTER_ADMIN_SESSION_SECRET?.trim() || process.env.PARTNER_SESSION_SECRET?.trim() || "";
  if (s.length < 16) {
    throw new Error("W2G_MASTER_ADMIN_SESSION_SECRET or PARTNER_SESSION_SECRET must be set (min 16 characters).");
  }
  return s;
}

export function getMasterAdminPassword(): string {
  return process.env.W2G_MASTER_ADMIN_PASSWORD?.trim() ?? "";
}

export function getMasterAdminSessionMaxAgeSec(): number {
  const n = Number(process.env.W2G_MASTER_ADMIN_SESSION_MAX_AGE_SEC ?? 60 * 60 * 12);
  return Number.isFinite(n) && n > 0 ? n : 60 * 60 * 12;
}

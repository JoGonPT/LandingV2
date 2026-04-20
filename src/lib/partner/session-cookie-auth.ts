import { getPartnerBySlug } from "@/lib/partner/config";
import { getPartnerSessionSecret, PARTNER_SESSION_COOKIE, verifyPartnerSessionToken } from "@/lib/partner/session";

export class PartnerSessionAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerSessionAuthError";
  }
}

export function readPartnerSessionTokenFromCookieHeader(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader || typeof cookieHeader !== "string") return undefined;
  const parts = cookieHeader.split(";").map((s) => s.trim());
  const prefix = `${PARTNER_SESSION_COOKIE}=`;
  for (const p of parts) {
    if (p.startsWith(prefix)) {
      try {
        return decodeURIComponent(p.slice(prefix.length));
      } catch {
        return p.slice(prefix.length);
      }
    }
  }
  return undefined;
}

/** Server-agnostic partner portal auth (Nest or any Node server with the same Cookie + env). */
export async function assertPartnerSessionMatchesSlug(
  cookieHeader: string | undefined,
  bodySlug: string,
): Promise<{ slug: string; displayName: string }> {
  const secret = getPartnerSessionSecret();
  const token = readPartnerSessionTokenFromCookieHeader(cookieHeader);
  const slug = verifyPartnerSessionToken(secret, token);
  if (!slug || slug !== bodySlug.trim()) {
    throw new PartnerSessionAuthError("unauthorized");
  }
  const partner = await getPartnerBySlug(slug);
  if (!partner) {
    throw new PartnerSessionAuthError("unauthorized");
  }
  return { slug, displayName: partner.displayName };
}

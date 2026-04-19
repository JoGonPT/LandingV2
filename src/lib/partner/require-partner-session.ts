import { cookies } from "next/headers";

import { getPartnerBySlug } from "@/lib/partner/config";
import {
  getPartnerSessionMaxAgeSec,
  getPartnerSessionSecret,
  PARTNER_SESSION_COOKIE,
  verifyPartnerSessionToken,
} from "@/lib/partner/session";

export class PartnerAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerAuthError";
  }
}

export async function requirePartnerSession(expectedSlug: string): Promise<{ slug: string; displayName: string }> {
  const secret = getPartnerSessionSecret();
  const jar = await cookies();
  const token = jar.get(PARTNER_SESSION_COOKIE)?.value;
  const slug = verifyPartnerSessionToken(secret, token);
  if (!slug || slug !== expectedSlug.trim()) {
    throw new PartnerAuthError("unauthorized");
  }
  const partner = await getPartnerBySlug(slug);
  if (!partner) {
    throw new PartnerAuthError("unauthorized");
  }
  return { slug, displayName: partner.displayName };
}

export { getPartnerSessionMaxAgeSec };

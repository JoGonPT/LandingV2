import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getPartnerBySlug } from "@/lib/partner/config";
import { getPartnerSessionSecret, PARTNER_SESSION_COOKIE, verifyPartnerSessionToken } from "@/lib/partner/session";

export async function GET(req: Request) {
  let secret: string;
  try {
    secret = getPartnerSessionSecret();
  } catch {
    return NextResponse.json({ ok: false as const, authenticated: false }, { status: 503 });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ ok: false as const, authenticated: false, message: "slug required" }, { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get(PARTNER_SESSION_COOKIE)?.value;
  const sessionSlug = verifyPartnerSessionToken(secret, token);
  if (!sessionSlug || sessionSlug !== slug) {
    return NextResponse.json({ ok: true as const, authenticated: false });
  }

  const partner = await getPartnerBySlug(sessionSlug);
  if (!partner) {
    return NextResponse.json({ ok: true as const, authenticated: false });
  }

  return NextResponse.json({
    ok: true as const,
    authenticated: true,
    slug: partner.slug,
    displayName: partner.displayName,
  });
}

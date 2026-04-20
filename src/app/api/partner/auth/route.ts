import { NextResponse } from "next/server";
import { z } from "zod";

import { getPartnerBySlug } from "@/lib/partner/config";
import { constantTimeEqualUtf8 } from "@/lib/partner/credentials";
import {
  getPartnerSessionMaxAgeSec,
  getPartnerSessionSecret,
  PARTNER_SESSION_COOKIE,
  signPartnerSession,
} from "@/lib/partner/session";

const Body = z.object({
  slug: z.string().min(1),
  secret: z.string().min(1),
});

export async function POST(req: Request) {
  let sessionSecret: string;
  try {
    sessionSecret = getPartnerSessionSecret();
  } catch {
    return NextResponse.json({ ok: false, message: "Partner portal is not configured." }, { status: 503 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });
  }

  const partner = await getPartnerBySlug(body.slug);
  if (!partner) {
    return NextResponse.json({ ok: false, message: "Unknown partner." }, { status: 401 });
  }

  if (!constantTimeEqualUtf8(body.secret, partner.accessSecret)) {
    return NextResponse.json({ ok: false, message: "Invalid credentials." }, { status: 401 });
  }

  const maxAge = getPartnerSessionMaxAgeSec();
  const token = signPartnerSession(sessionSecret, partner.slug, maxAge);
  const res = NextResponse.json({ ok: true as const, slug: partner.slug, displayName: partner.displayName });
  res.cookies.set(PARTNER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return res;
}

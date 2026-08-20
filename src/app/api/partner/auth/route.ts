import { NextResponse } from "next/server";
import { z } from "zod";

import { clientKey } from "@/lib/rate-limit";
import { checkLoginAllowed, clearLoginFailures, registerLoginFailure } from "@/lib/login-throttle";

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
  // Trava força bruta: 5 falhas do mesmo IP abrem 15 min de bloqueio.
  const throttleKey = `partner-auth:${clientKey(req)}`;
  const throttle = checkLoginAllowed(throttleKey);
  if (!throttle.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many failed attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } },
    );
  }

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
    registerLoginFailure(throttleKey);
    return NextResponse.json({ ok: false, message: "Unknown partner." }, { status: 401 });
  }

  if (!constantTimeEqualUtf8(body.secret, partner.accessSecret)) {
    registerLoginFailure(throttleKey);
    return NextResponse.json({ ok: false, message: "Invalid credentials." }, { status: 401 });
  }

  clearLoginFailures(throttleKey);
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

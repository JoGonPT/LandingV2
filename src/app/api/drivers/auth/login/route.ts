import { NextResponse } from "next/server";
import { z } from "zod";

import { getDriverPortalConfig } from "@/lib/drivers/config";
import { constantTimeEqualString, normalizeLoginEmail } from "@/lib/drivers/credentials";
import { DRIVER_SESSION_COOKIE, signDriverSession } from "@/lib/drivers/session";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let cfg;
  try {
    cfg = getDriverPortalConfig();
  } catch {
    return NextResponse.json({ error: "Driver portal is not configured." }, { status: 503 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const email = normalizeLoginEmail(body.email);
  if (!constantTimeEqualString(email, cfg.loginEmail) || !constantTimeEqualString(body.password, cfg.loginPassword)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = signDriverSession(cfg.sessionSecret, cfg.sessionMaxAgeSec);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DRIVER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cfg.sessionMaxAgeSec,
  });
  return res;
}

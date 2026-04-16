import { NextResponse } from "next/server";
import { z } from "zod";

import { constantTimeEqualUtf8 } from "@/lib/partner/credentials";
import {
  getMasterAdminPassword,
  getMasterAdminSessionMaxAgeSec,
  getMasterAdminSessionSecret,
  MASTER_ADMIN_SESSION_COOKIE,
  signMasterAdminSession,
} from "@/lib/internal-admin/session";

const Body = z.object({
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let sessionSecret: string;
  try {
    sessionSecret = getMasterAdminSessionSecret();
  } catch {
    return NextResponse.json({ ok: false, message: "Master admin is not configured." }, { status: 503 });
  }

  const configuredPassword = getMasterAdminPassword();
  if (!configuredPassword) {
    return NextResponse.json({ ok: false, message: "W2G_MASTER_ADMIN_PASSWORD is not set." }, { status: 503 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });
  }

  if (!constantTimeEqualUtf8(body.password, configuredPassword)) {
    return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
  }

  const maxAge = getMasterAdminSessionMaxAgeSec();
  const token = signMasterAdminSession(sessionSecret, maxAge);
  const res = NextResponse.json({ ok: true as const });
  res.cookies.set(MASTER_ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return res;
}

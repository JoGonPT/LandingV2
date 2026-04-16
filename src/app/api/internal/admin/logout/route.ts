import { NextResponse } from "next/server";

import { MASTER_ADMIN_SESSION_COOKIE } from "@/lib/internal-admin/session";

export async function POST() {
  const res = NextResponse.json({ ok: true as const });
  res.cookies.set(MASTER_ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

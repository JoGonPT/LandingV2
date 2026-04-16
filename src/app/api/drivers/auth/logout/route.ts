import { NextResponse } from "next/server";

import { DRIVER_SESSION_COOKIE } from "@/lib/drivers/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DRIVER_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

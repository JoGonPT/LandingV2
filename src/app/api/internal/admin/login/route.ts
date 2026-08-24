import { NextResponse } from "next/server";
import { z } from "zod";

import { clientKey } from "@/lib/rate-limit";
import { checkLoginAllowed, clearLoginFailures, registerLoginFailure } from "@/lib/login-throttle";

import { verifyAdminPassword } from "@/lib/site-settings/credentials";
import {
  getMasterAdminSessionMaxAgeSec,
  getMasterAdminSessionSecret,
  MASTER_ADMIN_SESSION_COOKIE,
  signMasterAdminSession,
} from "@/lib/internal-admin/session";

const Body = z.object({
  password: z.string().min(1),
});

export async function POST(req: Request) {
  // Trava força bruta: 5 falhas do mesmo IP abrem 15 min de bloqueio.
  const throttleKey = `admin-login:${clientKey(req)}`;
  const throttle = checkLoginAllowed(throttleKey);
  if (!throttle.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many failed attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } },
    );
  }

  let sessionSecret: string;
  try {
    sessionSecret = getMasterAdminSessionSecret();
  } catch {
    return NextResponse.json({ ok: false, message: "Master admin is not configured." }, { status: 503 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });
  }

  // Existindo password rodada no painel, é essa que manda; enquanto não existir,
  // vale a W2G_MASTER_ADMIN_PASSWORD, para que a primeira entrada seja possível.
  const check = await verifyAdminPassword(body.password);
  if (check.source === "unconfigured") {
    return NextResponse.json(
      { ok: false, message: "Nenhuma password de administração está configurada." },
      { status: 503 },
    );
  }
  if (!check.ok) {
    registerLoginFailure(throttleKey);
    return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
  }

  clearLoginFailures(throttleKey);
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

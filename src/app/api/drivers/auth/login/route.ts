import { NextResponse } from "next/server";
import { z } from "zod";

import { checkLoginAllowed, clearLoginFailures, registerLoginFailure } from "@/lib/login-throttle";
import { clientKey } from "@/lib/rate-limit";
import { isDriverSupabaseAuthConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  // Trava força bruta: 5 falhas do mesmo IP abrem 15 min de bloqueio.
  const throttleKey = `driver-login:${clientKey(req)}`;
  const throttle = checkLoginAllowed(throttleKey);
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } },
    );
  }

  if (!isDriverSupabaseAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Driver portal requires Supabase: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
      { status: 503 },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email.trim(),
    password: body.password,
  });
  if (error || !data.user) {
    registerLoginFailure(throttleKey);
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const role =
    profile && typeof profile.role === "string" ? profile.role.trim().toUpperCase() : "";
  if (profileError || !profile || role !== "DRIVER") {
    await supabase.auth.signOut();
    registerLoginFailure(throttleKey);
    return NextResponse.json(
      { error: "This account is not authorized for the driver portal." },
      { status: 403 },
    );
  }

  clearLoginFailures(throttleKey);
  return NextResponse.json({ ok: true });
}

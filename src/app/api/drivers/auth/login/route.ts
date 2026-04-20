import { NextResponse } from "next/server";
import { z } from "zod";

import { isDriverSupabaseAuthConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
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
    return NextResponse.json(
      { error: "This account is not authorized for the driver portal." },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}

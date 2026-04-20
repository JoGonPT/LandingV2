import { isDriverSupabaseAuthConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function isDriverAuthenticated(): Promise<boolean> {
  if (!isDriverSupabaseAuthConfigured()) {
    return false;
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

export async function requireDriverSessionCookie(): Promise<void> {
  if (!isDriverSupabaseAuthConfigured()) {
    throw new Error("unauthorized");
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("unauthorized");
  }
}

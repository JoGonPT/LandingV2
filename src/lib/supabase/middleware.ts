import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isDriverSupabaseAuthConfigured } from "@/lib/supabase/env";

/**
 * Refreshes the Supabase Auth session and returns a response that may include updated Set-Cookie headers.
 */
export async function applySupabaseSessionToResponse(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  if (!isDriverSupabaseAuthConfigured()) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

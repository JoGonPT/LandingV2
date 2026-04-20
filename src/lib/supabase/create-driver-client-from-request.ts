import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader || !cookieHeader.trim()) return [];
  return cookieHeader
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      const i = part.indexOf("=");
      if (i <= 0) return { name: part, value: "" };
      const name = part.slice(0, i).trim();
      const value = part.slice(i + 1).trim();
      try {
        return { name, value: decodeURIComponent(value) };
      } catch {
        return { name, value };
      }
    });
}

/** Minimal request shape for Nest or other Node servers (no Next `cookies()`). */
export type NodeDriverRequestLike = {
  headers: {
    cookie?: string;
    authorization?: string;
  };
};

/**
 * Supabase Auth client for driver APIs: browser session cookies (PWA) or `Authorization: Bearer <jwt>`.
 * Forward the same `Cookie` / `Authorization` headers the browser sent to Next (including on drivers.*).
 */
export function createSupabaseDriverClientFromNodeRequest(req: NodeDriverRequestLike): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  }

  const auth = req.headers.authorization?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const jwt = auth.slice(7).trim();
    return createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
  }

  const cookieHeader = req.headers.cookie ?? "";
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(cookieHeader);
      },
      setAll() {
        /* BFF proxy: session refresh cookies are applied by Next middleware on full page loads. */
      },
    },
  });
}

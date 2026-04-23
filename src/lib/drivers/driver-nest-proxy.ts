import { NextResponse } from "next/server";

import { pickNestProxyForwardHeaders } from "@/lib/http/nest-proxy-extra-headers";
import { getDriverNestApiBaseUrl, nestProxyFetchSignal } from "@/lib/nest-api-base-url";

/**
 * Driver PWA BFF → NestJS
 *
 * Forward the same `Cookie` and `Authorization` headers the browser sent. On `drivers.*` subdomains,
 * Next rewrites still hit this App Router handler with the original request headers, so the Supabase
 * session cookies remain valid when proxied to `NEST_API_BASE_URL` (server-side fetch).
 *
 * Usa só `NEST_API_BASE_URL` (ver `getDriverNestApiBaseUrl`); não faz fallback a `NEXT_PUBLIC_SITE_URL` para evitar recursão no mesmo path.
 */
const LOG_PREFIX = "[nest-driver-proxy]";

function isTimeoutLike(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return e.name === "TimeoutError" || e.name === "AbortError" || e.message.toLowerCase().includes("timeout");
}

/**
 * @param pathWithQuery - Path beginning with `/api/drivers/...`, including `?date=` when present.
 */
export async function proxyDriverApiToNest(request: Request, pathWithQuery: string): Promise<NextResponse> {
  const base = getDriverNestApiBaseUrl();
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (!base) {
    return NextResponse.json(
      {
        error:
          "Driver API requires NEST_API_BASE_URL pointing to the Nest host (same-origin driver paths cannot be proxied to this app).",
        code: "PROXY_CONFIG",
        requestId,
      },
      { status: 503 },
    );
  }

  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  const target = `${base}${path}`;
  const cookie = request.headers.get("cookie") ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const bodyText = hasBody ? await request.text() : undefined;

  console.info(LOG_PREFIX, "forward", { requestId, target, method });

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers: {
        ...pickNestProxyForwardHeaders(request),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
        ...(hasBody ? { "Content-Type": request.headers.get("content-type") ?? "application/json" } : {}),
      },
      body: bodyText,
      signal: nestProxyFetchSignal(),
    });
  } catch (e) {
    console.error(LOG_PREFIX, "upstream failed", { requestId, error: String(e) });
    if (isTimeoutLike(e)) {
      return NextResponse.json(
        { error: "Nest API request timed out.", code: "PROXY_TIMEOUT", requestId },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Nest API unreachable.", code: "PROXY_UPSTREAM", requestId },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

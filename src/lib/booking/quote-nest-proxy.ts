import { NextResponse } from "next/server";

import { pickNestProxyForwardHeaders } from "@/lib/http/nest-proxy-extra-headers";
import { getNestApiBaseUrl, isRecursiveNestProxy, nestProxyFetchSignal } from "@/lib/nest-api-base-url";

const LOG_PREFIX = "[nest-public-proxy]";

function nestUpstreamHeaders(request: Request, extra: Record<string, string>): Record<string, string> {
  return {
    ...pickNestProxyForwardHeaders(request),
    ...extra,
  };
}

function isTimeoutLike(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return e.name === "TimeoutError" || e.name === "AbortError" || e.message.toLowerCase().includes("timeout");
}

function recursiveProxyResponse(requestId: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      code: "PROXY_RECURSION",
      message:
        "Nest proxy would call the same URL as this request. Set NEST_API_BASE_URL to a separate API host, or use a BFF route whose path differs from the upstream (e.g. /api/booking/quote → /api/public/quote).",
      requestId,
    },
    { status: 503 },
  );
}

async function proxyPublicPostToNest(
  request: Request,
  nestPath: "/api/public/quote" | "/api/public/book",
): Promise<NextResponse> {
  const base = getNestApiBaseUrl();
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (!base) {
    return NextResponse.json(
      {
        success: false,
        code: "PROXY_CONFIG",
        message:
          "Nest API is not configured. Set NEST_API_BASE_URL and/or NEXT_PUBLIC_SITE_URL (production / Vercel).",
        requestId,
      },
      { status: 503 },
    );
  }

  const bodyText = await request.text();
  console.info(LOG_PREFIX, "request received", { requestId, nestPath, bodyBytes: bodyText.length });

  const target = `${base}${nestPath}`;
  if (isRecursiveNestProxy(request, target)) {
    return recursiveProxyResponse(requestId);
  }
  console.info(LOG_PREFIX, "forwarding", { requestId, target });

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: "POST",
      headers: nestUpstreamHeaders(request, { "Content-Type": "application/json" }),
      body: bodyText,
      signal: nestProxyFetchSignal(),
    });
  } catch (e) {
    console.error(LOG_PREFIX, "forward failed", { requestId, error: String(e) });
    if (isTimeoutLike(e)) {
      return NextResponse.json(
        {
          success: false,
          code: "PROXY_TIMEOUT",
          message: "Nest API request timed out.",
          requestId,
        },
        { status: 504 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        code: "PROXY_UPSTREAM",
        message: "Nest API unreachable.",
        requestId,
      },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  console.info(LOG_PREFIX, "upstream response", { requestId, status: upstream.status });

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function proxyQuoteToNest(request: Request): Promise<NextResponse> {
  return proxyPublicPostToNest(request, "/api/public/quote");
}

type PartnerNestPath = "/api/partner/quote" | "/api/partner/book-account";

async function proxyPartnerPostToNest(request: Request, nestPath: PartnerNestPath): Promise<NextResponse> {
  const base = getNestApiBaseUrl();
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (!base) {
    return NextResponse.json(
      {
        success: false,
        code: "PROXY_CONFIG",
        message:
          "Nest API is not configured. Set NEST_API_BASE_URL and/or NEXT_PUBLIC_SITE_URL (production / Vercel).",
        requestId,
      },
      { status: 503 },
    );
  }

  const bodyText = await request.text();
  const cookie = request.headers.get("cookie") ?? "";
  console.info(LOG_PREFIX, "partner request received", { requestId, nestPath, bodyBytes: bodyText.length });

  const target = `${base}${nestPath}`;
  if (isRecursiveNestProxy(request, target)) {
    return recursiveProxyResponse(requestId);
  }
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: "POST",
      headers: nestUpstreamHeaders(request, {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      }),
      body: bodyText,
      signal: nestProxyFetchSignal(),
    });
  } catch (e) {
    console.error(LOG_PREFIX, "partner forward failed", { requestId, error: String(e) });
    if (isTimeoutLike(e)) {
      return NextResponse.json(
        {
          success: false,
          code: "PROXY_TIMEOUT",
          message: "Nest API request timed out.",
          requestId,
        },
        { status: 504 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        code: "PROXY_UPSTREAM",
        message: "Nest API unreachable.",
        requestId,
      },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  console.info(LOG_PREFIX, "partner upstream response", { requestId, status: upstream.status });

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function proxyPartnerQuoteToNest(request: Request): Promise<NextResponse> {
  return proxyPartnerPostToNest(request, "/api/partner/quote");
}

export async function proxyPartnerBookAccountToNest(request: Request): Promise<NextResponse> {
  return proxyPartnerPostToNest(request, "/api/partner/book-account");
}

export async function proxyBookToNest(request: Request): Promise<NextResponse> {
  return proxyPublicPostToNest(request, "/api/public/book");
}

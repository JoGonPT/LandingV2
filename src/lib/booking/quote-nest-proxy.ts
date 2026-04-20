import { NextResponse } from "next/server";

import { pickNestProxyForwardHeaders } from "@/lib/http/nest-proxy-extra-headers";

const LOG_PREFIX = "[nest-public-proxy]";

function nestUpstreamHeaders(request: Request, extra: Record<string, string>): Record<string, string> {
  return {
    ...pickNestProxyForwardHeaders(request),
    ...extra,
  };
}

function nestBaseUrl(): string | null {
  const u = process.env.NEST_API_BASE_URL?.trim();
  return u && u.length > 0 ? u.replace(/\/+$/, "") : null;
}

async function proxyPublicPostToNest(
  request: Request,
  nestPath: "/api/public/quote" | "/api/public/book" | "/api/payments/create-intent",
): Promise<NextResponse> {
  const base = nestBaseUrl();
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (!base) {
    console.error(LOG_PREFIX, "NEST_API_BASE_URL not set", { requestId });
    return NextResponse.json(
      {
        success: false,
        code: "PROXY_CONFIG",
        message: "Nest API is not configured (NEST_API_BASE_URL).",
        requestId,
      },
      { status: 503 },
    );
  }

  const bodyText = await request.text();
  console.info(LOG_PREFIX, "request received", { requestId, nestPath, bodyBytes: bodyText.length });

  const target = `${base}${nestPath}`;
  console.info(LOG_PREFIX, "forwarding", { requestId, target });

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: "POST",
      headers: nestUpstreamHeaders(request, { "Content-Type": "application/json" }),
      body: bodyText,
    });
  } catch (e) {
    console.error(LOG_PREFIX, "forward failed", { requestId, error: String(e) });
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
  const base = nestBaseUrl();
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (!base) {
    console.error(LOG_PREFIX, "NEST_API_BASE_URL not set", { requestId });
    return NextResponse.json(
      {
        success: false,
        code: "PROXY_CONFIG",
        message: "Nest API is not configured (NEST_API_BASE_URL).",
        requestId,
      },
      { status: 503 },
    );
  }

  const bodyText = await request.text();
  const cookie = request.headers.get("cookie") ?? "";
  console.info(LOG_PREFIX, "partner request received", { requestId, nestPath, bodyBytes: bodyText.length });

  const target = `${base}${nestPath}`;
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: "POST",
      headers: nestUpstreamHeaders(request, {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      }),
      body: bodyText,
    });
  } catch (e) {
    console.error(LOG_PREFIX, "partner forward failed", { requestId, error: String(e) });
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

export async function proxyPaymentsCreateIntentToNest(request: Request): Promise<NextResponse> {
  return proxyPublicPostToNest(request, "/api/payments/create-intent");
}

export async function proxyPaymentsCheckoutStatus(request: Request): Promise<NextResponse> {
  const base = nestBaseUrl();
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (!base) {
    console.error(LOG_PREFIX, "NEST_API_BASE_URL not set", { requestId });
    return NextResponse.json(
      {
        success: false,
        code: "PROXY_CONFIG",
        message: "Nest API is not configured (NEST_API_BASE_URL).",
        requestId,
      },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const pi = url.searchParams.get("payment_intent")?.trim();
  if (!pi) {
    return NextResponse.json(
      { success: false, code: "BAD_REQUEST", message: "payment_intent required.", requestId },
      { status: 400 },
    );
  }

  const target = `${base}/api/payments/checkout-status?payment_intent=${encodeURIComponent(pi)}`;
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: "GET",
      headers: nestUpstreamHeaders(request, {}),
    });
  } catch (e) {
    console.error(LOG_PREFIX, "checkout-status forward failed", { requestId, error: String(e) });
    return NextResponse.json(
      { success: false, code: "PROXY_UPSTREAM", message: "Nest API unreachable.", requestId },
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

export async function proxyStripeWebhookToNest(request: Request): Promise<NextResponse> {
  const base = nestBaseUrl();
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  if (!base) {
    console.error(LOG_PREFIX, "NEST_API_BASE_URL not set", { requestId });
    return NextResponse.json({ received: false, message: "Nest not configured." }, { status: 503 });
  }

  const sig = request.headers.get("stripe-signature") ?? "";
  const raw = await request.text();
  const target = `${base}/api/webhooks/stripe`;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: "POST",
      headers: nestUpstreamHeaders(request, {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
        "stripe-signature": sig,
      }),
      body: raw,
    });
  } catch (e) {
    console.error(LOG_PREFIX, "stripe webhook forward failed", { requestId, error: String(e) });
    return NextResponse.json({ received: false }, { status: 502 });
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

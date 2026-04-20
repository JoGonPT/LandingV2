import type { IncomingHttpHeaders } from "node:http";

function trimHeader(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t && t.length > 0 ? t : undefined;
}

function headerFromIncoming(headers: IncomingHttpHeaders, name: string): string | undefined {
  const v = headers[name];
  if (typeof v === "string") return trimHeader(v);
  if (Array.isArray(v)) {
    const joined = v.map((s) => trimHeader(s)).filter(Boolean).join(", ");
    return joined.length > 0 ? joined : undefined;
  }
  return undefined;
}

/**
 * Headers to forward toward the backend (Nest → TransferCRM) so the CRM can infer client geo / IP.
 * Uses the de-facto chain set by proxies and CDNs.
 */
export function pickClientIpForwardHeadersFromNodeHeaders(headers: IncomingHttpHeaders): Record<string, string> {
  const out: Record<string, string> = {};
  const xff = headerFromIncoming(headers, "x-forwarded-for");
  const xri = headerFromIncoming(headers, "x-real-ip");
  const cf = headerFromIncoming(headers, "cf-connecting-ip");
  if (xff) out["X-Forwarded-For"] = xff;
  if (xri) out["X-Real-IP"] = xri;
  else if (cf) out["X-Real-IP"] = cf;
  return out;
}

/** Web `Request` (Next.js App Router route handlers). */
export function pickClientIpForwardHeadersFromWebRequest(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  const xff = trimHeader(request.headers.get("x-forwarded-for") ?? undefined);
  const xri = trimHeader(request.headers.get("x-real-ip") ?? undefined);
  const cf = trimHeader(request.headers.get("cf-connecting-ip") ?? undefined);
  if (xff) out["X-Forwarded-For"] = xff;
  if (xri) out["X-Real-IP"] = xri;
  else if (cf) out["X-Real-IP"] = cf;
  return out;
}

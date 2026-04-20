import { pickClientIpForwardHeadersFromWebRequest } from "@/lib/http/client-ip-forward-headers";

/** Forward `Idempotency-Key` from browser → Next route → Nest (canonical header casing). */
export function pickIdempotencyKeyForNestProxy(request: Request): Record<string, string> {
  const v = request.headers.get("idempotency-key")?.trim();
  return v && v.length > 0 ? { "Idempotency-Key": v } : {};
}

/** Client IP + optional idempotency for all Nest BFF `fetch` calls. */
export function pickNestProxyForwardHeaders(request: Request): Record<string, string> {
  return {
    ...pickClientIpForwardHeadersFromWebRequest(request),
    ...pickIdempotencyKeyForNestProxy(request),
  };
}

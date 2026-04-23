const DEFAULT_PROXY_TIMEOUT_MS = 60_000;
const MAX_PROXY_TIMEOUT_MS = 120_000;

/**
 * Base URL for server-side BFF → Nest HTTP calls.
 *
 * **Server-only** — não importar em componentes com `"use client"`. No browser, `process.env.NEST_API_BASE_URL`
 * não existe; para URLs públicas no cliente usa `process.env.NEXT_PUBLIC_SITE_URL` diretamente nesses ficheiros.
 *
 * Ordem de resolução (nunca lança exceção; devolve `""` se nada estiver definido):
 * 1. `NEST_API_BASE_URL` (trim, sem barra final)
 * 2. `NEXT_PUBLIC_SITE_URL` (trim, sem barra final)
 * 3. Em Vercel: `https://${VERCEL_URL}`
 * 4. `""`
 *
 * Pagamentos e webhook Stripe são nativos em Next (`/api/payments/*`, `/api/webhooks/stripe`).
 * Cotações/book/partner continuam a usar o proxy para `nestjs-api/`.
 *
 * O proxy recusa mesmo path + mesma origin (evita recursão infinita).
 */
export function getNestApiBaseUrl(): string {
  const explicit = process.env.NEST_API_BASE_URL?.trim();
  if (explicit) {
    const normalized = explicit.replace(/\/+$/, "");
    if (normalized.length > 0) return normalized;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/+$/, "");

  if (process.env.VERCEL === "1") {
    const vercelHost = process.env.VERCEL_URL?.trim();
    if (vercelHost) return `https://${vercelHost.replace(/\/+$/, "")}`;
  }

  return "";
}

export function nestProxyFetchTimeoutMs(): number {
  const raw = process.env.NEST_PROXY_TIMEOUT_MS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.min(n, MAX_PROXY_TIMEOUT_MS);
  }
  return DEFAULT_PROXY_TIMEOUT_MS;
}

/** Same-origin fetch to the same pathname as the incoming request will recurse forever. */
export function isRecursiveNestProxy(request: Request, absoluteTargetUrl: string): boolean {
  try {
    const incoming = new URL(request.url);
    const outgoing = new URL(absoluteTargetUrl);
    if (incoming.origin !== outgoing.origin) return false;
    const pa = (incoming.pathname.replace(/\/$/, "") || "/") as string;
    const pb = (outgoing.pathname.replace(/\/$/, "") || "/") as string;
    return pa === pb;
  } catch {
    return false;
  }
}

export function nestProxyFetchSignal(): AbortSignal {
  return AbortSignal.timeout(nestProxyFetchTimeoutMs());
}

/**
 * Driver BFF forwards 1:1 para `/api/drivers/*` no upstream. Só `NEST_API_BASE_URL` (ou `""`) —
 * não reutiliza o fallback de `NEXT_PUBLIC_SITE_URL` para evitar `fetch` ao mesmo path nesta app (recursão).
 */
export function getDriverNestApiBaseUrl(): string {
  const explicit = process.env.NEST_API_BASE_URL?.trim();
  if (!explicit) return "";
  const normalized = explicit.replace(/\/+$/, "");
  return normalized.length > 0 ? normalized : "";
}

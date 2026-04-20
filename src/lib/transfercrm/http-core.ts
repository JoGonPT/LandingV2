import { getOutboundClientIpHeaders } from "@/lib/http/outbound-forwarded-headers";
import { buildTransferCrmAuthHeaders, type TransferCrmAuth } from "@/lib/transfercrm/config";
import type { TransferCrmValidationErrorBody } from "@/lib/transfercrm/openapi.types";

export class TransferCrmHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "TransferCrmHttpError";
  }
}

export class TransferCrmValidationFailedError extends TransferCrmHttpError {
  constructor(public readonly validation: TransferCrmValidationErrorBody) {
    super("TransferCRM validation failed.", 422, validation);
    this.name = "TransferCrmValidationFailedError";
  }
}

export function apiV2RootFromBaseUrl(baseUrl: string): string {
  const b = baseUrl.replace(/\/+$/, "");
  if (b.endsWith("/api/v2")) return b;
  if (b.endsWith("/api")) return `${b}/v2`;
  return `${b}/api/v2`;
}

export function parseRetryAfterSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
  const asDate = Date.parse(value);
  if (!Number.isFinite(asDate)) return undefined;
  const diffSeconds = Math.ceil((asDate - Date.now()) / 1000);
  return diffSeconds > 0 ? diffSeconds : undefined;
}

export function unwrapData<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in json && (json as { data: unknown }).data !== undefined) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export interface TransferCrmHttpOptions {
  baseUrl: string;
  timeoutMs: number;
  auth: TransferCrmAuth;
}

export async function transferCrmFetch<T>(
  options: TransferCrmHttpOptions,
  pathUnderV2: string,
  init: RequestInit,
): Promise<T> {
  const root = apiV2RootFromBaseUrl(options.baseUrl);
  const url = `${root}${pathUnderV2.startsWith("/") ? pathUnderV2 : `/${pathUnderV2}`}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const authHeaders = buildTransferCrmAuthHeaders(options.auth);
    const forwarded = getOutboundClientIpHeaders();
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeaders,
        ...forwarded,
        ...(init.headers || {}),
      },
    });

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      if (response.status === 422) {
        throw new TransferCrmValidationFailedError(
          typeof body === "object" && body && "message" in body
            ? (body as TransferCrmValidationErrorBody)
            : { message: "Validation failed." },
        );
      }
      const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get("Retry-After"));
      throw new TransferCrmHttpError("TransferCRM request failed.", response.status, body, retryAfterSeconds);
    }

    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function withRateLimitRetry<T>(op: () => Promise<T>): Promise<T> {
  let tries = 0;
  while (tries < 2) {
    try {
      return await op();
    } catch (error) {
      if (!(error instanceof TransferCrmHttpError) || error.status !== 429 || tries >= 1) {
        throw error;
      }
      const waitMs = Math.max((error.retryAfterSeconds ?? 2) * 1000, 500);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      tries += 1;
    }
  }
  throw new Error("Unreachable");
}

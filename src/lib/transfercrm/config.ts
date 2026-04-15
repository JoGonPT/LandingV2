export type TransferCrmAuthMode = "bearer" | "x_api_key" | "authorization_api_key" | "basic";

export type TransferCrmAuth =
  | { mode: "bearer"; token: string }
  | { mode: "x_api_key"; apiKey: string }
  | { mode: "authorization_api_key"; apiKey: string }
  | { mode: "basic"; apiKey: string; apiSecret: string };

export interface TransferCrmConfig {
  baseUrl: string;
  timeoutMs: number;
  auth: TransferCrmAuth;
}

const DEFAULT_TIMEOUT_MS = 12000;

function parseAuthMode(raw: string | undefined): TransferCrmAuthMode {
  const v = raw?.trim().toLowerCase();
  if (v === "x_api_key" || v === "x-api-key" || v === "api_key" || v === "apikey") return "x_api_key";
  if (v === "authorization_api_key" || v === "apikey_prefix" || v === "sanctum") return "authorization_api_key";
  if (v === "basic") return "basic";
  return "bearer";
}

export function getTransferCrmConfig(): TransferCrmConfig {
  const baseUrl = process.env.TRANSFERCRM_BASE_URL?.trim();
  const timeoutMs = Number(process.env.TRANSFERCRM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const bearerToken = process.env.TRANSFERCRM_BEARER_TOKEN?.trim();
  const apiKey = process.env.TRANSFERCRM_API_KEY?.trim();
  const apiSecret = process.env.TRANSFERCRM_API_SECRET?.trim();
  const authModeRaw = process.env.TRANSFERCRM_AUTH_MODE?.trim();
  let authMode = parseAuthMode(authModeRaw);
  if (!authModeRaw && apiKey && !bearerToken) {
    authMode = "x_api_key";
  }

  if (!baseUrl) {
    throw new Error("TransferCRM config missing. Set TRANSFERCRM_BASE_URL.");
  }

  let auth: TransferCrmAuth;

  switch (authMode) {
    case "x_api_key":
      if (!apiKey) {
        throw new Error("TRANSFERCRM_AUTH_MODE=x_api_key requires TRANSFERCRM_API_KEY.");
      }
      auth = { mode: "x_api_key", apiKey };
      break;
    case "authorization_api_key":
      if (!apiKey) {
        throw new Error("TRANSFERCRM_AUTH_MODE=authorization_api_key requires TRANSFERCRM_API_KEY.");
      }
      auth = { mode: "authorization_api_key", apiKey };
      break;
    case "basic":
      if (!apiKey || !apiSecret) {
        throw new Error("TRANSFERCRM_AUTH_MODE=basic requires TRANSFERCRM_API_KEY and TRANSFERCRM_API_SECRET.");
      }
      auth = { mode: "basic", apiKey, apiSecret };
      break;
    default:
      if (!bearerToken) {
        throw new Error("TRANSFERCRM_AUTH_MODE=bearer (default) requires TRANSFERCRM_BEARER_TOKEN.");
      }
      auth = { mode: "bearer", token: bearerToken };
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
    auth,
  };
}

export function buildTransferCrmAuthHeaders(auth: TransferCrmAuth): Record<string, string> {
  switch (auth.mode) {
    case "bearer":
      return { Authorization: `Bearer ${auth.token}` };
    case "x_api_key":
      return { "X-API-Key": auth.apiKey };
    case "authorization_api_key":
      return { Authorization: `ApiKey ${auth.apiKey}` };
    case "basic": {
      const raw = `${auth.apiKey}:${auth.apiSecret}`;
      const encoded = Buffer.from(raw, "utf8").toString("base64");
      return { Authorization: `Basic ${encoded}` };
    }
    default: {
      const _exhaustive: never = auth;
      return _exhaustive;
    }
  }
}

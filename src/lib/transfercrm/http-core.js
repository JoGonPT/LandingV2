"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferCrmValidationFailedError = exports.TransferCrmHttpError = void 0;
exports.apiV2RootFromBaseUrl = apiV2RootFromBaseUrl;
exports.parseRetryAfterSeconds = parseRetryAfterSeconds;
exports.unwrapData = unwrapData;
exports.transferCrmFetch = transferCrmFetch;
exports.withRateLimitRetry = withRateLimitRetry;
const config_1 = require("./config");
class TransferCrmHttpError extends Error {
    constructor(message, status, body, retryAfterSeconds) {
        super(message);
        this.status = status;
        this.body = body;
        this.retryAfterSeconds = retryAfterSeconds;
        this.name = "TransferCrmHttpError";
    }
}
exports.TransferCrmHttpError = TransferCrmHttpError;
class TransferCrmValidationFailedError extends TransferCrmHttpError {
    constructor(validation) {
        super("TransferCRM validation failed.", 422, validation);
        this.validation = validation;
        this.name = "TransferCrmValidationFailedError";
    }
}
exports.TransferCrmValidationFailedError = TransferCrmValidationFailedError;
function apiV2RootFromBaseUrl(baseUrl) {
    const b = baseUrl.replace(/\/+$/, "");
    if (b.endsWith("/api/v2"))
        return b;
    if (b.endsWith("/api"))
        return `${b}/v2`;
    return `${b}/api/v2`;
}
function parseRetryAfterSeconds(value) {
    if (!value)
        return undefined;
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && asNumber > 0)
        return asNumber;
    const asDate = Date.parse(value);
    if (!Number.isFinite(asDate))
        return undefined;
    const diffSeconds = Math.ceil((asDate - Date.now()) / 1000);
    return diffSeconds > 0 ? diffSeconds : undefined;
}
function unwrapData(json) {
    if (json && typeof json === "object" && "data" in json && json.data !== undefined) {
        return json.data;
    }
    return json;
}
async function transferCrmFetch(options, pathUnderV2, init) {
    const root = apiV2RootFromBaseUrl(options.baseUrl);
    const url = `${root}${pathUnderV2.startsWith("/") ? pathUnderV2 : `/${pathUnderV2}`}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
        const authHeaders = (0, config_1.buildTransferCrmAuthHeaders)(options.auth);
        const response = await fetch(url, {
            ...init,
            signal: controller.signal,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...authHeaders,
                ...(init.headers || {}),
            },
        });
        const contentType = response.headers.get("content-type") ?? "";
        const body = contentType.includes("application/json") ? await response.json() : await response.text();
        if (!response.ok) {
            if (response.status === 422) {
                throw new TransferCrmValidationFailedError(typeof body === "object" && body && "message" in body
                    ? body
                    : { message: "Validation failed." });
            }
            const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get("Retry-After"));
            throw new TransferCrmHttpError("TransferCRM request failed.", response.status, body, retryAfterSeconds);
        }
        return body;
    }
    finally {
        clearTimeout(timeout);
    }
}
async function withRateLimitRetry(op) {
    let tries = 0;
    while (tries < 2) {
        try {
            return await op();
        }
        catch (error) {
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
//# sourceMappingURL=http-core.js.map
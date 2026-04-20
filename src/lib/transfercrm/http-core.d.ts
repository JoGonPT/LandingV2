import { type TransferCrmAuth } from "@/lib/transfercrm/config";
import type { TransferCrmValidationErrorBody } from "@/lib/transfercrm/openapi.types";
export declare class TransferCrmHttpError extends Error {
    readonly status: number;
    readonly body?: unknown | undefined;
    readonly retryAfterSeconds?: number | undefined;
    constructor(message: string, status: number, body?: unknown | undefined, retryAfterSeconds?: number | undefined);
}
export declare class TransferCrmValidationFailedError extends TransferCrmHttpError {
    readonly validation: TransferCrmValidationErrorBody;
    constructor(validation: TransferCrmValidationErrorBody);
}
export declare function apiV2RootFromBaseUrl(baseUrl: string): string;
export declare function parseRetryAfterSeconds(value: string | null): number | undefined;
export declare function unwrapData<T>(json: unknown): T;
export interface TransferCrmHttpOptions {
    baseUrl: string;
    timeoutMs: number;
    auth: TransferCrmAuth;
}
export declare function transferCrmFetch<T>(options: TransferCrmHttpOptions, pathUnderV2: string, init: RequestInit): Promise<T>;
export declare function withRateLimitRetry<T>(op: () => Promise<T>): Promise<T>;

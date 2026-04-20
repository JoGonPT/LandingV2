import { AsyncLocalStorage } from "node:async_hooks";

/** Optional client IP headers to attach to outbound TransferCRM HTTP calls (set per Nest request). */
const outboundClientIpHeaders = new AsyncLocalStorage<Record<string, string>>();

export function runWithOutboundClientIpHeaders<T>(headers: Record<string, string>, fn: () => T): T {
  return outboundClientIpHeaders.run({ ...headers }, fn);
}

/** Merged into `transferCrmFetch` when running inside Nest (or any code that wrapped the request). */
export function getOutboundClientIpHeaders(): Record<string, string> {
  return outboundClientIpHeaders.getStore() ?? {};
}

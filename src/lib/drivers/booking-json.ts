/** Normalize TransferCRM list payloads whether the API returns `{ data: T[] }` or nested envelopes. */
export function normalizeBookingsList(raw: unknown): unknown[] {
  const top = raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;
  if (Array.isArray(top)) return top;
  if (top && typeof top === "object" && "data" in top && Array.isArray((top as { data: unknown }).data)) {
    return (top as { data: unknown[] }).data;
  }
  return [];
}

export function unwrapRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  if ("data" in raw && (raw as { data: unknown }).data && typeof (raw as { data: unknown }).data === "object") {
    return (raw as { data: Record<string, unknown> }).data;
  }
  return raw as Record<string, unknown>;
}

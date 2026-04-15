import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 5 * 60 * 1000;

export interface TransferCrmWebhookEvent {
  id?: string | number;
  event?: string;
  type?: string;
  data?: unknown;
  [key: string]: unknown;
}

export function isSupportedTransferCrmEvent(event: TransferCrmWebhookEvent): boolean {
  const name = event.event ?? event.type;
  return name === "order.status_changed" || name === "order.driver_assigned";
}

function normalizeSignature(value: string): string {
  return value.replace(/^sha256=/i, "").trim();
}

export function verifyTransferCrmWebhookSignature({
  rawBody,
  timestampHeader,
  signatureHeader,
  secret,
  nowMs = Date.now(),
}: {
  rawBody: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  secret: string;
  nowMs?: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!timestampHeader || !signatureHeader) {
    return { ok: false, reason: "Missing signature headers." };
  }

  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "Invalid webhook timestamp." };
  }

  const signedAtMs = ts > 1_000_000_000_000 ? ts : ts * 1000;
  if (Math.abs(nowMs - signedAtMs) > MAX_AGE_MS) {
    return { ok: false, reason: "Stale webhook timestamp." };
  }

  const payload = `${timestampHeader}.${rawBody}`;
  const expectedHex = createHmac("sha256", secret).update(payload).digest("hex");
  const receivedHex = normalizeSignature(signatureHeader);

  try {
    const expected = Buffer.from(expectedHex, "hex");
    const received = Buffer.from(receivedHex, "hex");
    if (expected.length === 0 || received.length === 0 || expected.length !== received.length) {
      return { ok: false, reason: "Invalid webhook signature." };
    }
    return timingSafeEqual(expected, received) ? { ok: true } : { ok: false, reason: "Invalid webhook signature." };
  } catch {
    return { ok: false, reason: "Invalid webhook signature format." };
  }
}

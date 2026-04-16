import { createHash, timingSafeEqual } from "crypto";

export function constantTimeEqualString(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a, "utf8").digest();
  const digestB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(digestA, digestB);
}

export function normalizeLoginEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

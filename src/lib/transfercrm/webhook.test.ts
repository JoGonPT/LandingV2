import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isSupportedTransferCrmEvent, verifyTransferCrmWebhookSignature } from "@/lib/transfercrm/webhook";

describe("transfercrm webhook signature", () => {
  it("accepts valid recent signature", () => {
    const secret = "test_secret";
    const nowMs = 1_700_000_000_000;
    const timestamp = String(Math.floor(nowMs / 1000));
    const body = JSON.stringify({ event: "order.status_changed", id: 1 });
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

    const result = verifyTransferCrmWebhookSignature({
      rawBody: body,
      timestampHeader: timestamp,
      signatureHeader: signature,
      secret,
      nowMs,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects stale webhooks", () => {
    const result = verifyTransferCrmWebhookSignature({
      rawBody: "{}",
      timestampHeader: "1700000000",
      signatureHeader: "deadbeef",
      secret: "x",
      nowMs: 1_700_000_000_000 + 10 * 60_000,
    });

    expect(result.ok).toBe(false);
  });

  it("filters supported event names", () => {
    expect(isSupportedTransferCrmEvent({ event: "order.status_changed" })).toBe(true);
    expect(isSupportedTransferCrmEvent({ event: "order.driver_assigned" })).toBe(true);
    expect(isSupportedTransferCrmEvent({ event: "order.created" })).toBe(false);
  });
});

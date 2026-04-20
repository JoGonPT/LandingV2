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

  it("accepts signature for order.created with external_reference (Stripe PI id)", () => {
    const secret = "test_secret";
    const nowMs = 1_700_000_000_000;
    const timestamp = String(Math.floor(nowMs / 1000));
    const body = JSON.stringify({
      event: "order.created",
      id: 99,
      data: {
        booking_id: "crm-booking-1",
        external_reference: "pi_3MtwBwLkdIwHu7ix0a1b2c3d",
      },
    });
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

    const result = verifyTransferCrmWebhookSignature({
      rawBody: body,
      timestampHeader: timestamp,
      signatureHeader: signature,
      secret,
      nowMs,
    });

    expect(result.ok).toBe(true);
    const parsed = JSON.parse(body) as { event?: string; data?: { external_reference?: string } };
    expect(isSupportedTransferCrmEvent(parsed)).toBe(true);
    expect(parsed.data?.external_reference).toMatch(/^pi_/);
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

  it("treats non-empty event or type as supported (all lifecycle events forwarded)", () => {
    expect(isSupportedTransferCrmEvent({ event: "order.status_changed" })).toBe(true);
    expect(isSupportedTransferCrmEvent({ event: "order.driver_assigned" })).toBe(true);
    expect(isSupportedTransferCrmEvent({ event: "order.created" })).toBe(true);
    expect(isSupportedTransferCrmEvent({ type: "booking.updated" })).toBe(true);
  });

  it("ignores payloads without a usable event name", () => {
    expect(isSupportedTransferCrmEvent({})).toBe(false);
    expect(isSupportedTransferCrmEvent({ event: "" })).toBe(false);
    expect(isSupportedTransferCrmEvent({ type: "   " })).toBe(false);
  });
});

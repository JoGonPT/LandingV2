import { NextResponse } from "next/server";
import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  isSupportedTransferCrmEvent,
  TransferCrmWebhookEvent,
  verifyTransferCrmWebhookSignature,
} from "@/lib/transfercrm/webhook";
import { getBookingEngineService } from "@/modules/booking-engine/booking-engine.service";

export async function POST(request: Request) {
  const secret = process.env.TRANSFERCRM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        message: "Webhook secret is not configured yet.",
      },
      { status: 202 },
    );
  }

  const rawBody = await request.text();
  const timestamp = request.headers.get("X-Webhook-Timestamp");
  const signature = request.headers.get("X-Webhook-Signature");

  const verification = verifyTransferCrmWebhookSignature({
    rawBody,
    timestampHeader: timestamp,
    signatureHeader: signature,
    secret,
  });

  if (!verification.ok) {
    return NextResponse.json({ ok: false, message: verification.reason }, { status: 401 });
  }

  let event: TransferCrmWebhookEvent;
  try {
    event = JSON.parse(rawBody) as TransferCrmWebhookEvent;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (!isSupportedTransferCrmEvent(event)) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 202 });
  }

  const eventName = String(event.event ?? event.type ?? "");

  // Persist raw webhook for audit / replay while internal DB timeline is not finalized.
  // In serverless (e.g. Vercel), process.cwd() is read-only (/var/task), so we must write to os.tmpdir().
  try {
    const dir = path.join(os.tmpdir(), "way2go", "webhooks");
    await mkdir(dir, { recursive: true });
    await appendFile(
      path.join(dir, "transfercrm-webhooks.ndjson"),
      `${JSON.stringify({
        receivedAt: new Date().toISOString(),
        event: event.event ?? event.type,
        id: event.id,
        payload: event,
      })}\n`,
      "utf8",
    );
  } catch (persistErr) {
    console.error("[transfercrm-webhook] persist_failed", persistErr);
  }

  const bookingIdCandidate =
    event?.data && typeof event.data === "object" && "booking_id" in event.data
      ? (event.data as { booking_id?: string | number }).booking_id
      : event.id;

  if (bookingIdCandidate !== undefined && bookingIdCandidate !== null) {
    const providerBookingId = String(bookingIdCandidate);
    const statusCandidate =
      event?.data && typeof event.data === "object" && "status" in event.data
        ? (event.data as { status?: string }).status
        : undefined;
    const travelStatusCandidate =
      event?.data && typeof event.data === "object" && "travel_status" in event.data
        ? (event.data as { travel_status?: string }).travel_status
        : undefined;

    await getBookingEngineService().recordStatusEvent({
      providerBookingId,
      status: statusCandidate || eventName || "EVENT_RECEIVED",
      travelStatus: travelStatusCandidate,
      actor: "webhook.transfercrm",
      payload: {
        event: eventName,
        webhookId: event.id ? String(event.id) : undefined,
      },
    });
  }

  console.info("[transfercrm-webhook]", {
    event: eventName,
    id: event.id,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

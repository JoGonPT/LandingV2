import { NextResponse } from "next/server";
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

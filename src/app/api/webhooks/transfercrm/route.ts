import { NextResponse } from "next/server";
import {
  isSupportedTransferCrmEvent,
  TransferCrmWebhookEvent,
  verifyTransferCrmWebhookSignature,
} from "@/lib/transfercrm/webhook";

export async function POST(request: Request) {
  const secret = process.env.TRANSFERCRM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, message: "Webhook secret is not configured." }, { status: 500 });
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

  // TODO: Persist event to your internal order timeline or push notifications.
  console.info("[transfercrm-webhook]", {
    event: event.event ?? event.type,
    id: event.id,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

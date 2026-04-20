import { NextResponse } from "next/server";
import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import {
  isSupportedTransferCrmEvent,
  TransferCrmWebhookEvent,
  verifyTransferCrmWebhookSignature,
} from "@/lib/transfercrm/webhook";

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

  // Persist raw webhook for audit / replay while internal DB timeline is not finalized.
  try {
    const dir = path.join(process.cwd(), ".data");
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

  console.info("[transfercrm-webhook]", {
    event: event.event ?? event.type,
    id: event.id,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

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

/**
 * Eventos já processados, para não repetir trabalho quando o CRM reenvia.
 *
 * A API garante que o `event_id` se mantém igual entre tentativas — é o campo
 * indicado para deduplicar. Em memória: um reenvio chega tipicamente segundos
 * depois, e o custo de perder o registo num reinício é reprocessar um evento,
 * o que é inofensivo. Persistir isto exigiria uma tabela para pouco ganho.
 */
const eventosVistos = new Map<string, number>();
const JANELA_DEDUPE_MS = 10 * 60 * 1000;

function jaProcessado(eventId: string | undefined): boolean {
  if (!eventId) return false;
  const agora = Date.now();

  if (eventosVistos.size > 500) {
    for (const [k, t] of eventosVistos) {
      if (agora - t > JANELA_DEDUPE_MS) eventosVistos.delete(k);
    }
  }

  const visto = eventosVistos.get(eventId);
  if (visto !== undefined && agora - visto < JANELA_DEDUPE_MS) return true;

  eventosVistos.set(eventId, agora);
  return false;
}

export async function POST(request: Request) {
  const eventHeader = request.headers.get("X-Webhook-Event")?.trim() ?? "";
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

  const eventName = String(event.event ?? event.type ?? eventHeader ?? "");

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

  const dataObj = event?.data && typeof event.data === "object" ? (event.data as Record<string, unknown>) : null;
  const bookingIdCandidate =
    (dataObj?.booking_id as string | number | undefined) ??
    (dataObj?.id as string | number | undefined) ??
    (dataObj?.order_number as string | number | undefined) ??
    (dataObj?.external_reference as string | number | undefined) ??
    event.id;

  const eventId =
    request.headers.get("X-Webhook-Event-Id")?.trim() ||
    (typeof (event as { event_id?: unknown }).event_id === "string"
      ? String((event as { event_id?: unknown }).event_id)
      : undefined);

  if (jaProcessado(eventId)) {
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
  }

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

    // Nunca deixar uma falha aqui rejeitar a entrega. O evento **já** foi
    // recebido e a assinatura verificada; devolver 500 faz o CRM reenviar o
    // mesmo evento indefinidamente, sem que a repetição resolva o problema.
    // O `getCrmProvider()` chama o cliente do CRM, que lança se a configuração
    // faltar — foi assim que este handler passou a devolver 500 em produção.
    try {
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
    } catch (error) {
      console.error("[transfercrm-webhook] falha ao registar o evento", {
        event: eventName,
        eventId,
        bookingId: providerBookingId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.info("[transfercrm-webhook]", {
    event: eventName,
    id: event.id,
    bookingId: bookingIdCandidate != null ? String(bookingIdCandidate) : undefined,
    driverId: dataObj?.driver_id ?? undefined,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

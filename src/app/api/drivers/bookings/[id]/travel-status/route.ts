import { NextResponse } from "next/server";
import { z } from "zod";

import { requireDriverSessionCookie } from "@/lib/drivers/require-session";
import { postDriverStatusWebhook } from "@/lib/drivers/status-webhook";
import { createTransferCrmClientFromEnv } from "@/lib/transfercrm/TransferCrmApiClient";
import { TransferCrmHttpError } from "@/lib/transfercrm/http-core";
import { getBookingEngineService } from "@/modules/booking-engine/booking-engine.service";

const Body = z.object({
  travel_status: z.string().trim().min(1).max(64),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDriverSessionCookie();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  try {
    const client = createTransferCrmClientFromEnv();
    await client.patchBooking(id, { travel_status: body.travel_status });
    await getBookingEngineService().recordStatusEvent({
      providerBookingId: id,
      status: "STATUS_UPDATED",
      travelStatus: body.travel_status,
      actor: "driver",
      payload: { source: "driver_api" },
    });

    try {
      await postDriverStatusWebhook({
        booking_id: id,
        travel_status: body.travel_status,
        source: "driver_app",
      });
    } catch (whError) {
      console.error("Driver status webhook error:", whError);
      return NextResponse.json(
        { ok: true, warning: "Updated in TransferCRM but central webhook failed." },
        { status: 200 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof TransferCrmHttpError) {
      return NextResponse.json({ error: e.message, details: e.body }, { status: e.status });
    }
    throw e;
  }
}

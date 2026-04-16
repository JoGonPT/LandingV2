import { NextResponse } from "next/server";

import { normalizeBookingsList } from "@/lib/drivers/booking-json";
import { requireDriverSessionCookie } from "@/lib/drivers/require-session";
import { createTransferCrmClientFromEnv } from "@/lib/transfercrm/TransferCrmApiClient";
import { TransferCrmHttpError } from "@/lib/transfercrm/http-core";

export async function GET(req: Request) {
  try {
    await requireDriverSessionCookie();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = createTransferCrmClientFromEnv();
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? undefined;
    const raw = await client.listBookings(date ? { date } : undefined);
    const items = normalizeBookingsList(raw);
    return NextResponse.json({ data: items });
  } catch (e) {
    if (e instanceof TransferCrmHttpError) {
      return NextResponse.json({ error: e.message, details: e.body }, { status: e.status });
    }
    throw e;
  }
}

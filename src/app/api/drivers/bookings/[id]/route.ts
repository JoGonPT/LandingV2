import { NextResponse } from "next/server";

import { unwrapRecord } from "@/lib/drivers/booking-json";
import { requireDriverSessionCookie } from "@/lib/drivers/require-session";
import { createTransferCrmClientFromEnv } from "@/lib/transfercrm/TransferCrmApiClient";
import { TransferCrmHttpError } from "@/lib/transfercrm/http-core";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDriverSessionCookie();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }

  try {
    const client = createTransferCrmClientFromEnv();
    const raw = await client.getBooking(id);
    const data = unwrapRecord(raw);
    if (!data) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof TransferCrmHttpError) {
      return NextResponse.json({ error: e.message, details: e.body }, { status: e.status });
    }
    throw e;
  }
}

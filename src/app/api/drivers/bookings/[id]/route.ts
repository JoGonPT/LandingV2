import { NextResponse } from "next/server";

import { proxyDriverApiToNest } from "@/lib/drivers/driver-nest-proxy";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }
  return proxyDriverApiToNest(request, `/api/drivers/bookings/${encodeURIComponent(id)}`);
}

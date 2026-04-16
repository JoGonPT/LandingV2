import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { bookingRowMatchesPartner, normalizePartnerBookingRow } from "@/lib/partner/bookings-list";
import { PartnerAuthError, requirePartnerSession } from "@/lib/partner/require-partner-session";
import { normalizeBookingsList } from "@/lib/drivers/booking-json";
import { createTransferCrmClientFromEnv } from "@/lib/transfercrm/TransferCrmApiClient";
import { TransferCrmHttpError } from "@/lib/transfercrm/http-core";

const Query = z.object({
  slug: z.string().min(1),
  date: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = Query.parse({
      slug: url.searchParams.get("slug") ?? "",
      date: url.searchParams.get("date") ?? undefined,
    });
    const { slug, displayName } = await requirePartnerSession(parsed.slug);

    const client = createTransferCrmClientFromEnv();
    const raw = await client.listBookings(parsed.date ? { date: parsed.date } : undefined);
    const rows = normalizeBookingsList(raw);
    const mine = rows.filter((r) => bookingRowMatchesPartner(r, slug, displayName));
    const data = mine
      .map((r) => normalizePartnerBookingRow(r))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return NextResponse.json({ success: true as const, data });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ success: false, message: "Invalid query." }, { status: 400 });
    }
    if (e instanceof PartnerAuthError) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }
    if (e instanceof TransferCrmHttpError) {
      return NextResponse.json({ success: false, message: e.message }, { status: e.status });
    }
    throw e;
  }
}

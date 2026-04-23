import { NextResponse } from "next/server";
import { z } from "zod";

import { MasterAdminAuthError, requireMasterAdminSession } from "@/lib/internal-admin/require-master-admin";
import { FiscalService } from "@/modules/booking-engine/services/fiscal.service";
import { SupabaseService } from "@/modules/booking-engine/services/supabase.service";

const BodySchema = z.object({
  bookingId: z.string().min(1),
});

/**
 * Loads a `booking_orders` row and issues invoice when status is `COMPLETED` (Vendus via {@link FiscalService}).
 */
export async function POST(req: Request) {
  try {
    await requireMasterAdminSession();
  } catch (e) {
    if (e instanceof MasterAdminAuthError) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
    throw e;
  }

  let bookingId: string;
  try {
    bookingId = BodySchema.parse(await req.json()).bookingId;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid body." }, { status: 400 });
  }

  const supabase = SupabaseService.fromEnv();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 503 });
  }

  const row = await supabase.getBookingOrderById(bookingId);
  if (!row) {
    return NextResponse.json({ ok: false, message: "Booking not found." }, { status: 404 });
  }

  const fiscal = new FiscalService();
  try {
    const result = await fiscal.issueInvoiceForCompletedBooking(row);
    if (!result) {
      return NextResponse.json(
        { ok: false, message: "Invoice not issued (booking must be COMPLETED)." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[api/faturamento/issue-for-booking]", message);
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}

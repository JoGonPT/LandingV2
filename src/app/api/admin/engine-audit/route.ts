import { NextResponse } from "next/server";

import { MasterAdminAuthError, requireMasterAdminSession } from "@/lib/internal-admin/require-master-admin";
import { BookingRepository } from "@/modules/booking-engine/repositories/bookings.repo";
import { SupabaseService } from "@/modules/booking-engine/services/supabase.service";

export async function GET() {
  try {
    await requireMasterAdminSession();
  } catch (e) {
    if (e instanceof MasterAdminAuthError) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }
    throw e;
  }

  const supabase = SupabaseService.fromEnv();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const repo = new BookingRepository(supabase);
  const summary = await repo.getEngineAuditSummary();

  return NextResponse.json({
    ok: true as const,
    mode: String(process.env.BOOKING_ENGINE_MODE ?? "SHADOW_MODE").toUpperCase(),
    data: summary,
  });
}

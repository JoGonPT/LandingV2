import { NextResponse } from "next/server";

import { fetchCrmBookingsForDriver, type DriverBookingScope } from "@/lib/drivers/crm-driver-bookings";
import { getDriverTransferCrmIdForRequest } from "@/lib/drivers/config";
import { mapItemsToJobDtos } from "@/lib/drivers/job-dto";
import { requireDriverSessionCookie } from "@/lib/drivers/require-session";
import { TransferCrmHttpError } from "@/lib/transfercrm/http-core";

/**
 * Driver PWA: scoped jobs with proxy assignment (CRM + Supabase + external_reference).
 * Query:
 * - `mode=schedule` — all statuses for this driver (dashboard sections).
 * - `mode=active` (default) — confirmed + in_progress.
 * - `mode=confirmed` — status confirmed only (strict).
 * - `date=YYYY-MM-DD` — optional TransferCRM list filter.
 */
export async function GET(req: Request) {
  try {
    await requireDriverSessionCookie();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const driverId = await getDriverTransferCrmIdForRequest();
  if (!driverId) {
    return NextResponse.json(
      {
        error:
          "Driver portal is not configured (set profiles.transfercrm_driver_id for this user or DRIVER_TRANSFERCRM_ID).",
        code: "DRIVER_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date")?.trim() || undefined;
  const mode = (url.searchParams.get("mode") ?? "active").toLowerCase();

  let scope: DriverBookingScope;
  if (mode === "schedule" || mode === "all") {
    scope = "all";
  } else if (mode === "confirmed") {
    scope = "confirmed_only";
  } else {
    scope = "active";
  }

  try {
    const items = await fetchCrmBookingsForDriver(driverId, { date, scope });
    const jobs = mapItemsToJobDtos(items);
    return NextResponse.json({
      jobs,
      polledAt: new Date().toISOString(),
      mode: scope === "all" ? "schedule" : scope === "confirmed_only" ? "confirmed" : "active",
    });
  } catch (e) {
    if (e instanceof TransferCrmHttpError) {
      return NextResponse.json({ error: e.message, details: e.body }, { status: e.status });
    }
    throw e;
  }
}

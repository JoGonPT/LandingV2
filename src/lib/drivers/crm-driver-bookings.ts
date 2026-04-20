import {
  bookingMatchesDriverProxy,
  bookingRecordFromListItem,
} from "@/lib/drivers/assignment";
import { normalizeBookingsList } from "@/lib/drivers/booking-json";
import { getDriverBookingExternalRefToken } from "@/lib/drivers/config";
import { fetchDriverAssignmentBookingIds } from "@/lib/drivers/supabase-assignments";
import { createTransferCrmClientFromEnv } from "@/lib/transfercrm/TransferCrmApiClient";
import { TransferCrmHttpError } from "@/lib/transfercrm/http-core";

export type DriverBookingScope = "all" | "active" | "confirmed_only";

/** Active = jobs the chauffeur is expected to execute now or soon. */
function statusMatchesScope(statusRaw: unknown, scope: DriverBookingScope): boolean {
  const s = String(statusRaw ?? "")
    .toLowerCase()
    .trim();
  if (scope === "all") return true;
  if (scope === "confirmed_only") return s === "confirmed";
  if (scope === "active") return s === "confirmed" || s === "in_progress";
  return true;
}

export async function fetchCrmBookingsForDriver(
  driverId: string,
  options: {
    date?: string;
    scope: DriverBookingScope;
  },
): Promise<unknown[]> {
  const client = createTransferCrmClientFromEnv();
  const query: Record<string, string | undefined> = {
    driver_id: driverId,
    ...(options.date ? { date: options.date } : {}),
  };

  let raw: unknown;
  try {
    raw = await client.listBookings(query);
  } catch (e) {
    if (e instanceof TransferCrmHttpError && (e.status === 400 || e.status === 422)) {
      raw = await client.listBookings(options.date ? { date: options.date } : undefined);
    } else {
      throw e;
    }
  }

  let items = normalizeBookingsList(raw);
  const [dbIds, refToken] = await Promise.all([
    fetchDriverAssignmentBookingIds(driverId),
    Promise.resolve(getDriverBookingExternalRefToken()),
  ]);

  items = items.filter((item) => {
    const rec = bookingRecordFromListItem(item);
    return rec ? bookingMatchesDriverProxy(rec, driverId, { dbBookingIds: dbIds, externalRefToken: refToken }) : false;
  });

  if (options.scope !== "all") {
    items = items.filter((item) => {
      const rec = bookingRecordFromListItem(item);
      return rec ? statusMatchesScope(rec.status, options.scope) : false;
    });
  }

  return items;
}

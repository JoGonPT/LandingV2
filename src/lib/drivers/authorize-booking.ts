import { bookingMatchesDriverProxy } from "@/lib/drivers/assignment";
import { getDriverBookingExternalRefToken } from "@/lib/drivers/config";
import { fetchDriverAssignmentBookingIds } from "@/lib/drivers/supabase-assignments";

export async function driverOwnsBookingRecord(data: Record<string, unknown>, driverId: string): Promise<boolean> {
  const [dbIds, refToken] = await Promise.all([
    fetchDriverAssignmentBookingIds(driverId),
    Promise.resolve(getDriverBookingExternalRefToken()),
  ]);
  return bookingMatchesDriverProxy(data, driverId, { dbBookingIds: dbIds, externalRefToken: refToken });
}

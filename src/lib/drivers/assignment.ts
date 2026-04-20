/**
 * Normalize TransferCRM booking payloads to determine assigned driver id.
 * Supports common shapes: top-level driver_id, assigned_driver_id, nested driver.id / driver_id.
 */

function asNonEmptyString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  return null;
}

function driverObjectId(driver: unknown): string | null {
  if (!driver || typeof driver !== "object") return null;
  const o = driver as Record<string, unknown>;
  return (
    asNonEmptyString(o.id) ??
    asNonEmptyString(o.driver_id) ??
    (typeof o.user_id === "number" || typeof o.user_id === "string" ? asNonEmptyString(o.user_id) : null)
  );
}

/** Extract CRM driver id from a booking record (list or detail envelope `data`). */
export function getAssignedDriverId(booking: Record<string, unknown>): string | null {
  const top =
    asNonEmptyString(booking.driver_id) ??
    asNonEmptyString(booking.assigned_driver_id) ??
    asNonEmptyString(booking.driverId);

  if (top) return top;

  const nested = driverObjectId(booking.driver);
  if (nested) return nested;

  return null;
}

export function normalizeDriverIdForCompare(configured: string): string {
  return configured.trim();
}

export function bookingBelongsToDriver(booking: Record<string, unknown>, configuredDriverId: string): boolean {
  const assigned = getAssignedDriverId(booking);
  if (!assigned) return false;
  return assigned === normalizeDriverIdForCompare(configuredDriverId);
}

function bookingIdString(booking: Record<string, unknown>): string | null {
  const id = booking.booking_id;
  if (typeof id === "number" && Number.isFinite(id)) return String(Math.trunc(id));
  if (typeof id === "string" && id.trim().length > 0) return id.trim();
  return null;
}

function externalReference(booking: Record<string, unknown>): string | null {
  const v = booking.external_reference;
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/**
 * Partner-centric proxy: CRM assignment + optional DB mapping + external_reference token
 * (e.g. substring unique to this driver deployment).
 */
export function bookingMatchesDriverProxy(
  booking: Record<string, unknown>,
  driverId: string,
  ctx: {
    dbBookingIds?: Set<string>;
    externalRefToken?: string | null;
  },
): boolean {
  if (bookingBelongsToDriver(booking, driverId)) return true;

  const bid = bookingIdString(booking);
  if (bid && ctx.dbBookingIds?.has(bid)) return true;

  const ref = externalReference(booking);
  const token = ctx.externalRefToken?.trim();
  if (ref && token && ref.includes(token)) return true;

  const norm = normalizeDriverIdForCompare(driverId);
  if (ref && norm && ref.includes(`W2G-DRV-${norm}`)) return true;

  return false;
}

/** Coerce list item to record for assignment checks. */
export function bookingRecordFromListItem(item: unknown): Record<string, unknown> | null {
  if (!item || typeof item !== "object") return null;
  return item as Record<string, unknown>;
}

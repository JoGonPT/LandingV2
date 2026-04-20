/** Normalized job row for the driver PWA (list + polling). */
export type DriverJobDto = {
  booking_id: number | null;
  order_number: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  pickup_date: string | null;
  status: string | null;
  travel_status: string | null;
  tracking_url: string | null;
};

function pickString(r: Record<string, unknown>, key: string): string | null {
  const v = r[key];
  if (typeof v === "string" && v.trim().length > 0) return v;
  return null;
}

function pickNumber(r: Record<string, unknown>, key: string): number | null {
  const v = r[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

export function toDriverJobDto(raw: unknown): DriverJobDto | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const booking_id = pickNumber(r, "booking_id");
  const ts = r.travel_status;
  const travel_status =
    typeof ts === "string" ? ts : ts != null && ts !== "" ? String(ts) : null;
  return {
    booking_id,
    order_number: pickString(r, "order_number"),
    pickup_location: pickString(r, "pickup_location"),
    dropoff_location: pickString(r, "dropoff_location"),
    pickup_date: pickString(r, "pickup_date"),
    status: pickString(r, "status"),
    travel_status,
    tracking_url: pickString(r, "tracking_url"),
  };
}

export function mapItemsToJobDtos(items: unknown[]): DriverJobDto[] {
  return items.map(toDriverJobDto).filter((j): j is DriverJobDto => j != null && j.booking_id != null);
}

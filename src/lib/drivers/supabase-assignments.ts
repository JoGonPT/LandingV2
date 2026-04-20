/**
 * Load booking ids assigned to a driver_key from Supabase (optional).
 * Uses PostgREST; no @supabase/supabase-js dependency.
 */
export async function fetchDriverAssignmentBookingIds(driverKey: string): Promise<Set<string>> {
  const base = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!base || !key || !driverKey) return new Set();

  const filter = `driver_key=eq.${encodeURIComponent(driverKey)}`;
  const url = `${base}/rest/v1/driver_booking_assignments?${filter}&select=transfercrm_booking_id`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return new Set();
    const rows = (await res.json()) as { transfercrm_booking_id?: string }[];
    if (!Array.isArray(rows)) return new Set();
    return new Set(rows.map((r) => String(r.transfercrm_booking_id ?? "")).filter((s) => s.length > 0));
  } catch {
    return new Set();
  }
}

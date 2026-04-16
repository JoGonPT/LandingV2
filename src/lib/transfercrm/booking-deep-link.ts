import { getTransferCrmConfig } from "@/lib/transfercrm/config";

/**
 * Optional: `TRANSFERCRM_BOOKING_URL_TEMPLATE` with `{id}` or `{bookingId}` placeholders, e.g.
 * `https://your-tenant.transfercrm.com/admin/bookings/{id}`
 */
export function buildTransferCrmBookingUrl(bookingId: string): string | null {
  const id = bookingId.trim();
  if (!id) return null;

  const tmpl = process.env.TRANSFERCRM_BOOKING_URL_TEMPLATE?.trim();
  if (tmpl) {
    return tmpl.replaceAll("{id}", encodeURIComponent(id)).replaceAll("{bookingId}", encodeURIComponent(id));
  }

  try {
    const { baseUrl } = getTransferCrmConfig();
    const u = new URL(baseUrl.includes("://") ? baseUrl : `https://${baseUrl}`);
    const path = u.pathname.replace(/\/api\/v2\/?$/i, "").replace(/\/+$/, "");
    const basePath = path && path !== "/" ? path : "";
    return `${u.origin}${basePath}/bookings/${encodeURIComponent(id)}`;
  } catch {
    return null;
  }
}

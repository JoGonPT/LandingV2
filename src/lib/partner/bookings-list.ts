import { partnerExternalReferencePrefix } from "@/lib/transfercrm/booking-mappers";

export type PartnerBookingListItem = {
  id: string;
  orderNumber?: string;
  status?: string;
  externalReference?: string;
  pickupDate?: string;
  price?: string;
  currency?: string;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

export function normalizePartnerBookingRow(raw: unknown): PartnerBookingListItem | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = row.booking_id ?? row.id ?? row.bookingId;
  if (id === undefined || id === null) return null;
  return {
    id: String(id),
    orderNumber: row.order_number != null ? String(row.order_number) : row.orderNumber != null ? String(row.orderNumber) : undefined,
    status:
      row.status != null
        ? String(row.status)
        : row.travel_status != null
          ? String(row.travel_status)
          : undefined,
    externalReference:
      row.external_reference != null
        ? String(row.external_reference)
        : row.externalReference != null
          ? String(row.externalReference)
          : undefined,
    pickupDate:
      row.pickup_date != null
        ? String(row.pickup_date)
        : row.pickupDate != null
          ? String(row.pickupDate)
          : undefined,
    price: row.price != null && row.price !== undefined ? String(row.price) : undefined,
    currency: row.currency != null ? String(row.currency) : undefined,
  };
}

/** Account bookings use `B2B-REF-{slug}-…`; Stripe bookings use `pi_…` but repeat the partner line in CRM notes. */
export function bookingRowMatchesPartner(raw: unknown, partnerSlug: string, partnerDisplayName: string): boolean {
  const row = normalizePartnerBookingRow(raw);
  if (!row) return false;
  const prefix = partnerExternalReferencePrefix(partnerSlug);
  if ((row.externalReference ?? "").startsWith(prefix)) return true;
  const rec = asRecord(raw);
  const notesStr = rec?.notes != null ? String(rec.notes) : "";
  return notesStr.includes(`B2B Booking - Partner: ${partnerDisplayName}`);
}

/** On-account B2B bookings (usage tracked in partner credit). */
export function bookingRowIsPayOnAccount(raw: unknown): boolean {
  const row = normalizePartnerBookingRow(raw);
  if (!row) return false;
  if ((row.externalReference ?? "").startsWith("B2B-REF-")) return true;
  const rec = asRecord(raw);
  const notesStr = rec?.notes != null ? String(rec.notes) : "";
  return notesStr.includes("Payment: Account");
}

export function bookingSortKeyDesc(raw: unknown): number {
  const n = normalizePartnerBookingRow(raw);
  if (!n?.pickupDate) return 0;
  const t = Date.parse(n.pickupDate);
  return Number.isFinite(t) ? t : 0;
}

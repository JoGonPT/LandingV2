import { NextResponse } from "next/server";
import { createPublicBookingsStoreFromEnv } from "@/lib/booking/public-bookings-store";
import { getTransferCrmApiClient } from "@/lib/transfercrm/client";
import { generateStripePaymentLink } from "@/lib/payments/payment-link.service";
import { sendPaymentLinkEmail } from "@/lib/payments/payment-link-email.service";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseAmount(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function customerFromUnknown(input: unknown): { name?: string; email?: string; phone?: string } {
  if (!input || typeof input !== "object") return {};
  const obj = input as Record<string, unknown>;
  return {
    name: asString(obj.name),
    email: asString(obj.email),
    phone: asString(obj.phone),
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, code: "BAD_REQUEST", message: "Invalid JSON body." }, { status: 400 });
  }
  const bookingId = asString((body as Record<string, unknown>)?.bookingId);
  if (!bookingId) {
    return NextResponse.json(
      { success: false, code: "VALIDATION_ERROR", message: "bookingId is required." },
      { status: 400 },
    );
  }

  const store = createPublicBookingsStoreFromEnv();
  if (!store) {
    return NextResponse.json(
      { success: false, code: "PERSISTENCE_CONFIG", message: "Supabase store is not configured." },
      { status: 503 },
    );
  }

  let row = await store.getByCrmBookingId(bookingId);
  if (!row) {
    row = await store.getById(bookingId);
  }
  if (!row) {
    return NextResponse.json(
      { success: false, code: "NOT_FOUND", message: "Booking not found in local store." },
      { status: 404 },
    );
  }

  const customer = customerFromUnknown(row.customer);
  if (!customer.email) {
    return NextResponse.json(
      { success: false, code: "MISSING_EMAIL", message: "Customer email not found for this booking." },
      { status: 422 },
    );
  }

  const amount = parseAmount(row.price);
  const currency = (row.currency ?? "EUR").trim().toUpperCase();
  if (amount == null) {
    return NextResponse.json(
      { success: false, code: "MISSING_AMOUNT", message: "Booking amount not available." },
      { status: 422 },
    );
  }

  const crmBookingId = row.crm_booking_id?.trim() || bookingId;
  const paymentUrl = await generateStripePaymentLink(
    crmBookingId,
    amount,
    currency,
    `Way2Go transfer ${row.pickup} -> ${row.dropoff} (${row.trip_date} ${row.trip_time})`,
  );

  await sendPaymentLinkEmail(customer.email, paymentUrl, {
    bookingId: crmBookingId,
    pickup: row.pickup,
    dropoff: row.dropoff,
    tripDate: row.trip_date,
    tripTime: row.trip_time,
    amount,
    currency,
  });

  const crm = getTransferCrmApiClient();
  const note = "[LINK ENVIADO] Link de pagamento Stripe gerado e enviado por email.";
  try {
    await crm.patchBooking(crmBookingId, { notes: note });
  } catch {
    // Do not fail the operation if CRM note update fails.
  }

  try {
    await store.patch(row.id, {
      sync_error: null,
      crm_status: row.crm_status ?? "PENDING_PAYMENT",
      updated_at: new Date().toISOString(),
    });
  } catch {
    // best effort
  }

  return NextResponse.json({
    success: true,
    bookingId: crmBookingId,
    email: customer.email,
    paymentUrl,
  });
}


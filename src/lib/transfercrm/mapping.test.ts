import { describe, expect, it, vi } from "vitest";
import {
  createExternalReference,
  mapBookingToB2bBookBody,
  resolveB2BExternalReference,
  toIsoDateTimeUtc,
} from "@/lib/transfercrm/mapping";
import { BookingPayload } from "@/lib/transfercrm/types";

const sample: BookingPayload = {
  locale: "pt",
  route: {
    pickup: "Lisboa Aeroporto",
    dropoff: "Cascais",
    date: "2026-04-30",
    time: "15:30",
    childSeat: true,
    flightNumber: "TP123",
  },
  details: {
    passengers: 2,
    luggage: 3,
    notes: "Cliente VIP",
    distanceKm: 25.5,
  },
  contact: {
    fullName: "Joao Test",
    email: "joao@example.com",
    phone: "+351900000000",
  },
  gdprAccepted: true,
};

describe("transfercrm B2B mapping", () => {
  it("maps booking to v2 /book body", () => {
    const body = mapBookingToB2bBookBody(sample);
    expect(body.pickup_location).toBe("Lisboa Aeroporto");
    expect(body.dropoff_location).toBe("Cascais");
    expect(body.passenger_name).toBe("Joao Test");
    expect(body.passenger_phone).toBe("+351900000000");
    expect(body.passenger_email).toBe("joao@example.com");
    expect(body.flight_number).toBe("TP123");
    expect(body.passengers_count).toBe(2);
    expect(body.distance_km).toBe(25.5);
    expect(body.notes).toContain("Cliente VIP");
    expect(body.notes).toContain("Child seat requested");
    expect(body.notes).toContain("Luggage pieces: 3");
    expect(body.notes).toContain("Locale: pt");
    expect(typeof body.external_reference).toBe("string");
    expect(String(body.external_reference)).toMatch(/^w2g_[a-f0-9]{24}$/);
    expect(typeof body.pickup_date).toBe("string");
  });

  it("produces ISO8601 pickup_date", () => {
    const iso = toIsoDateTimeUtc("2026-04-30", "15:30");
    expect(iso).toMatch(/2026-04-30T/);
    expect(iso.endsWith("Z")).toBe(true);
  });

  it("creates deterministic external_reference for idempotency", () => {
    const a = createExternalReference(sample);
    const b = createExternalReference(sample);
    expect(a).toBe(b);
  });

  it("uses internal order id for external_reference when provided", () => {
    const body = mapBookingToB2bBookBody({ ...sample, internalOrderId: "draft-123" });
    expect(body.external_reference).toMatch(/^w2g_ord_draft-123$/);
  });

  it("uses B2B-REF external_reference for pay-on-account partner bookings", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T12:00:00.000Z"));
    const partnerSample: BookingPayload = {
      ...sample,
      partnerBooking: {
        partnerDisplayName: "Hotel Lisboa",
        partnerRefId: "hotel-lisboa",
        paymentMethod: "account",
        internalReference: "PMS-999",
        vipRequests: "Late checkout coordination",
      },
    };
    const ref = resolveB2BExternalReference(partnerSample);
    expect(ref).toBe("B2B-REF-hotel-lisboa-1776340800000");

    const body = mapBookingToB2bBookBody(partnerSample);
    expect(body.external_reference).toBe(ref);
    expect(body.notes).toContain("B2B Booking - Partner: Hotel Lisboa - Payment: Account");
    expect(body.notes).toContain("Partner internal ref: PMS-999");
    expect(body.notes).toContain("VIP / special requests: Late checkout coordination");
    vi.useRealTimers();
  });

  it("keeps hashed external_reference for Stripe partner bookings (PI supplied at paid checkout)", () => {
    const partnerStripe: BookingPayload = {
      ...sample,
      partnerBooking: {
        partnerDisplayName: "Hotel Lisboa",
        partnerRefId: "hotel-lisboa",
        paymentMethod: "stripe",
      },
    };
    const body = mapBookingToB2bBookBody(partnerStripe);
    expect(String(body.external_reference)).toMatch(/^w2g_[a-f0-9]{24}$/);
    expect(body.notes).toContain("B2B Booking - Partner: Hotel Lisboa - Payment: Stripe");
  });
});

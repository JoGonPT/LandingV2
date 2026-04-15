import { describe, expect, it } from "vitest";
import { validateBookingPayload } from "@/lib/transfercrm/validation";

describe("booking payload validation", () => {
  it("rejects payload without gdpr acceptance", () => {
    const result = validateBookingPayload({
      locale: "pt",
      route: { pickup: "A", dropoff: "B", date: "2026-05-01", time: "10:00", childSeat: false },
      details: { passengers: 1, luggage: 0 },
      contact: { fullName: "Name", email: "mail@test.com", phone: "+351999999999" },
      gdprAccepted: false,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts valid payload", () => {
    const result = validateBookingPayload({
      locale: "en",
      route: { pickup: "A", dropoff: "B", date: "2026-05-01", time: "10:00", childSeat: false },
      details: { passengers: 1, luggage: 0 },
      contact: { fullName: "Name", email: "mail@test.com", phone: "+351999999999" },
      gdprAccepted: true,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts optional distanceKm", () => {
    const result = validateBookingPayload({
      locale: "en",
      route: { pickup: "A", dropoff: "B", date: "2026-05-01", time: "10:00", childSeat: false },
      details: { passengers: 1, luggage: 0, distanceKm: 12.4 },
      contact: { fullName: "Name", email: "mail@test.com", phone: "+351999999999" },
      gdprAccepted: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.details.distanceKm).toBe(12.4);
    }
  });

  it("rejects invalid distanceKm", () => {
    const result = validateBookingPayload({
      locale: "en",
      route: { pickup: "A", dropoff: "B", date: "2026-05-01", time: "10:00", childSeat: false },
      details: { passengers: 1, luggage: 0, distanceKm: -1 },
      contact: { fullName: "Name", email: "mail@test.com", phone: "+351999999999" },
      gdprAccepted: true,
    });
    expect(result.ok).toBe(false);
  });
});

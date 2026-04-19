import { describe, expect, it, vi } from "vitest";

import { Way2GoNativeProvider } from "@/modules/booking-engine/providers/way2go-native.provider";
import type { SupabaseService } from "@/modules/booking-engine/services/supabase.service";

function basePayload(distanceKm: number) {
  return {
    locale: "pt" as const,
    route: {
      pickup: "Lisboa",
      dropoff: "Porto",
      date: "2026-04-20",
      time: "10:00",
      childSeat: false,
    },
    details: {
      passengers: 2,
      luggage: 1,
      distanceKm,
    },
    contact: {
      fullName: "Test User",
      email: "test@example.com",
      phone: "+351900000000",
    },
    gdprAccepted: true,
    vehicleType: "business",
  };
}

describe("Way2GoNativeProvider.quote", () => {
  it("uses formula base_fee + distance_km * per_km_rate", async () => {
    const supabase = {
      getRateCardByVehicleClass: vi.fn().mockResolvedValue({
        id: "rc_business_eur_pt",
        vehicle_class: "BUSINESS",
        base_fee: 8,
        per_km_rate: 1.2,
        min_fare: 20,
        currency: "EUR",
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    } as unknown as SupabaseService;

    const provider = new Way2GoNativeProvider(supabase);
    const quote = await provider.quote({ payload: basePayload(30), vehicleType: "business" });

    expect(quote.price).toBe(44); // 8 + 30*1.2
    expect(quote.currency).toBe("EUR");
    expect(quote.vehicle_type).toBe("BUSINESS");
  });

  it("respects min_fare when computed subtotal is lower", async () => {
    const supabase = {
      getRateCardByVehicleClass: vi.fn().mockResolvedValue({
        id: "rc_business_eur_pt",
        vehicle_class: "BUSINESS",
        base_fee: 8,
        per_km_rate: 1.2,
        min_fare: 20,
        currency: "EUR",
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    } as unknown as SupabaseService;

    const provider = new Way2GoNativeProvider(supabase);
    const quote = await provider.quote({ payload: basePayload(5), vehicleType: "business" });

    expect(quote.price).toBe(20); // max(8 + 5*1.2 = 14, 20)
  });
});

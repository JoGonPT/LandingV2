import { describe, expect, it, vi } from "vitest";

import { Way2GoNativeProvider } from "@/modules/booking-engine/providers/way2go-native.provider";
import type { SupabaseService } from "@/modules/booking-engine/services/supabase.service";
import type { AssignmentService } from "@/modules/booking-engine/services/assignment.service";
import type { RoutingService } from "@/modules/booking-engine/services/routing.service";

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

    const routing = {
      resolveDistanceKm: vi.fn().mockResolvedValue({ distanceKm: 30, source: "request" as const }),
    } as unknown as RoutingService;
    const provider = new Way2GoNativeProvider(supabase, undefined, routing);
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

    const routing = {
      resolveDistanceKm: vi.fn().mockResolvedValue({ distanceKm: 5, source: "request" as const }),
    } as unknown as RoutingService;
    const provider = new Way2GoNativeProvider(supabase, undefined, routing);
    const quote = await provider.quote({ payload: basePayload(5), vehicleType: "business" });

    expect(quote.price).toBe(20); // max(8 + 5*1.2 = 14, 20)
  });

  it("uses routing service distance when available", async () => {
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
    const routing = {
      resolveDistanceKm: vi.fn().mockResolvedValue({ distanceKm: 40, source: "osrm" as const }),
    } as unknown as RoutingService;

    const provider = new Way2GoNativeProvider(supabase, undefined, routing);
    const quote = await provider.quote({ payload: basePayload(5), vehicleType: "business" });

    expect(quote.distance_km).toBe(40);
    expect(quote.price).toBe(56); // 8 + 40*1.2
  });
});

describe("Way2GoNativeProvider.create", () => {
  it("sets ASSIGNED status when assignment succeeds", async () => {
    const upsertBookingOrder = vi.fn().mockResolvedValue({});
    const patchBookingOrderById = vi.fn().mockResolvedValue({});
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
      upsertBookingOrder,
      patchBookingOrderById,
      getBookingOrderByProviderBookingId: vi.fn().mockResolvedValue({ id: "bo_test_1" }),
    } as unknown as SupabaseService;
    const assignment = {
      assignDriver: vi.fn().mockResolvedValue({
        assigned: true,
        assignmentId: "dba_1",
        driverId: "drv_1",
      }),
    } as unknown as AssignmentService;

    const provider = new Way2GoNativeProvider(supabase, assignment);
    const created = await provider.create({ payload: basePayload(10) });

    expect(created.status).toBe("ASSIGNED");
    expect(assignment.assignDriver).toHaveBeenCalledTimes(1);
    expect(patchBookingOrderById).toHaveBeenCalledTimes(1);
  });

  it("keeps PENDING_INTERNAL_PROCESSING when no driver is assigned", async () => {
    const upsertBookingOrder = vi.fn().mockResolvedValue({});
    const patchBookingOrderById = vi.fn().mockResolvedValue({});
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
      upsertBookingOrder,
      patchBookingOrderById,
      getBookingOrderByProviderBookingId: vi.fn().mockResolvedValue({ id: "bo_test_2" }),
    } as unknown as SupabaseService;
    const assignment = {
      assignDriver: vi.fn().mockResolvedValue({
        assigned: false,
      }),
    } as unknown as AssignmentService;

    const provider = new Way2GoNativeProvider(supabase, assignment);
    const created = await provider.create({ payload: basePayload(10) });

    expect(created.status).toBe("PENDING_INTERNAL_PROCESSING");
    expect(assignment.assignDriver).toHaveBeenCalledTimes(1);
    expect(patchBookingOrderById).not.toHaveBeenCalled();
  });
});

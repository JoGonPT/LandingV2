import { afterEach, describe, expect, it, vi } from "vitest";

import type { BookingPayload } from "@/lib/transfercrm/types";
import type { IBookingProvider } from "@/modules/booking-engine/ports/booking-provider.port";
import { BookingEngineService } from "@/modules/booking-engine/booking-engine.service";
import type { BookingRepository } from "@/modules/booking-engine/repositories/bookings.repo";

const basePayload: BookingPayload = {
  locale: "pt",
  route: {
    pickup: "Lisboa",
    dropoff: "Porto",
    date: "2026-04-21",
    time: "09:30",
    childSeat: false,
  },
  details: {
    passengers: 2,
    luggage: 1,
    distanceKm: 300,
  },
  contact: {
    fullName: "Test User",
    email: "test@example.com",
    phone: "+351900000000",
  },
  gdprAccepted: true,
};

function providerStub(overrides?: Partial<IBookingProvider>): IBookingProvider {
  return {
    name: "TRANSFER_CRM",
    quote: vi.fn(async () => ({ price: 100, currency: "EUR", distance_km: 300 })),
    getVehicleOptions: vi.fn(async () => ({
      available: true,
      vehicleOptions: [],
      pickupLocation: "Lisboa",
      dropoffLocation: "Porto",
      pickupDate: "2026-04-21T09:30:00",
    })),
    create: vi.fn(async () => ({ bookingId: "123", status: "CONFIRMED" })),
    getById: vi.fn(async () => null),
    cancel: vi.fn(async () => ({ bookingId: "123", cancelled: true })),
    updateStatus: vi.fn(async () => ({ bookingId: "123" })),
    ...overrides,
  };
}

afterEach(() => {
  delete process.env.BOOKING_ENGINE_MODE;
  delete process.env.BOOKING_ENGINE_NATIVE_RATIO;
  vi.restoreAllMocks();
});

describe("BookingEngineService shadow mode", () => {
  it("returns primary quote while invoking shadow quote in parallel", async () => {
    const primary = providerStub({
      quote: vi.fn(async () => ({ price: 120, currency: "EUR", distance_km: 300 })),
    });
    const shadow = providerStub({
      name: "WAY2GO_NATIVE",
      quote: vi.fn(async () => ({ price: 140, currency: "EUR", distance_km: 300 })),
    });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const service = new BookingEngineService(primary, shadow);
    const result = await service.quote(basePayload, "business");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.price).toBe(120);
    expect(primary.quote).toHaveBeenCalledTimes(1);
    expect(shadow.quote).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      "[booking-engine.shadow-quote]",
      expect.objectContaining({
        primaryProvider: "TRANSFER_CRM",
        shadowProvider: "WAY2GO_NATIVE",
        primaryPrice: 120,
        shadowPrice: 140,
        delta: 20,
      }),
    );

    infoSpy.mockRestore();
  });

  it("persists pending internal processing on transient create failure", async () => {
    const transient = new TypeError("network failed");
    const primary = providerStub({
      create: vi.fn(async () => {
        throw transient;
      }),
    });
    const repo = {
      upsertMirror: vi.fn(async () => null),
    } as unknown as BookingRepository;
    const service = new BookingEngineService(primary, undefined, repo);

    await expect(service.create(basePayload)).rejects.toThrow("network failed");
    expect((repo.upsertMirror as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PENDING_INTERNAL_PROCESSING",
        provider: "TRANSFER_CRM",
      }),
    );
  });
});

describe("BookingEngineService engine mode routing", () => {
  it("uses native provider for create in STRICT_NATIVE mode", async () => {
    process.env.BOOKING_ENGINE_MODE = "STRICT_NATIVE";

    const crm = providerStub({
      name: "TRANSFER_CRM",
      create: vi.fn(async () => ({ bookingId: "crm_1", status: "CONFIRMED" })),
    });
    const native = providerStub({
      name: "WAY2GO_NATIVE",
      create: vi.fn(async () => ({ bookingId: "native_1", status: "CONFIRMED" })),
    });

    const repo = {
      upsertMirror: vi.fn(async () => null),
    } as unknown as BookingRepository;
    const service = new BookingEngineService(crm, native, repo);

    const created = await service.create(basePayload);
    expect(created.bookingId).toBe("native_1");
    expect(native.create).toHaveBeenCalledTimes(1);
    expect(crm.create).not.toHaveBeenCalled();
  });

  it("supports load balance mode using configured ratio", async () => {
    process.env.BOOKING_ENGINE_MODE = "LOAD_BALANCE";
    process.env.BOOKING_ENGINE_NATIVE_RATIO = "0.2";

    const crm = providerStub({
      name: "TRANSFER_CRM",
      create: vi.fn(async () => ({ bookingId: "crm_1", status: "CONFIRMED" })),
    });
    const native = providerStub({
      name: "WAY2GO_NATIVE",
      create: vi.fn(async () => ({ bookingId: "native_1", status: "CONFIRMED" })),
    });

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.1);
    const repo = {
      upsertMirror: vi.fn(async () => null),
    } as unknown as BookingRepository;
    const service = new BookingEngineService(crm, native, repo);

    const created = await service.create(basePayload);
    expect(created.bookingId).toBe("native_1");
    expect(native.create).toHaveBeenCalledTimes(1);
    expect(crm.create).not.toHaveBeenCalled();
    expect(randomSpy).toHaveBeenCalled();
  });
});

import type {
  BookingCreateInput,
  BookingCreateResult,
  BookingGetInput,
  BookingGetResult,
  BookingProviderName,
  BookingQuoteInput,
  BookingQuoteResult,
  BookingVehiclesInput,
  BookingVehiclesResult,
  CancelBookingInput,
  CancelBookingResult,
  IBookingProvider,
  UpdateBookingStatusInput,
  UpdateBookingStatusResult,
} from "@/modules/booking-engine/ports/booking-provider.port";
import type { BookingPayload } from "@/lib/transfercrm/types";
import { SupabaseService } from "@/modules/booking-engine/services/supabase.service";
import { createExternalReference } from "@/lib/transfercrm/booking-mappers";
import { AssignmentService } from "@/modules/booking-engine/services/assignment.service";
import { RoutingService, type RouteDistanceResult } from "@/modules/booking-engine/services/routing.service";

function normalizeVehicleClass(vehicleType?: string): string {
  const raw = (vehicleType ?? "business").trim().toUpperCase();
  if (!raw) return "BUSINESS";
  if (raw.includes("FIRST")) return "FIRST";
  if (raw.includes("VAN")) return "VAN";
  return "BUSINESS";
}

function mirrorRowIdForIdempotencyKey(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);
  if (safe) return `bo_${safe}`;
  return `bo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export class Way2GoNativeProvider implements IBookingProvider {
  readonly name: BookingProviderName = "WAY2GO_NATIVE";

  private readonly assignmentService: AssignmentService;
  private readonly routingService: RoutingService;

  constructor(
    private readonly supabase: SupabaseService = (() => {
      const svc = SupabaseService.fromEnv();
      if (!svc) {
        throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Way2GoNativeProvider.");
      }
      return svc;
    })(),
    assignmentService?: AssignmentService,
    routingService?: RoutingService,
  ) {
    this.assignmentService = assignmentService ?? new AssignmentService(this.supabase);
    this.routingService = routingService ?? new RoutingService();
  }

  private parsePickupCoordinates(input: BookingPayload): { lat: number; lng: number } | undefined {
    const note = input.details.notes?.trim() ?? "";
    if (!note) return undefined;
    const re = /pickup_lat=(-?\d+(?:\.\d+)?),\s*pickup_lng=(-?\d+(?:\.\d+)?)/i;
    const m = re.exec(note);
    if (!m) return undefined;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    return { lat, lng };
  }

  async quote(input: BookingQuoteInput): Promise<BookingQuoteResult> {
    const vehicleClass = normalizeVehicleClass(input.vehicleType ?? input.payload.vehicleType);
    const payloadDistanceKm = Number(input.payload.details.distanceKm ?? 0);
    let routing: RouteDistanceResult | null = null;
    try {
      routing = await this.routingService.resolveDistanceKm({
        pickup: input.payload.route.pickup,
        dropoff: input.payload.route.dropoff,
        requestedDistanceKm: payloadDistanceKm,
      });
    } catch {
      routing = null;
    }
    const distanceKm = routing?.distanceKm ?? payloadDistanceKm;
    const rate = await this.supabase.getRateCardByVehicleClass(vehicleClass);
    if (!rate) {
      throw new Error(`No native rate card configured for vehicle class ${vehicleClass}.`);
    }

    const baseFee = Number(rate.base_fee);
    const perKmRate = Number(rate.per_km_rate);
    const minFare = Number(rate.min_fare);
    const subtotal = baseFee + Math.max(0, distanceKm) * perKmRate;
    const total = Math.max(subtotal, minFare);

    return {
      price: Number(total.toFixed(2)),
      currency: rate.currency,
      distance_km: distanceKm,
      vehicle_type: vehicleClass,
      breakdown: {
        base_fee: Number(baseFee.toFixed(2)),
        per_km_rate: Number(perKmRate.toFixed(2)),
        minimum_fare: Number(minFare.toFixed(2)),
      },
    };
  }

  async getVehicleOptions(input: BookingVehiclesInput): Promise<BookingVehiclesResult> {
    const desiredClass = normalizeVehicleClass(input.payload.vehicleType);
    const cards = await this.supabase.listRateCards();
    const slots = await this.supabase.countAvailableFleetSlots();
    const options = cards.map((card) => {
      const className = normalizeVehicleClass(card.vehicle_class);
      const baseEstimate = Number(card.min_fare);
      return {
        vehicleType: className,
        estimatedPrice: Number(baseEstimate.toFixed(2)),
        currency: card.currency,
        seatsAvailable: slots,
        includesDistance: true,
      };
    });

    const filtered = options.filter((o) => (desiredClass ? o.vehicleType === desiredClass : true));
    return {
      available: filtered.length > 0,
      vehicleOptions: filtered.length > 0 ? filtered : options,
      pickupLocation: input.payload.route.pickup,
      dropoffLocation: input.payload.route.dropoff,
      pickupDate: `${input.payload.route.date}T${input.payload.route.time}:00`,
    };
  }

  async create(input: BookingCreateInput): Promise<BookingCreateResult> {
    const idempotencyKey = input.payload.internalOrderId?.trim() || createExternalReference(input.payload);
    const quote = await this.quote({ payload: input.payload, vehicleType: input.payload.vehicleType });
    const providerBookingId = `native_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let status = "PENDING_INTERNAL_PROCESSING";
    await this.supabase.upsertBookingOrder({
      id: mirrorRowIdForIdempotencyKey(idempotencyKey),
      public_reference: idempotencyKey,
      provider: "WAY2GO_NATIVE",
      provider_booking_id: providerBookingId,
      status,
      idempotency_key: idempotencyKey,
      failover_reason: null,
      request_payload: input.payload,
      provider_response: { quote, native: true },
      last_error_code: null,
      last_error_message: null,
    });

    const assignment = await this.assignmentService.assignDriver({
      bookingId: providerBookingId,
      vehicleClass: normalizeVehicleClass(input.payload.vehicleType),
      pickupLat: this.parsePickupCoordinates(input.payload)?.lat,
      pickupLng: this.parsePickupCoordinates(input.payload)?.lng,
    });
    if (assignment.assigned) {
      status = "ASSIGNED";
      const row = await this.supabase.getBookingOrderByProviderBookingId("WAY2GO_NATIVE", providerBookingId);
      if (row) {
        await this.supabase.patchBookingOrderById(row.id, {
          status,
          updated_at: new Date().toISOString(),
        });
      }
    }

    return {
      bookingId: providerBookingId,
      orderNumber: idempotencyKey,
      status,
      price: quote.price !== undefined && quote.price !== null ? String(quote.price) : undefined,
      currency: quote.currency ?? undefined,
    };
  }

  async getById(input: BookingGetInput): Promise<BookingGetResult> {
    const row = await this.supabase.getBookingOrderByProviderBookingId("WAY2GO_NATIVE", input.bookingId);
    return row;
  }

  async cancel(input: CancelBookingInput): Promise<CancelBookingResult> {
    const row = await this.supabase.getBookingOrderByProviderBookingId("WAY2GO_NATIVE", input.bookingId);
    if (row) {
      await this.supabase.patchBookingOrderById(row.id, {
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      });
    }
    return {
      bookingId: input.bookingId,
      cancelled: true,
      status: "CANCELLED",
      providerRaw: row,
    };
  }

  async updateStatus(input: UpdateBookingStatusInput): Promise<UpdateBookingStatusResult> {
    const row = await this.supabase.getBookingOrderByProviderBookingId("WAY2GO_NATIVE", input.bookingId);
    if (row) {
      await this.supabase.patchBookingOrderById(row.id, {
        status: input.travelStatus.toUpperCase(),
        updated_at: new Date().toISOString(),
      });
    }
    return {
      bookingId: input.bookingId,
      status: input.travelStatus.toUpperCase(),
      travelStatus: input.travelStatus,
      providerRaw: row,
    };
  }
}

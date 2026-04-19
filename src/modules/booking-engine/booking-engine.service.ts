import type {
  BookingCreateResult,
  BookingQuoteResult,
  BookingVehiclesResult,
  IBookingProvider,
} from "@/modules/booking-engine/ports/booking-provider.port";
import { TransferCrmProvider } from "@/modules/booking-engine/providers/transfer-crm.provider";
import { Way2GoNativeProvider } from "@/modules/booking-engine/providers/way2go-native.provider";
import type { BookingPayload } from "@/lib/transfercrm/types";
import { BookingRepository } from "@/modules/booking-engine/repositories/bookings.repo";
import { SupabaseService } from "@/modules/booking-engine/services/supabase.service";
import { TransferCrmHttpError } from "@/lib/transfercrm/http-core";
import { createExternalReference } from "@/lib/transfercrm/booking-mappers";

function isTransientProviderError(error: unknown): boolean {
  if (error instanceof TransferCrmHttpError) {
    return error.status === 429 || error.status >= 500;
  }
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }
  return false;
}

export class BookingEngineService {
  constructor(
    private readonly provider: IBookingProvider, // primary
    private readonly shadowProvider?: IBookingProvider,
    private readonly bookingsRepo?: BookingRepository,
  ) {}

  async quote(payload: BookingPayload, vehicleType?: string): Promise<BookingQuoteResult> {
    const primaryPromise = this.provider.quote({ payload, vehicleType });
    const shadowPromise = this.shadowProvider?.quote({ payload, vehicleType });

    const primaryQuote = await primaryPromise;

    if (shadowPromise) {
      void shadowPromise
        .then((shadowQuote) => {
          const primary = Number(primaryQuote.price ?? NaN);
          const shadow = Number(shadowQuote.price ?? NaN);
          const delta = Number.isFinite(primary) && Number.isFinite(shadow) ? shadow - primary : null;
          console.info("[booking-engine.shadow-quote]", {
            primaryProvider: this.provider.name,
            shadowProvider: this.shadowProvider?.name,
            primaryPrice: Number.isFinite(primary) ? primary : null,
            shadowPrice: Number.isFinite(shadow) ? shadow : null,
            delta,
            vehicleType: vehicleType ?? payload.vehicleType ?? null,
          });
        })
        .catch((error: unknown) => {
          console.warn("[booking-engine.shadow-quote-failed]", {
            shadowProvider: this.shadowProvider?.name,
            error: error instanceof Error ? error.message : "Unknown shadow quote error",
          });
        });
    }

    return primaryQuote;
  }

  getVehicleOptions(payload: BookingPayload): Promise<BookingVehiclesResult> {
    return this.provider.getVehicleOptions({ payload });
  }

  async create(payload: BookingPayload): Promise<BookingCreateResult> {
    const idempotencyKey = payload.internalOrderId?.trim() || createExternalReference(payload);
    const payloadSnapshot = payload as unknown as Record<string, unknown>;
    try {
      const created = await this.provider.create({ payload });
      if (this.bookingsRepo) {
        await this.bookingsRepo.upsertMirror({
          idempotencyKey,
          requestPayload: payloadSnapshot,
          provider: this.provider.name,
          providerBookingId: created.bookingId,
          status: created.status || "CONFIRMED",
          orderReference: created.orderNumber,
          trackingUrl: created.trackingUrl,
        });
      }
      return created;
    } catch (error) {
      if (this.bookingsRepo && isTransientProviderError(error)) {
        await this.bookingsRepo.upsertMirror({
          idempotencyKey,
          requestPayload: payloadSnapshot,
          provider: this.provider.name,
          status: "PENDING_INTERNAL_PROCESSING",
          failoverReason: error instanceof Error ? error.message : "Transient provider failure",
          lastErrorCode: error instanceof TransferCrmHttpError ? String(error.status) : "NETWORK_OR_TIMEOUT",
          lastErrorMessage: error instanceof Error ? error.message : undefined,
        });
      }
      throw error;
    }
  }

  getById(bookingId: string): Promise<unknown> {
    return this.provider.getById({ bookingId });
  }

  async recordStatusEvent(input: {
    bookingId?: string;
    providerBookingId?: string;
    status: string;
    travelStatus?: string;
    actor?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.bookingsRepo) return;
    if (input.bookingId) {
      await this.bookingsRepo.appendStatusEvent({
        bookingId: input.bookingId,
        status: input.status,
        travelStatus: input.travelStatus,
        actor: input.actor,
        provider: this.provider.name,
        payload: input.payload,
      });
      return;
    }
    if (input.providerBookingId) {
      await this.bookingsRepo.createStatusEventByProviderBookingId({
        providerBookingId: input.providerBookingId,
        toStatus: input.status,
        travelStatus: input.travelStatus,
        actor: input.actor,
        provider: this.provider.name,
        eventPayload: input.payload,
      });
    }
  }

  async recordStatusEventByProviderBookingId(input: {
    providerBookingId: string;
    status: string;
    travelStatus?: string;
    actor?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.bookingsRepo) return;
    await this.bookingsRepo.createStatusEventByProviderBookingId({
      providerBookingId: input.providerBookingId,
      toStatus: input.status,
      travelStatus: input.travelStatus,
      actor: input.actor,
      provider: this.provider.name,
      eventPayload: input.payload,
    });
  }
}

let defaultService: BookingEngineService | null = null;
let defaultRepo: BookingRepository | null = null;
let defaultShadowProvider: IBookingProvider | null = null;

export function getBookingEngineService(provider?: IBookingProvider): BookingEngineService {
  const supabase = SupabaseService.fromEnv();
  if (provider) {
    if (!defaultRepo && supabase) {
      defaultRepo = new BookingRepository(supabase);
    }
    if (!defaultShadowProvider && supabase) {
      defaultShadowProvider = new Way2GoNativeProvider(supabase);
    }
    return new BookingEngineService(provider, defaultShadowProvider ?? undefined, defaultRepo ?? undefined);
  }
  if (!defaultService) {
    defaultRepo = supabase ? new BookingRepository(supabase) : null;
    defaultShadowProvider = supabase ? new Way2GoNativeProvider(supabase) : null;
    defaultService = new BookingEngineService(
      new TransferCrmProvider(),
      defaultShadowProvider ?? undefined,
      defaultRepo ?? undefined,
    );
  }
  return defaultService;
}


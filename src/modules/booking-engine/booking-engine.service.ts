import type {
  BookingCreateResult,
  BookingQuoteResult,
  UpdateBookingStatusResult,
  BookingVehiclesResult,
  IBookingProvider,
} from "@/modules/booking-engine/ports/booking-provider.port";
import { TransferCrmProvider } from "@/modules/booking-engine/providers/transfer-crm.provider";
import { Way2GoNativeProvider } from "@/modules/booking-engine/providers/way2go-native.provider";
import type { BookingPayload } from "@/lib/transfercrm/types";
import { BookingRepository, type BookingOrderRow } from "@/modules/booking-engine/repositories/bookings.repo";
import { SupabaseService } from "@/modules/booking-engine/services/supabase.service";
import { TransferCrmHttpError } from "@/lib/transfercrm/http-core";
import { createExternalReference } from "@/lib/transfercrm/booking-mappers";
import { FiscalService } from "@/modules/booking-engine/services/fiscal.service";

export type BookingEngineMode = "STRICT_CRM" | "SHADOW_MODE" | "LOAD_BALANCE" | "STRICT_NATIVE";

const DEFAULT_NATIVE_TRAFFIC_RATIO = 0.2;

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getBookingEngineModeFromEnv(): BookingEngineMode {
  const raw = String(process.env.BOOKING_ENGINE_MODE ?? "SHADOW_MODE")
    .trim()
    .toUpperCase();
  switch (raw) {
    case "STRICT_CRM":
    case "SHADOW_MODE":
    case "LOAD_BALANCE":
    case "STRICT_NATIVE":
      return raw;
    default:
      return "SHADOW_MODE";
  }
}

function getNativeTrafficRatioFromEnv(): number {
  const raw = toNumber(process.env.BOOKING_ENGINE_NATIVE_RATIO ?? DEFAULT_NATIVE_TRAFFIC_RATIO);
  if (raw === null) return DEFAULT_NATIVE_TRAFFIC_RATIO;
  if (raw <= 0) return 0;
  if (raw >= 1) return 1;
  return raw;
}

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
    private readonly fiscalService: FiscalService = new FiscalService(),
  ) {}

  private get mode(): BookingEngineMode {
    return getBookingEngineModeFromEnv();
  }

  private getNativeProvider(): IBookingProvider | undefined {
    if (this.provider.name === "WAY2GO_NATIVE") return this.provider;
    if (this.shadowProvider?.name === "WAY2GO_NATIVE") return this.shadowProvider;
    return undefined;
  }

  private getCrmProvider(): IBookingProvider | undefined {
    if (this.provider.name === "TRANSFER_CRM") return this.provider;
    if (this.shadowProvider?.name === "TRANSFER_CRM") return this.shadowProvider;
    return undefined;
  }

  private getProviderForCreate(): IBookingProvider {
    const mode = this.mode;
    const nativeProvider = this.getNativeProvider();
    const crmProvider = this.getCrmProvider();

    if (mode === "STRICT_NATIVE") {
      if (!nativeProvider) {
        throw new Error("BOOKING_ENGINE_MODE=STRICT_NATIVE requires a WAY2GO_NATIVE provider.");
      }
      return nativeProvider;
    }

    if (mode === "LOAD_BALANCE" && nativeProvider && crmProvider) {
      const ratio = getNativeTrafficRatioFromEnv();
      return Math.random() < ratio ? nativeProvider : crmProvider;
    }

    return crmProvider ?? this.provider;
  }

  private async maybeIssueInvoiceOnCompleted(booking: BookingOrderRow | null, actor?: string): Promise<void> {
    if (!this.bookingsRepo || !booking) return;
    if (booking.status !== "COMPLETED") return;
    if (actor === "fiscal.service") return;

    const alreadyIssued = await this.bookingsRepo.hasFiscalInvoiceEvent(booking.id);
    if (alreadyIssued) return;

    const invoice = await this.fiscalService.issueInvoiceForCompletedBooking(booking);
    if (!invoice) return;

    await this.bookingsRepo.appendStatusEvent({
      bookingId: booking.id,
      status: "COMPLETED",
      actor: "fiscal.service",
      provider: booking.provider,
      payload: {
        fiscal: invoice,
      },
    });
  }

  async quote(payload: BookingPayload, vehicleType?: string): Promise<BookingQuoteResult> {
    const mode = this.mode;
    const nativeProvider = this.getNativeProvider();
    const crmProvider = this.getCrmProvider();

    if (mode === "STRICT_NATIVE" && nativeProvider) {
      return nativeProvider.quote({ payload, vehicleType });
    }
    if (mode === "STRICT_CRM" && crmProvider) {
      return crmProvider.quote({ payload, vehicleType });
    }

    const primaryProvider = crmProvider ?? this.provider;
    const shouldRunShadow =
      (mode === "SHADOW_MODE" || mode === "LOAD_BALANCE") &&
      nativeProvider &&
      nativeProvider.name !== primaryProvider.name;
    const primaryPromise = primaryProvider.quote({ payload, vehicleType });
    const shadowPromise = shouldRunShadow ? nativeProvider.quote({ payload, vehicleType }) : undefined;

    const primaryQuote = await primaryPromise;

    if (shadowPromise) {
      void shadowPromise
        .then((shadowQuote) => {
          const primary = Number(primaryQuote.price ?? NaN);
          const shadow = Number(shadowQuote.price ?? NaN);
          const delta = Number.isFinite(primary) && Number.isFinite(shadow) ? shadow - primary : null;
          console.info("[booking-engine.shadow-quote]", {
            primaryProvider: primaryProvider.name,
            shadowProvider: nativeProvider?.name,
            primaryPrice: Number.isFinite(primary) ? primary : null,
            shadowPrice: Number.isFinite(shadow) ? shadow : null,
            delta,
            vehicleType: vehicleType ?? payload.vehicleType ?? null,
          });
        })
        .catch((error: unknown) => {
          console.warn("[booking-engine.shadow-quote-failed]", {
            shadowProvider: nativeProvider?.name,
            error: error instanceof Error ? error.message : "Unknown shadow quote error",
          });
        });
    }

    return primaryQuote;
  }

  getVehicleOptions(payload: BookingPayload): Promise<BookingVehiclesResult> {
    if (this.mode === "STRICT_NATIVE") {
      const nativeProvider = this.getNativeProvider();
      if (!nativeProvider) {
        throw new Error("BOOKING_ENGINE_MODE=STRICT_NATIVE requires a WAY2GO_NATIVE provider.");
      }
      return nativeProvider.getVehicleOptions({ payload });
    }
    return (this.getCrmProvider() ?? this.provider).getVehicleOptions({ payload });
  }

  async create(payload: BookingPayload): Promise<BookingCreateResult> {
    const createProvider = this.getProviderForCreate();
    const idempotencyKey = payload.internalOrderId?.trim() || createExternalReference(payload);
    const payloadSnapshot = payload as unknown as Record<string, unknown>;
    try {
      const created = await createProvider.create({ payload });
      if (this.bookingsRepo) {
        const mirror = await this.bookingsRepo.upsertMirror({
          idempotencyKey,
          requestPayload: payloadSnapshot,
          provider: createProvider.name,
          providerBookingId: created.bookingId,
          status: created.status || "CONFIRMED",
          orderReference: created.orderNumber,
          trackingUrl: created.trackingUrl,
        });
        await this.maybeIssueInvoiceOnCompleted(mirror, "booking_engine.create");
      }
      return created;
    } catch (error) {
      if (this.bookingsRepo && isTransientProviderError(error)) {
        await this.bookingsRepo.upsertMirror({
          idempotencyKey,
          requestPayload: payloadSnapshot,
          provider: createProvider.name,
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
    if (this.mode === "STRICT_NATIVE") {
      const nativeProvider = this.getNativeProvider();
      if (!nativeProvider) {
        throw new Error("BOOKING_ENGINE_MODE=STRICT_NATIVE requires a WAY2GO_NATIVE provider.");
      }
      return nativeProvider.getById({ bookingId });
    }
    return (this.getCrmProvider() ?? this.provider).getById({ bookingId });
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
    let booking: BookingOrderRow | null = null;
    if (input.bookingId) {
      booking = await this.bookingsRepo.appendStatusEvent({
        bookingId: input.bookingId,
        status: input.status,
        travelStatus: input.travelStatus,
        actor: input.actor,
        provider: this.getCrmProvider()?.name ?? this.provider.name,
        payload: input.payload,
      });
    } else if (input.providerBookingId) {
      booking = await this.bookingsRepo.createStatusEventByProviderBookingId({
        providerBookingId: input.providerBookingId,
        toStatus: input.status,
        travelStatus: input.travelStatus,
        actor: input.actor,
        provider: this.getCrmProvider()?.name ?? this.provider.name,
        eventPayload: input.payload,
      });
    }
    await this.maybeIssueInvoiceOnCompleted(booking, input.actor);
  }

  async recordStatusEventByProviderBookingId(input: {
    providerBookingId: string;
    status: string;
    travelStatus?: string;
    actor?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.bookingsRepo) return;
    const booking = await this.bookingsRepo.createStatusEventByProviderBookingId({
      providerBookingId: input.providerBookingId,
      toStatus: input.status,
      travelStatus: input.travelStatus,
      actor: input.actor,
      provider: this.getCrmProvider()?.name ?? this.provider.name,
      eventPayload: input.payload,
    });
    await this.maybeIssueInvoiceOnCompleted(booking, input.actor);
  }

  async updateStatus(bookingId: string, travelStatus: string, actor: "driver" | "dispatcher" | "system" = "system"): Promise<UpdateBookingStatusResult> {
    const mode = this.mode;
    const nativeProvider = this.getNativeProvider();
    const crmProvider = this.getCrmProvider();
    const provider =
      mode === "STRICT_NATIVE" && nativeProvider
        ? nativeProvider
        : crmProvider ?? this.provider;

    const result = await provider.updateStatus({
      bookingId,
      travelStatus,
      actor,
      occurredAtIso: new Date().toISOString(),
    });

    await this.recordStatusEvent({
      providerBookingId: bookingId,
      status: travelStatus,
      travelStatus,
      actor,
      payload: {
        source: "booking_engine.update_status",
        provider: provider.name,
      },
    });

    return result;
  }
}

let defaultService: BookingEngineService | null = null;
let defaultRepo: BookingRepository | null = null;
let defaultNativeProvider: IBookingProvider | null = null;
let defaultCrmProvider: IBookingProvider | null = null;
let defaultFiscalService: FiscalService | null = null;

export function getBookingEngineService(provider?: IBookingProvider): BookingEngineService {
  const supabase = SupabaseService.fromEnv();
  if (!defaultFiscalService) {
    defaultFiscalService = new FiscalService();
  }

  if (provider) {
    if (!defaultRepo && supabase) {
      defaultRepo = new BookingRepository(supabase);
    }
    if (!defaultNativeProvider && supabase) {
      defaultNativeProvider = new Way2GoNativeProvider(supabase);
    }
    return new BookingEngineService(
      provider,
      defaultNativeProvider ?? undefined,
      defaultRepo ?? undefined,
      defaultFiscalService,
    );
  }

  if (!defaultService) {
    defaultRepo = supabase ? new BookingRepository(supabase) : null;
    defaultNativeProvider = supabase ? new Way2GoNativeProvider(supabase) : null;
    defaultCrmProvider = new TransferCrmProvider();
    const mode = getBookingEngineModeFromEnv();
    const primaryProvider =
      mode === "STRICT_NATIVE" && defaultNativeProvider
        ? defaultNativeProvider
        : defaultCrmProvider;
    const shadowProvider =
      primaryProvider.name === "WAY2GO_NATIVE" ? defaultCrmProvider : defaultNativeProvider;
    defaultService = new BookingEngineService(
      primaryProvider,
      shadowProvider ?? undefined,
      defaultRepo ?? undefined,
      defaultFiscalService,
    );
  }
  return defaultService;
}


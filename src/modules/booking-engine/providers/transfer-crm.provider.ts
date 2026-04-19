import { createTransferCrmClientFromEnv, type TransferCrmApiClient } from "@/lib/transfercrm/TransferCrmApiClient";
import type {
  CancelBookingInput,
  CancelBookingResult,
  BookingCreateInput,
  BookingCreateResult,
  BookingGetInput,
  BookingProviderName,
  BookingQuoteInput,
  BookingQuoteResult,
  UpdateBookingStatusInput,
  UpdateBookingStatusResult,
  BookingVehiclesInput,
  BookingVehiclesResult,
  IBookingProvider,
} from "@/modules/booking-engine/ports/booking-provider.port";

export class TransferCrmProvider implements IBookingProvider {
  readonly name: BookingProviderName = "TRANSFER_CRM";
  private client: TransferCrmApiClient | null = null;

  constructor(client?: TransferCrmApiClient) {
    this.client = client ?? null;
  }

  getApiClient(): TransferCrmApiClient {
    if (!this.client) {
      this.client = createTransferCrmClientFromEnv();
    }
    return this.client;
  }

  async getVehicleOptions(input: BookingVehiclesInput): Promise<BookingVehiclesResult> {
    return this.getApiClient().getAvailabilityForBooking(input.payload);
  }

  async quote(input: BookingQuoteInput): Promise<BookingQuoteResult> {
    return this.getApiClient().postQuoteForBooking(input.payload, input.vehicleType);
  }

  async create(input: BookingCreateInput): Promise<BookingCreateResult> {
    return this.getApiClient().postBookForPayload(input.payload);
  }

  async getById(input: BookingGetInput): Promise<unknown> {
    return this.getApiClient().getBooking(input.bookingId);
  }

  async cancel(input: CancelBookingInput): Promise<CancelBookingResult> {
    const providerRaw = await this.getApiClient().patchBooking(input.bookingId, {
      status: "cancelled",
      cancel_reason: input.reason ?? "cancelled",
      cancelled_by: input.requestedBy ?? "system",
    });
    return {
      bookingId: input.bookingId,
      cancelled: true,
      status: "CANCELLED",
      providerRaw,
    };
  }

  async updateStatus(input: UpdateBookingStatusInput): Promise<UpdateBookingStatusResult> {
    const providerRaw = await this.getApiClient().patchBooking(input.bookingId, {
      travel_status: input.travelStatus,
      actor: input.actor ?? "system",
      occurred_at: input.occurredAtIso,
    });
    return {
      bookingId: input.bookingId,
      travelStatus: input.travelStatus,
      providerRaw,
    };
  }
}

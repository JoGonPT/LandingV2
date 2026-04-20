import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";
import type { BookingPayload, TransferCrmAvailabilityResult, TransferCrmBookingResult } from "@/lib/transfercrm/types";

export type BookingProviderName = "TRANSFER_CRM" | "WAY2GO_NATIVE";

export interface BookingQuoteInput {
  payload: BookingPayload;
  vehicleType?: string;
}

export type BookingQuoteResult = QuoteResponse;

export interface BookingVehiclesInput {
  payload: BookingPayload;
}

export type BookingVehiclesResult = TransferCrmAvailabilityResult;

export interface BookingCreateInput {
  payload: BookingPayload;
}

export type BookingCreateResult = TransferCrmBookingResult;

export interface BookingGetInput {
  bookingId: string;
}

export type BookingGetResult = unknown;

export interface CancelBookingInput {
  bookingId: string;
  reason?: string;
  requestedBy?: "passenger" | "partner" | "admin" | "system";
}

export interface CancelBookingResult {
  bookingId: string;
  cancelled: boolean;
  status?: string;
  providerRaw?: unknown;
}

export interface UpdateBookingStatusInput {
  bookingId: string;
  travelStatus: string;
  actor?: "driver" | "dispatcher" | "system";
  occurredAtIso?: string;
}

export interface UpdateBookingStatusResult {
  bookingId: string;
  status?: string;
  travelStatus?: string;
  providerRaw?: unknown;
}

/**
 * Hexagonal output port for booking engines.
 * Phase 1 keeps TransferCRM-shaped data to preserve API JSON output.
 */
export interface IBookingProvider {
  readonly name: BookingProviderName;

  quote(input: BookingQuoteInput): Promise<BookingQuoteResult>;
  getVehicleOptions(input: BookingVehiclesInput): Promise<BookingVehiclesResult>;
  create(input: BookingCreateInput): Promise<BookingCreateResult>;
  getById(input: BookingGetInput): Promise<BookingGetResult>;
  cancel(input: CancelBookingInput): Promise<CancelBookingResult>;
  updateStatus(input: UpdateBookingStatusInput): Promise<UpdateBookingStatusResult>;
}

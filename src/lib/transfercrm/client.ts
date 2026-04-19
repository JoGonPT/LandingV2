import type { BookingPayload, TransferCrmAvailabilityResult, TransferCrmBookingResult } from "@/lib/transfercrm/types";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";
import { TransferCrmHttpError, TransferCrmValidationFailedError } from "@/lib/transfercrm/http-core";
import { createTransferCrmClientFromEnv, TransferCrmApiClient } from "@/lib/transfercrm/TransferCrmApiClient";
import { getBookingEngineService } from "@/modules/booking-engine/booking-engine.service";

let defaultClient: TransferCrmApiClient | null = null;

export function getTransferCrmApiClient(): TransferCrmApiClient {
  if (!defaultClient) {
    defaultClient = createTransferCrmClientFromEnv();
  }
  return defaultClient;
}

export async function getVehicleOptions(payload: BookingPayload): Promise<TransferCrmAvailabilityResult> {
  return getBookingEngineService().getVehicleOptions(payload);
}

export async function postQuoteForBooking(payload: BookingPayload, vehicleType?: string): Promise<QuoteResponse> {
  return getBookingEngineService().quote(payload, vehicleType);
}

export async function submitBooking(payload: BookingPayload): Promise<TransferCrmBookingResult> {
  return getBookingEngineService().create(payload);
}

export async function getBookingStatus(bookingId: string): Promise<unknown> {
  return getBookingEngineService().getById(bookingId);
}

export function toPublicError(error: unknown): { code: string; message: string; details?: unknown } {
  if (error instanceof TransferCrmValidationFailedError) {
    return {
      code: "CRM_VALIDATION_ERROR",
      message: error.validation.message || "Validation failed for booking request.",
      details: error.validation.errors,
    };
  }
  if (error instanceof TransferCrmHttpError) {
    if (error.status === 401 || error.status === 403) {
      return { code: "AUTH_FAILED", message: "Authentication failed with CRM provider." };
    }
    if (error.status === 429) {
      return { code: "CRM_RATE_LIMIT", message: "Too many requests. Please try again in a moment." };
    }
    if (error.status >= 500) {
      return { code: "CRM_UNAVAILABLE", message: "CRM provider is temporarily unavailable." };
    }
    return { code: "CRM_REQUEST_FAILED", message: "CRM request was rejected." };
  }
  if (error instanceof Error && error.name === "AbortError") {
    return { code: "CRM_TIMEOUT", message: "CRM request timeout." };
  }
  return { code: "UNKNOWN_ERROR", message: "Unexpected error while processing booking." };
}

export { TransferCrmApiClient, createTransferCrmClientFromEnv } from "@/lib/transfercrm/TransferCrmApiClient";

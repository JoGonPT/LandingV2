import type { BookingPayload, TransferCrmAvailabilityResult, TransferCrmBookingResult } from "@/lib/transfercrm/types";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";
import { TransferCrmApiClient } from "@/lib/transfercrm/TransferCrmApiClient";
export declare function getTransferCrmApiClient(): TransferCrmApiClient;
export declare function getVehicleOptions(payload: BookingPayload): Promise<TransferCrmAvailabilityResult>;
export declare function postQuoteForBooking(payload: BookingPayload, vehicleType?: string): Promise<QuoteResponse>;
export declare function submitBooking(payload: BookingPayload): Promise<TransferCrmBookingResult>;
export declare function getBookingStatus(bookingId: string): Promise<unknown>;
export declare function toPublicError(error: unknown): {
    code: string;
    message: string;
    details?: unknown;
};
export { TransferCrmApiClient, createTransferCrmClientFromEnv } from "@/lib/transfercrm/TransferCrmApiClient";

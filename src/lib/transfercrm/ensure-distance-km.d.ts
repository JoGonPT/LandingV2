import type { BookingPayload } from "@/lib/transfercrm/types";
import type { TransferCrmApiClient } from "@/lib/transfercrm/TransferCrmApiClient";
type QuoteCapable = Pick<TransferCrmApiClient, "postQuote">;
export declare function ensureDistanceKmOnPayload(payload: BookingPayload, crm: QuoteCapable): Promise<BookingPayload>;
export declare function resolveBookingPayloadDistance(payload: BookingPayload, crm: QuoteCapable): Promise<BookingPayload>;
export {};

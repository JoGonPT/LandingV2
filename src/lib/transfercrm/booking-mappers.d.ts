import type { BookingPayload } from "@/lib/transfercrm/types";
import type { AvailabilityQuery, BookingRequest, QuoteRequest, QuoteResponse } from "@/lib/transfercrm/openapi.types";
export declare function toIsoDateTimeUtc(date: string, time: string): string;
export declare function createExternalReference(payload: BookingPayload): string;
export declare function externalReferenceForWay2GoOrder(internalOrderId: string): string;
export declare function b2bSafeSegment(raw: string, max: number): string;
export declare function partnerExternalReferencePrefix(partnerRefId: string): string;
export declare function resolveB2BExternalReference(payload: BookingPayload): string;
export declare function resolveExternalReference(payload: BookingPayload): string;
export declare function mapBookingPayloadToAvailabilityQuery(payload: BookingPayload): AvailabilityQuery;
export declare function mapBookingPayloadToQuoteRequest(payload: BookingPayload, vehicleType?: string): QuoteRequest;
export declare function mergeQuoteDistanceIntoPayload(payload: BookingPayload, quote: QuoteResponse): BookingPayload;
export interface PaidBookingOverrides {
    externalReference: string;
    price: number;
    currency: string;
    vehicleType?: string;
}
export declare function mapBookingPayloadToBookingRequest(payload: BookingPayload, paid?: PaidBookingOverrides): BookingRequest;
export declare const mapBookingToB2bBookBody: typeof mapBookingPayloadToBookingRequest;
export declare function mapBookingToAvailabilityParams(payload: BookingPayload): URLSearchParams;

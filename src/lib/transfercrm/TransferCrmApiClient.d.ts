import type { BookingPayload, TransferCrmAvailabilityResult, TransferCrmBookingResult } from "@/lib/transfercrm/types";
import type { AvailabilityQuery, AvailabilityResponse, BookingRequest, BookingResponse, QuoteRequest, QuoteResponse } from "@/lib/transfercrm/openapi.types";
import type { TransferCrmHttpOptions } from "@/lib/transfercrm/http-core";
import { type PaidBookingOverrides } from "@/lib/transfercrm/booking-mappers";
export declare class TransferCrmApiClient {
    private readonly http;
    constructor(http: TransferCrmHttpOptions);
    getAvailability(query: AvailabilityQuery): Promise<AvailabilityResponse>;
    getAvailabilityForBooking(payload: BookingPayload): Promise<TransferCrmAvailabilityResult>;
    postQuote(body: QuoteRequest): Promise<QuoteResponse>;
    postQuoteForBooking(payload: BookingPayload, vehicleType?: string): Promise<QuoteResponse>;
    postBook(body: BookingRequest): Promise<BookingResponse>;
    postBookForPaidCheckout(payload: BookingPayload, paid: PaidBookingOverrides): Promise<TransferCrmBookingResult>;
    postBookForPayload(payload: BookingPayload): Promise<TransferCrmBookingResult>;
    getBooking(bookingId: string): Promise<unknown>;
    listBookings(query?: Record<string, string | undefined>): Promise<unknown>;
    patchBooking(bookingId: string, body: Record<string, unknown>): Promise<unknown>;
}
export declare function createTransferCrmClientFromEnv(): TransferCrmApiClient;

export type BookingLocale = "pt" | "en";
export interface PartnerBookingContext {
    partnerDisplayName: string;
    partnerRefId?: string;
    paymentMethod?: "account" | "stripe";
    internalReference?: string;
    vipRequests?: string;
}
export interface BookingPayload {
    internalOrderId?: string;
    partnerBooking?: PartnerBookingContext;
    locale: BookingLocale;
    route: {
        pickup: string;
        dropoff: string;
        date: string;
        time: string;
        flightNumber?: string;
        childSeat: boolean;
    };
    details: {
        passengers: number;
        luggage: number;
        notes?: string;
        distanceKm?: number;
    };
    vehicleType?: string;
    quotedPrice?: {
        amount: number;
        currency: string;
    };
    contact: {
        fullName: string;
        email: string;
        phone: string;
    };
    gdprAccepted: boolean;
}
export interface BookingApiSuccess {
    success: true;
    orderId: string;
    orderReference?: string;
    trackingUrl?: string;
    status?: string;
}
export interface PartnerPricingSummary {
    crmPrice: number;
    retailPrice: number;
    partnerEarnings: number;
    netDueToWay2Go: number;
    pricingModel: "MARKUP" | "NET_PRICE";
    commissionRatePercent: number;
}
export interface CheckoutCompleteSuccess extends BookingApiSuccess {
    trip: {
        pickup: string;
        dropoff: string;
        date: string;
        time: string;
    };
    totalPaidFormatted: string;
    partnerPricing?: PartnerPricingSummary & {
        currency: string;
    };
}
export interface BookingApiError {
    success: false;
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
}
export interface TransferCrmVehicleOption {
    vehicleType: string;
    estimatedPrice: number;
    currency: string;
    seatsAvailable: number;
    includesDistance?: boolean;
    guestRetailPrice?: number;
}
export interface TransferCrmAvailabilityResult {
    available: boolean;
    vehicleOptions: TransferCrmVehicleOption[];
    pickupLocation: string;
    dropoffLocation: string;
    pickupDate: string;
}
export interface TransferCrmBookingResult {
    bookingId: string;
    orderNumber?: string;
    status?: string;
    trackingUrl?: string;
    pickupDate?: string;
    price?: string;
    currency?: string;
}
export type TransferCrmValidationError = import("@/lib/transfercrm/openapi.types").TransferCrmValidationErrorBody;

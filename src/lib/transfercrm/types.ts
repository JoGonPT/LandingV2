export type BookingLocale = "pt" | "en";

export interface BookingPayload {
  /** When set, becomes `external_reference` for idempotent bookings (Way2Go draft / internal id). */
  internalOrderId?: string;
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
    /** Optional for /book (CRM can auto-quote). Required for POST /api/booking/quote. */
    distanceKm?: number;
  };
  vehicleType?: string;
  quotedPrice?: { amount: number; currency: string };
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

/** Response after paid checkout + CRM booking (Way2Go-branded summary). */
export interface CheckoutCompleteSuccess extends BookingApiSuccess {
  trip: {
    pickup: string;
    dropoff: string;
    date: string;
    time: string;
  };
  totalPaidFormatted: string;
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

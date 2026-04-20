export type BookingLocale = "pt" | "en";

/** B2B partner context — added server-side on `/partner/*` APIs; used in CRM `notes` and account `external_reference`. */
export interface PartnerBookingContext {
  partnerDisplayName: string;
  /** Stable segment for `B2B-REF-{partnerRefId}-{timestamp}` (typically partner slug). */
  partnerRefId?: string;
  /** How this booking is settled (drives CRM notes). */
  paymentMethod?: "account" | "stripe";
  /** Hotel / agency internal booking ID (idempotency segment for account billing). */
  internalReference?: string;
  /** VIP / special requests (merged into CRM `notes`). */
  vipRequests?: string;
}

export interface BookingPayload {
  /** When set, becomes `external_reference` for idempotent bookings (Way2Go draft / internal id). */
  internalOrderId?: string;
  /**
   * Partner portal: when set, CRM notes include partner metadata.
   * For **pay on account**, `external_reference` is `B2B-REF-{partnerRefId}-{timestamp}`.
   * For **Stripe**, `external_reference` remains the PaymentIntent id; partner data is notes-only.
   */
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
    /** Optional for /book (CRM can auto-quote). Nest quote API resolves distance before CRM. */
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

/** Partner commission snapshot (EUR unless currency set on quote). */
export interface PartnerPricingSummary {
  crmPrice: number;
  retailPrice: number;
  partnerEarnings: number;
  netDueToWay2Go: number;
  pricingModel: "MARKUP" | "NET_PRICE";
  commissionRatePercent: number;
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
  /** Guest-facing total vs CRM base; omitted on public B2C checkout. */
  partnerPricing?: PartnerPricingSummary & { currency: string };
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
  /** Partner portal: price shown to guest (markup model). */
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

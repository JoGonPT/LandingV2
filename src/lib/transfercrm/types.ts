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
  /**
   * Código da classe do catálogo do CRM (`GET /v2/vehicle-classes`).
   *
   * Preferir isto a `vehicleType`: a API só distingue níveis de serviço por
   * aqui. Enviar apenas `vehicleType` fazia o CRM aplicar a tarifa mínima a
   * todos os veículos, porque os valores do site (`berlina`, `first`, …) não
   * existem no catálogo e eram ignorados em silêncio.
   */
  vehicleClassCode?: string;
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

/**
 * Classe de veículo tal como o site a mostra ao cliente.
 *
 * Vem toda do CRM — nome, descrição, fotografia, lugares e preço. O site não
 * tem catálogo próprio: era isso que fazia com que mudar um nome ou um preço no
 * CRM não tivesse qualquer efeito no site.
 */
export interface TransferCrmVehicleClass {
  /** Identificador estável; é o que se envia ao reservar. */
  code: string;
  name: string;
  description?: string;
  photoUrl?: string;
  seats?: number;
  seatsAvailable?: number;
  serviceClass?: string;
  tier?: number;
  estimatedPrice?: number;
  currency?: string;
  includesDistance?: boolean;
  /** Portal de parceiros: preço a mostrar ao hóspede (modelo de markup). */
  guestRetailPrice?: number;
}

export interface TransferCrmAvailabilityResult {
  available: boolean;
  vehicleOptions: TransferCrmVehicleOption[];
  /** Classes com preço para esta rota. Preferir isto a `vehicleOptions`. */
  vehicleClasses: TransferCrmVehicleClass[];
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

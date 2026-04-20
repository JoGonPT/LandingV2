import type { BookingOrderRow } from "@/modules/booking-engine/repositories/bookings.repo";
import { VendusFiscalProvider } from "@/modules/booking-engine/providers/fiscal/vendus.provider";

export interface FiscalIssueInvoiceInput {
  bookingId: string;
  provider: "TRANSFER_CRM" | "WAY2GO_NATIVE";
  externalReference: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  pickup: string;
  dropoff: string;
  issuedAtIso: string;
}

export interface FiscalIssueInvoiceResult {
  provider: string;
  invoiceNumber: string;
  invoiceUrl?: string;
  issuedAtIso: string;
}

/**
 * Fiscal providers (e.g. Moloni / InvoiceXpress) should implement this port.
 */
export interface IFiscalProvider {
  readonly name: string;
  issueInvoice(input: FiscalIssueInvoiceInput): Promise<FiscalIssueInvoiceResult>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function readAmount(row: BookingOrderRow): number {
  const providerResponse = asRecord(row.provider_response);
  const requestPayload = asRecord(row.request_payload);
  const quotedPrice = asRecord(requestPayload?.quotedPrice);
  return (
    toNumber(providerResponse?.price) ??
    toNumber(quotedPrice?.amount) ??
    toNumber((providerResponse?.quote as Record<string, unknown> | undefined)?.price) ??
    0
  );
}

function readCurrency(row: BookingOrderRow): string {
  const providerResponse = asRecord(row.provider_response);
  const requestPayload = asRecord(row.request_payload);
  const quotedPrice = asRecord(requestPayload?.quotedPrice);
  const raw =
    providerResponse?.currency ??
    quotedPrice?.currency ??
    (providerResponse?.quote as Record<string, unknown> | undefined)?.currency ??
    "EUR";
  return String(raw || "EUR").toUpperCase();
}

function readCustomerName(row: BookingOrderRow): string {
  const requestPayload = asRecord(row.request_payload);
  const contact = asRecord(requestPayload?.contact);
  const raw = contact?.fullName;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Cliente Way2Go";
}

function readCustomerEmail(row: BookingOrderRow): string {
  const requestPayload = asRecord(row.request_payload);
  const contact = asRecord(requestPayload?.contact);
  const raw = contact?.email;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "no-reply@way2go.pt";
}

function readExternalReference(row: BookingOrderRow): string {
  return row.public_reference?.trim() || row.idempotency_key;
}

function readPickup(row: BookingOrderRow): string {
  const requestPayload = asRecord(row.request_payload);
  const route = asRecord(requestPayload?.route);
  const raw = route?.pickup;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Ponto de recolha";
}

function readDropoff(row: BookingOrderRow): string {
  const requestPayload = asRecord(row.request_payload);
  const route = asRecord(requestPayload?.route);
  const raw = route?.dropoff;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Destino";
}

export class FiscalService {
  constructor(private readonly provider: IFiscalProvider = new VendusFiscalProvider()) {}

  async issueInvoiceForCompletedBooking(row: BookingOrderRow): Promise<FiscalIssueInvoiceResult | null> {
    if (row.status !== "COMPLETED") return null;

    const issuedAtIso = new Date().toISOString();
    const amount = readAmount(row);
    const currency = readCurrency(row);

    return this.provider.issueInvoice({
      bookingId: row.id,
      provider: row.provider,
      externalReference: readExternalReference(row),
      customerName: readCustomerName(row),
      customerEmail: readCustomerEmail(row),
      amount,
      currency,
      pickup: readPickup(row),
      dropoff: readDropoff(row),
      issuedAtIso,
    });
  }
}

export { VendusFiscalProvider };


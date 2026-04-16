import type { BookingPayload } from "@/lib/transfercrm/types";

export function attachPartnerToPayload(
  payload: BookingPayload,
  partnerDisplayName: string,
  partnerRefId: string,
  extras: {
    internalReference?: string;
    vipRequests?: string;
    paymentMethod?: "account" | "stripe";
  },
): BookingPayload {
  return {
    ...payload,
    partnerBooking: {
      partnerDisplayName: partnerDisplayName.trim(),
      partnerRefId: partnerRefId.trim(),
      paymentMethod: extras.paymentMethod,
      internalReference: extras.internalReference?.trim() || undefined,
      vipRequests: extras.vipRequests?.trim() || undefined,
    },
  };
}

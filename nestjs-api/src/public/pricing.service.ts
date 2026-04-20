import { Injectable } from "@nestjs/common";

import {
  computePartnerCommissionBreakdown,
  type PartnerCommissionPricingPayload,
} from "@/lib/partner/commission-pricing";
import { getPartnerCreditStore } from "@/lib/partner/credit/factory";
import { ensurePartnerCreditRow } from "@/lib/partner/sync-credit";
import { postQuoteForBooking } from "@/lib/transfercrm/client";
import type { BookingPayload } from "@/lib/transfercrm/types";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";

import { MapService } from "./map.service";

export type PartnerPortalQuoteResult = {
  /** Quote for UI: `price` is retail when partner contract applies, else raw CRM. */
  data: QuoteResponse;
  partnerPricing?: PartnerCommissionPricingPayload & { currency: string };
  /** CRM base amount (minor / major per CRM); used for credit and settlement. */
  crmPrice: number | null;
};

@Injectable()
export class PricingService {
  constructor(private readonly _mapService: MapService) {}

  async quoteForBooking(payload: BookingPayload, vehicleType?: string): Promise<QuoteResponse> {
    return postQuoteForBooking(payload, vehicleType);
  }

  /**
   * Partner portal quote: loads commission terms from Supabase `partners`, applies MARKUP/NET_PRICE to displayed price.
   */
  async quoteForPartnerPortal(
    payload: BookingPayload,
    vehicleType: string | undefined,
    partnerSlug: string,
  ): Promise<PartnerPortalQuoteResult> {
    await ensurePartnerCreditRow(partnerSlug);
    const quote = await postQuoteForBooking(payload, vehicleType);
    const store = getPartnerCreditStore();
    const acc = await store.getAccount(partnerSlug);
    const currency = quote.currency?.trim();
    const rawPrice = quote.price;
    if (!acc || rawPrice === undefined || rawPrice === null || !currency) {
      return { data: quote, partnerPricing: undefined, crmPrice: rawPrice != null ? Number(rawPrice) : null };
    }
    const crm = Number(rawPrice);
    if (!Number.isFinite(crm)) {
      return { data: quote, partnerPricing: undefined, crmPrice: null };
    }
    const breakdown = computePartnerCommissionBreakdown(crm, acc.commissionRate, acc.pricingModel);
    const partnerPricing = { ...breakdown, currency: currency.toUpperCase() };
    const data: QuoteResponse = { ...quote, price: breakdown.retailPrice };
    return { data, partnerPricing, crmPrice: crm };
  }
}

export type PartnerPricingModel = "MARKUP" | "NET_PRICE";

export function parsePartnerPricingModel(raw: string | undefined | null): PartnerPricingModel {
  return raw === "NET_PRICE" ? "NET_PRICE" : "MARKUP";
}

/** Serializable pricing snapshot for APIs and UI. */
export type PartnerCommissionPricingPayload = {
  crmPrice: number;
  retailPrice: number;
  partnerEarnings: number;
  netDueToWay2Go: number;
  pricingModel: PartnerPricingModel;
  commissionRatePercent: number;
};

/**
 * - MARKUP: guest pays `crm * (1 + rate)`; partner earns `crm * rate`.
 * - NET_PRICE: guest pays `crm`; partner earns `crm * rate`; net due to Way2Go is `crm * (1 - rate)`.
 */
export function computePartnerCommissionBreakdown(
  crmPrice: number,
  commissionRatePercent: number,
  pricingModel: PartnerPricingModel,
): PartnerCommissionPricingPayload {
  const crm = crmPrice;
  const r = Math.max(0, Math.min(100, commissionRatePercent)) / 100;
  const partnerEarnings = crm * r;
  const retailPrice = pricingModel === "MARKUP" ? crm * (1 + r) : crm;
  const netDueToWay2Go = pricingModel === "NET_PRICE" ? crm * (1 - r) : crm;
  return {
    crmPrice: crm,
    retailPrice,
    partnerEarnings,
    netDueToWay2Go,
    pricingModel,
    commissionRatePercent,
  };
}

export function toPartnerCommissionPricingPayload(b: PartnerCommissionPricingPayload): PartnerCommissionPricingPayload {
  return { ...b };
}

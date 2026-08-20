import {
    computePartnerCommissionBreakdown,
    type PartnerCommissionPricingPayload,
} from "@/lib/partner/commission-pricing";
import { getPartnerCreditStore } from "@/lib/partner/credit/factory";
import { ensurePartnerCreditRow } from "@/lib/partner/sync-credit";
import { postQuoteForBooking } from "@/lib/transfercrm/client";
import type { BookingPayload } from "@/lib/transfercrm/types";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";

/**
 * Cotação de preços.
 *
 * Antes vivia como `PricingService` numa segunda aplicação NestJS que **nunca
 * chegou a correr** — em produção os endpoints devolviam 503. Passa a ser
 * funções simples no mesmo processo.
 *
 * O `MapService` que era injetado aqui foi eliminado: estava marcado
 * `_mapService` e nunca era usado. O cálculo de distância acontece dentro do
 * cliente do TransferCRM.
 */

export type PartnerPortalQuoteResult = {
    /** Cotação para a interface: `price` é o preço de venda quando há contrato de parceiro, senão o do CRM. */
    data: QuoteResponse;
    partnerPricing?: PartnerCommissionPricingPayload & { currency: string };
    /** Valor base do CRM; usado para crédito e liquidação. */
    crmPrice: number | null;
};

export function quoteForBooking(
    payload: BookingPayload,
    vehicleType?: string,
): Promise<QuoteResponse> {
    return postQuoteForBooking(payload, vehicleType);
}

/**
 * Cotação do portal de parceiros: carrega os termos de comissão do Supabase e
 * aplica o modelo (MARKUP ou NET_PRICE) ao preço mostrado.
 */
export async function quoteForPartnerPortal(
    payload: BookingPayload,
    vehicleType: string | undefined,
    partnerSlug: string,
): Promise<PartnerPortalQuoteResult> {
    await ensurePartnerCreditRow(partnerSlug);

    const quote = await postQuoteForBooking(payload, vehicleType);
    const store = getPartnerCreditStore();
    const account = await store.getAccount(partnerSlug);

    const currency = quote.currency?.trim();
    const rawPrice = quote.price;

    if (!account || rawPrice === undefined || rawPrice === null || !currency) {
        return {
            data: quote,
            partnerPricing: undefined,
            crmPrice: rawPrice != null ? Number(rawPrice) : null,
        };
    }

    const crm = Number(rawPrice);
    if (!Number.isFinite(crm)) {
        return { data: quote, partnerPricing: undefined, crmPrice: null };
    }

    const breakdown = computePartnerCommissionBreakdown(
        crm,
        account.commissionRate,
        account.pricingModel,
    );

    return {
        data: { ...quote, price: breakdown.retailPrice },
        partnerPricing: { ...breakdown, currency: currency.toUpperCase() },
        crmPrice: crm,
    };
}

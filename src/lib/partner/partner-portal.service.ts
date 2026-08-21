import { randomUUID } from "node:crypto";

import { ApiHttpError, createRequestId } from "@/lib/api/http-error";
import { estimatedMinutesFromPayload } from "@/lib/booking/book-public";
import { assignDriverCandidates } from "@/lib/booking/dispatch";
import { quoteForBooking, quoteForPartnerPortal } from "@/lib/booking/pricing.service";
import { createPublicBookingsStoreFromEnv } from "@/lib/booking/public-bookings-store";
import { formatMoneyAmount } from "@/lib/checkout/format-money";
import { attachPartnerToPayload } from "@/lib/partner/attach-context";
import {
    computePartnerCommissionBreakdown,
    type PartnerCommissionPricingPayload,
} from "@/lib/partner/commission-pricing";
import { getPartnerCreditStore } from "@/lib/partner/credit/factory";
import { SupabasePartnerCreditStore } from "@/lib/partner/credit/supabase-store";
import {
    assertPartnerSessionMatchesSlug,
    PartnerSessionAuthError,
} from "@/lib/partner/session-cookie-auth";
import { ensurePartnerCreditRow } from "@/lib/partner/sync-credit";
import { mergeQuoteDistanceIntoPayload } from "@/lib/transfercrm/booking-mappers";
import { submitBooking, toPublicError } from "@/lib/transfercrm/client";
import type { BookingApiSuccess } from "@/lib/transfercrm/types";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";

/**
 * Portal B2B: cotação e reserva por conta-corrente.
 *
 * Portado da aplicação NestJS, que nunca esteve acessível — `/api/partner/quote`
 * devolvia 503 em produção, o que significa que **reservar por conta-corrente
 * nunca funcionou**. A lógica mantém-se; sai o framework.
 */

type ParsedPartnerBody = {
    slug: string;
    payload: unknown;
    vehicleType?: string;
    /** Código do catálogo do CRM; ganha sobre `vehicleType` para efeitos de preço. */
    vehicleClassCode?: string;
    internalReference?: string;
    vipRequests?: string;
};

function parsePartnerBody(body: unknown, requireVehicleType: boolean): ParsedPartnerBody | null {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;
    if (typeof b.slug !== "string" || !b.slug.trim()) return null;
    if (b.payload === undefined) return null;

    const vehicleType = typeof b.vehicleType === "string" ? b.vehicleType : undefined;
    const vehicleClassCode = typeof b.vehicleClassCode === "string" ? b.vehicleClassCode : undefined;
    // Basta um dos dois: o código é o preferido, o tipo é a alternativa.
    if (requireVehicleType && !vehicleType?.trim() && !vehicleClassCode?.trim()) return null;

    return {
        slug: b.slug.trim(),
        payload: b.payload,
        vehicleType: vehicleType?.trim(),
        vehicleClassCode: vehicleClassCode?.trim(),
        internalReference: typeof b.internalReference === "string" ? b.internalReference : undefined,
        vipRequests: typeof b.vipRequests === "string" ? b.vipRequests : undefined,
    };
}

/** Erros de sessão do parceiro têm respostas distintas: não autorizado vs mal configurado. */
function sessionErrorToHttp(error: unknown, requestId: string): ApiHttpError | null {
    if (error instanceof PartnerSessionAuthError) {
        return new ApiHttpError(401, { success: false, message: "Unauthorized.", requestId });
    }
    if (error instanceof Error && error.message.includes("PARTNER_SESSION_SECRET")) {
        return new ApiHttpError(503, {
            success: false,
            message: "Partner session is not configured on the server.",
            requestId,
        });
    }
    return null;
}

function crmErrorToHttp(error: unknown, requestId: string): ApiHttpError {
    const publicError = toPublicError(error);
    const details = publicError.details as Record<string, string[]> | undefined;
    const friendly =
        publicError.code === "CRM_VALIDATION_ERROR"
            ? firstTransferCrmValidationMessage(details) || publicError.message
            : publicError.message;
    const status = publicError.code === "CRM_VALIDATION_ERROR" ? 422 : 502;

    return new ApiHttpError(status, {
        success: false,
        message: friendly,
        requestId,
        details: publicError.details,
    });
}

// ── Cotação ───────────────────────────────────────────────────────────────────

export async function partnerQuote(body: unknown, cookieHeader: string | undefined) {
    const requestId = createRequestId();

    const parsed = parsePartnerBody(body, false);
    if (!parsed) {
        throw new ApiHttpError(400, { success: false, message: "Invalid body.", requestId });
    }

    let displayName: string;
    try {
        ({ displayName } = await assertPartnerSessionMatchesSlug(cookieHeader, parsed.slug));
    } catch (error) {
        throw sessionErrorToHttp(error, requestId) ?? error;
    }

    const validated = validateBookingPayload(parsed.payload);
    if (!validated.ok) {
        throw new ApiHttpError(400, { success: false, message: validated.message, requestId });
    }

    const comClasse = attachPartnerToPayload(validated.data, displayName, parsed.slug, {
        internalReference: parsed.internalReference,
        vipRequests: parsed.vipRequests,
    });
    const merged = parsed.vehicleClassCode
        ? { ...comClasse, vehicleClassCode: parsed.vehicleClassCode }
        : comClasse;

    try {
        const { data, partnerPricing } = await quoteForPartnerPortal(
            merged,
            parsed.vehicleType,
            parsed.slug,
        );
        return { success: true as const, data, partnerPricing, requestId };
    } catch (error) {
        throw crmErrorToHttp(error, requestId);
    }
}

// ── Reserva por conta-corrente ────────────────────────────────────────────────

export type PartnerBookAccountResponse = BookingApiSuccess & {
    trip: { pickup: string; dropoff: string; date: string; time: string };
    totalFormatted: string;
    totalRetailFormatted: string;
    partnerEarningsFormatted: string;
    partnerPricing: PartnerCommissionPricingPayload & { currency: string };
    billing: "monthly_account";
};

export async function partnerBookAccount(
    body: unknown,
    cookieHeader: string | undefined,
): Promise<PartnerBookAccountResponse> {
    const requestId = createRequestId();

    const parsed = parsePartnerBody(body, true);
    if (!parsed?.vehicleType) {
        throw new ApiHttpError(400, { success: false, message: "Invalid body.", requestId });
    }

    let displayName: string;
    try {
        ({ displayName } = await assertPartnerSessionMatchesSlug(cookieHeader, parsed.slug));
    } catch (error) {
        throw sessionErrorToHttp(error, requestId) ?? error;
    }

    const validated = validateBookingPayload(parsed.payload);
    if (!validated.ok) {
        throw new ApiHttpError(400, { success: false, message: validated.message, requestId });
    }

    const comContexto = attachPartnerToPayload(validated.data, displayName, parsed.slug, {
        internalReference: parsed.internalReference,
        vipRequests: parsed.vipRequests,
        paymentMethod: "account",
    });
    const merged = parsed.vehicleClassCode
        ? { ...comContexto, vehicleClassCode: parsed.vehicleClassCode }
        : comContexto;

    const vehicleType = parsed.vehicleType ?? parsed.vehicleClassCode ?? "";

    let quote;
    try {
        quote = await quoteForBooking(merged, vehicleType);
    } catch (error) {
        throw crmErrorToHttp(error, requestId);
    }

    const price = quote.price;
    const currency = quote.currency?.trim();
    if (price === undefined || price === null || !currency) {
        throw new ApiHttpError(502, {
            success: false,
            message: "Could not determine price from TransferCRM.",
            requestId,
        });
    }

    // O crédito é em euros; outra moeda tornaria a conta-corrente ambígua.
    if (currency.toUpperCase() !== "EUR") {
        throw new ApiHttpError(422, {
            success: false,
            code: "ACCOUNT_EUR_ONLY" as const,
            message: "Pay on account is only available when the quoted currency is EUR.",
            requestId,
        });
    }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
        throw new ApiHttpError(502, { success: false, message: "Invalid quote amount.", requestId });
    }

    const creditRow = await ensurePartnerCreditRow(parsed.slug);
    if (!creditRow) {
        throw new ApiHttpError(401, { success: false, message: "Unknown partner.", requestId });
    }

    // Conta-corrente exige consumo atómico de crédito — sem isso, dois pedidos
    // simultâneos podiam ultrapassar o limite.
    const store = getPartnerCreditStore();
    if (!(store instanceof SupabasePartnerCreditStore)) {
        throw new ApiHttpError(503, {
            success: false,
            code: "PERSISTENCE_CONFIG" as const,
            message: "Pay on account requires Supabase (service role) for atomic credit.",
            requestId,
        });
    }

    const publicStore = createPublicBookingsStoreFromEnv();
    if (!publicStore) {
        throw new ApiHttpError(503, {
            success: false,
            code: "PERSISTENCE_CONFIG" as const,
            message: "Booking persistence is not configured.",
            requestId,
        });
    }

    const reserved = await store.tryConsumeCreditAtomic(parsed.slug, priceNum);
    if (!reserved.ok) {
        const snapshot = await store.getAccount(parsed.slug);
        const limit = snapshot?.creditLimit ?? 0;
        const usage = snapshot?.currentUsage ?? 0;
        throw new ApiHttpError(402, {
            success: false,
            code: "INSUFFICIENT_CREDIT" as const,
            message: "Insufficient account credit for this booking. Pay with card instead.",
            requestId,
            credit: { limit, currentUsage: usage, available: Math.max(0, limit - usage) },
        });
    }

    const mergedWithDistance = mergeQuoteDistanceIntoPayload(merged, quote);
    const bookPayload = {
        ...mergedWithDistance,
        vehicleType,
        quotedPrice: { amount: priceNum, currency: currency.toUpperCase() },
    };

    const id = randomUUID();
    const route = validated.data.route;

    await publicStore.insert({
        id,
        status: "PENDING",
        pickup: route.pickup,
        dropoff: route.dropoff,
        trip_date: route.date,
        trip_time: route.time,
        datetime_raw: `${route.date}T${route.time}:00`,
        passengers: validated.data.details.passengers,
        vehicle_type: vehicleType,
        customer: {
            name: validated.data.contact.fullName,
            email: validated.data.contact.email,
            phone: validated.data.contact.phone,
        },
        price: priceNum,
        currency: currency.toUpperCase(),
        distance_km: mergedWithDistance.details.distanceKm ?? null,
        estimated_time_min: estimatedMinutesFromPayload(mergedWithDistance),
        payment_method: "account",
        partner_slug: parsed.slug,
    });

    let booking;
    try {
        booking = await submitBooking(bookPayload);
    } catch (error) {
        // O crédito já foi consumido: se o CRM falhar, tem de ser devolvido, ou o
        // parceiro fica com o limite reduzido por uma reserva que não existe.
        try {
            await store.releaseCreditAtomic(parsed.slug, priceNum);
        } catch (releaseError) {
            console.error(
                `[partner-portal] Falha ao devolver crédito slug=${parsed.slug} requestId=${requestId}:`,
                releaseError instanceof Error ? releaseError.message : String(releaseError),
            );
        }
        await publicStore.patch(id, {
            status: "FAILED_SYNC",
            sync_error: (error instanceof Error ? error.message : String(error)).slice(0, 2000),
        });
        throw crmErrorToHttp(error, requestId);
    }

    const crmBookingId =
        booking.bookingId !== undefined && booking.bookingId !== null
            ? String(booking.bookingId)
            : "";
    const orderNumber = booking.orderNumber?.trim() ?? "";
    const crmStatus = booking.status?.trim();

    await publicStore.patch(id, {
        status: "SYNCED",
        crm_booking_id: crmBookingId || null,
        crm_order_number: orderNumber || null,
        crm_status: crmStatus ?? null,
        sync_error: null,
    });

    const externalCrmId = crmBookingId || orderNumber;
    if (externalCrmId) {
        await assignDriverCandidates(externalCrmId);
    }

    const pricing = computePartnerCommissionBreakdown(
        priceNum,
        creditRow.commissionRate,
        creditRow.pricingModel,
    );
    await store.incrementCommissionsEarned(parsed.slug, pricing.partnerEarnings);

    const currencyUpper = (booking.currency ?? currency).toUpperCase();
    const totalRetailFormatted =
        Number.isFinite(pricing.retailPrice) && currencyUpper
            ? formatMoneyAmount(pricing.retailPrice, currencyUpper, validated.data.locale)
            : "";
    const partnerEarningsFormatted =
        Number.isFinite(pricing.partnerEarnings) && currencyUpper
            ? formatMoneyAmount(pricing.partnerEarnings, currencyUpper, validated.data.locale)
            : "";

    return {
        success: true,
        orderId: booking.bookingId,
        orderReference: booking.orderNumber,
        trackingUrl: booking.trackingUrl ?? undefined,
        status: booking.status,
        trip: {
            pickup: route.pickup,
            dropoff: route.dropoff,
            date: route.date,
            time: route.time,
        },
        totalFormatted: totalRetailFormatted,
        totalRetailFormatted,
        partnerEarningsFormatted,
        partnerPricing: { ...pricing, currency: currencyUpper },
        billing: "monthly_account",
    };
}

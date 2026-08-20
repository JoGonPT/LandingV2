import { randomUUID } from "node:crypto";

import { ApiHttpError, createRequestId } from "@/lib/api/http-error";
import {
    applyQuoteToPayload,
    buildBookingPayloadFromBookingRequestDto,
    estimatedMinutesFromPayload,
    mapBookingToTransferCRM,
    parseBookingRequestDto,
    type PublicBookResponseData,
} from "@/lib/booking/book-public";
import { assignDriverCandidates } from "@/lib/booking/dispatch";
import { quoteForBooking } from "@/lib/booking/pricing.service";
import {
    createPublicBookingsStoreFromEnv,
    PublicBookingInsertDuplicateError,
    type PublicBookingFetchedRow,
} from "@/lib/booking/public-bookings-store";
import {
    buildBookingPayloadFromQuoteRequest,
    mapQuoteResponseToPublic,
    parseQuoteRequestDto,
    validateQuoteBookingPayload,
} from "@/lib/booking/quote-public";
import { getTransferCrmApiClient, toPublicError } from "@/lib/transfercrm/client";
import type { BookingApiError } from "@/lib/transfercrm/types";
import { validateBookingPayload } from "@/lib/transfercrm/validation";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";

/**
 * Cotação e criação de reservas públicas.
 *
 * Portado da aplicação NestJS `nestjs-api`, que **nunca esteve acessível** —
 * em produção estes endpoints devolviam 503 `PROXY_RECURSION`, porque o Next
 * tentava chamar um serviço que não existia em lado nenhum.
 *
 * A lógica não mudou. O que saiu foram os decoradores, a injeção de
 * dependências e o `HttpException`, substituído pelo `ApiHttpError`, que não
 * depende de framework nenhum.
 */

function asError(message: string, requestId: string, code = "VALIDATION_ERROR"): BookingApiError {
    return { success: false, code, message, requestId };
}

/** Traduz um erro do CRM para resposta pública, distinguindo validação de indisponibilidade. */
function crmErrorToHttp(error: unknown, requestId: string): ApiHttpError {
    const publicError = toPublicError(error);
    const details = publicError.details as Record<string, string[]> | undefined;
    const friendly =
        publicError.code === "CRM_VALIDATION_ERROR"
            ? firstTransferCrmValidationMessage(details) || publicError.message
            : publicError.message;

    // 422 quando o CRM recusou os dados; 502 quando o CRM falhou.
    const status = publicError.code === "CRM_VALIDATION_ERROR" ? 422 : 502;

    return new ApiHttpError(status, {
        ...asError(friendly, requestId, publicError.code),
        details: publicError.details,
    });
}

function publicBookDataFromRow(row: PublicBookingFetchedRow): PublicBookResponseData {
    const rawPrice = row.price;
    const price =
        rawPrice === null || rawPrice === undefined
            ? null
            : typeof rawPrice === "number"
              ? rawPrice
              : Number(rawPrice);

    return {
        bookingId: row.id,
        status: row.crm_status?.trim() || row.status,
        price: price !== null && Number.isFinite(price) ? price : null,
        estimatedTime: row.estimated_time_min ?? null,
    };
}

// ── Cotação ───────────────────────────────────────────────────────────────────

export async function createPublicQuote(body: unknown) {
    const requestId = createRequestId();

    const parsed = parseQuoteRequestDto(body);
    if (!parsed.ok) {
        throw new ApiHttpError(400, asError(parsed.message, requestId));
    }

    const dto = parsed.data;
    const internal = buildBookingPayloadFromQuoteRequest(dto);
    const validated = validateQuoteBookingPayload(internal);
    if (!validated.ok) {
        throw new ApiHttpError(400, asError(validated.message, requestId));
    }

    try {
        const quote = await quoteForBooking(validated.data, dto.vehicleType);
        return { success: true as const, data: mapQuoteResponseToPublic(quote, dto.vehicleType) };
    } catch (error) {
        throw crmErrorToHttp(error, requestId);
    }
}

// ── Reserva ───────────────────────────────────────────────────────────────────

export async function createPublicBooking(
    body: unknown,
    idempotencyKey?: string,
): Promise<{ success: true; requestId: string; data: PublicBookResponseData }> {
    const requestId = createRequestId();
    const key = idempotencyKey?.trim() || undefined;

    const parsed = parseBookingRequestDto(body);
    if (!parsed.ok) {
        throw new ApiHttpError(400, asError(parsed.message, requestId));
    }
    const dto = parsed.data;

    const store = createPublicBookingsStoreFromEnv();
    if (!store) {
        console.error(
            `[public-booking] Persistência em falta (SUPABASE_URL / SERVICE_ROLE) requestId=${requestId}`,
        );
        throw new ApiHttpError(
            503,
            asError("Booking persistence is not configured.", requestId, "PERSISTENCE_CONFIG"),
        );
    }

    // Idempotência: o mesmo `Idempotency-Key` não pode criar duas reservas.
    if (key) {
        const existing = await store.getByIdempotencyKey(key);
        if (existing?.status === "SYNCED") {
            return { success: true as const, requestId, data: publicBookDataFromRow(existing) };
        }
        if (existing?.status === "PENDING") {
            throw new ApiHttpError(
                409,
                asError(
                    "A booking is already in progress for this checkout session. Please wait or retry shortly.",
                    requestId,
                    "IDEMPOTENCY_PENDING",
                ),
            );
        }
    }

    const basePayload = buildBookingPayloadFromBookingRequestDto(dto);
    const validatedBase = validateBookingPayload(basePayload);
    if (!validatedBase.ok) {
        throw new ApiHttpError(400, asError(validatedBase.message, requestId));
    }

    let quote;
    try {
        quote = await quoteForBooking(validatedBase.data, dto.vehicleType);
    } catch (error) {
        throw crmErrorToHttp(error, requestId);
    }

    const pricedPayload = applyQuoteToPayload(validatedBase.data, quote);
    if (!pricedPayload.quotedPrice) {
        throw new ApiHttpError(
            502,
            asError("Could not determine price from TransferCRM.", requestId, "QUOTE_INCOMPLETE"),
        );
    }

    const validatedFinal = validateBookingPayload(pricedPayload);
    if (!validatedFinal.ok) {
        throw new ApiHttpError(502, asError(validatedFinal.message, requestId));
    }

    const payload = validatedFinal.data;
    const quotedPrice = payload.quotedPrice;
    if (!quotedPrice) {
        throw new ApiHttpError(
            502,
            asError("Quoted price missing after CRM quote.", requestId, "QUOTE_INCOMPLETE"),
        );
    }

    const price = quotedPrice.amount;
    const currency = quotedPrice.currency;
    const distanceKm = payload.details.distanceKm ?? null;
    const estimatedTime = estimatedMinutesFromPayload(payload);
    const id = randomUUID();
    const route = payload.route;

    // Grava-se PENDING **antes** de chamar o CRM: se o CRM falhar, a reserva não
    // se perde — fica registada para reconciliação.
    try {
        await store.insert({
            id,
            status: "PENDING",
            pickup: route.pickup,
            dropoff: route.dropoff,
            trip_date: route.date,
            trip_time: route.time,
            datetime_raw: dto.datetime,
            passengers: payload.details.passengers,
            vehicle_type: dto.vehicleType,
            customer: {
                name: payload.contact.fullName,
                email: payload.contact.email,
                phone: payload.contact.phone,
            },
            price,
            currency,
            distance_km: distanceKm,
            estimated_time_min: estimatedTime,
            ...(key ? { idempotency_key: key } : {}),
        });
    } catch (error) {
        // Corrida entre dois pedidos com a mesma chave: quem perde lê o resultado do outro.
        if (error instanceof PublicBookingInsertDuplicateError && key) {
            const duplicate = await store.getByIdempotencyKey(key);
            if (duplicate?.status === "SYNCED") {
                return { success: true as const, requestId, data: publicBookDataFromRow(duplicate) };
            }
            if (duplicate?.status === "PENDING") {
                throw new ApiHttpError(
                    409,
                    asError(
                        "A booking is already in progress for this checkout session. Please wait or retry shortly.",
                        requestId,
                        "IDEMPOTENCY_PENDING",
                    ),
                );
            }
        }
        throw error;
    }

    const crmBody = mapBookingToTransferCRM({ payload });
    const client = getTransferCrmApiClient();

    let data: PublicBookResponseData = {
        bookingId: id,
        status: "FAILED_SYNC",
        price,
        estimatedTime,
    };

    try {
        const response = await client.postBook(crmBody);
        const crmBookingId =
            response.booking_id !== undefined && response.booking_id !== null
                ? String(response.booking_id)
                : "";
        const orderNumber = response.order_number?.trim() ?? "";
        const externalCrmId = crmBookingId || orderNumber;
        if (!externalCrmId) {
            throw new Error("TransferCRM booking response missing id.");
        }

        const crmStatus = response.status?.trim();
        await store.patch(id, {
            status: "SYNCED",
            crm_booking_id: crmBookingId || null,
            crm_order_number: orderNumber || null,
            crm_status: crmStatus ?? null,
            sync_error: null,
        });

        await assignDriverCandidates(externalCrmId);

        data = { bookingId: id, status: crmStatus || "SYNCED", price, estimatedTime };
    } catch (error) {
        // O CRM falhou, mas a reserva existe do nosso lado. Devolve-se sucesso com
        // estado FAILED_SYNC: o cliente reservou, e a reconciliação é interna.
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[public-booking] postBook falhou bookingId=${id}: ${message}`);
        await store.patch(id, {
            status: "FAILED_SYNC",
            sync_error: message.slice(0, 2000),
            // Liberta a chave para o cliente poder tentar de novo.
            ...(key ? { idempotency_key: null } : {}),
        });
    }

    return { success: true as const, requestId, data };
}

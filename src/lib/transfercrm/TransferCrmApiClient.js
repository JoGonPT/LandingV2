"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferCrmApiClient = void 0;
exports.createTransferCrmClientFromEnv = createTransferCrmClientFromEnv;
const config_1 = require("./config");
const http_core_1 = require("./http-core");
const booking_mappers_1 = require("./booking-mappers");
const ensure_distance_km_1 = require("./ensure-distance-km");
class TransferCrmApiClient {
    constructor(http) {
        this.http = http;
    }
    async getAvailability(query) {
        const params = new URLSearchParams();
        params.set("pickup_location", query.pickup_location);
        params.set("dropoff_location", query.dropoff_location);
        params.set("pickup_date", query.pickup_date);
        if (query.passengers !== undefined) {
            params.set("passengers", String(query.passengers));
        }
        if (query.distance_km !== undefined) {
            params.set("distance_km", String(query.distance_km));
        }
        const json = await (0, http_core_1.withRateLimitRetry)(() => (0, http_core_1.transferCrmFetch)(this.http, `/availability?${params.toString()}`, { method: "GET" }));
        return (0, http_core_1.unwrapData)(json);
    }
    async getAvailabilityForBooking(payload) {
        const query = (0, booking_mappers_1.mapBookingPayloadToAvailabilityQuery)(payload);
        const data = await this.getAvailability(query);
        const vehicleOptions = (data.vehicle_types ?? []).map((item) => ({
            vehicleType: item.vehicle_type ?? "unknown",
            estimatedPrice: item.estimated_price != null && typeof item.estimated_price === "number" ? item.estimated_price : 0,
            currency: item.currency ?? "EUR",
            seatsAvailable: typeof item.seats_available === "number" ? item.seats_available : 0,
            includesDistance: item.includes_distance,
        }));
        return {
            available: Boolean(data.available),
            vehicleOptions,
            pickupLocation: data.pickup_location ?? query.pickup_location,
            dropoffLocation: data.dropoff_location ?? query.dropoff_location,
            pickupDate: data.pickup_date ?? query.pickup_date,
        };
    }
    async postQuote(body) {
        const json = await (0, http_core_1.withRateLimitRetry)(() => (0, http_core_1.transferCrmFetch)(this.http, "/quote", {
            method: "POST",
            body: JSON.stringify(body),
        }));
        return (0, http_core_1.unwrapData)(json);
    }
    async postQuoteForBooking(payload, vehicleType) {
        const ready = await (0, ensure_distance_km_1.resolveBookingPayloadDistance)(payload, this);
        const body = (0, booking_mappers_1.mapBookingPayloadToQuoteRequest)(ready, vehicleType);
        return this.postQuote(body);
    }
    async postBook(body) {
        const json = await (0, http_core_1.withRateLimitRetry)(() => (0, http_core_1.transferCrmFetch)(this.http, "/book", {
            method: "POST",
            body: JSON.stringify(body),
        }));
        return (0, http_core_1.unwrapData)(json);
    }
    async postBookForPaidCheckout(payload, paid) {
        const body = (0, booking_mappers_1.mapBookingPayloadToBookingRequest)(payload, paid);
        const data = await this.postBook(body);
        if (data.booking_id === undefined && !data.order_number) {
            throw new Error("TransferCRM booking response missing data.");
        }
        return {
            bookingId: data.booking_id !== undefined ? String(data.booking_id) : String(data.order_number),
            orderNumber: data.order_number,
            status: data.status,
            trackingUrl: data.tracking_url ?? undefined,
            pickupDate: data.pickup_date,
            price: data.price !== undefined && data.price !== null ? String(data.price) : undefined,
            currency: data.currency,
        };
    }
    async postBookForPayload(payload) {
        const body = (0, booking_mappers_1.mapBookingPayloadToBookingRequest)(payload);
        const data = await this.postBook(body);
        if (data.booking_id === undefined && !data.order_number) {
            throw new Error("TransferCRM booking response missing data.");
        }
        return {
            bookingId: data.booking_id !== undefined ? String(data.booking_id) : String(data.order_number),
            orderNumber: data.order_number,
            status: data.status,
            trackingUrl: data.tracking_url ?? undefined,
            pickupDate: data.pickup_date,
            price: data.price !== undefined && data.price !== null ? String(data.price) : undefined,
            currency: data.currency,
        };
    }
    async getBooking(bookingId) {
        return (0, http_core_1.withRateLimitRetry)(() => (0, http_core_1.transferCrmFetch)(this.http, `/bookings/${encodeURIComponent(bookingId)}`, { method: "GET" }));
    }
    async listBookings(query) {
        const params = new URLSearchParams();
        if (query) {
            for (const [k, v] of Object.entries(query)) {
                if (v !== undefined && v !== "")
                    params.set(k, v);
            }
        }
        const qs = params.toString();
        const path = qs ? `/bookings?${qs}` : `/bookings`;
        return (0, http_core_1.withRateLimitRetry)(() => (0, http_core_1.transferCrmFetch)(this.http, path, { method: "GET" }));
    }
    async patchBooking(bookingId, body) {
        return (0, http_core_1.withRateLimitRetry)(() => (0, http_core_1.transferCrmFetch)(this.http, `/bookings/${encodeURIComponent(bookingId)}`, {
            method: "PATCH",
            body: JSON.stringify(body),
        }));
    }
}
exports.TransferCrmApiClient = TransferCrmApiClient;
function createTransferCrmClientFromEnv() {
    const cfg = (0, config_1.getTransferCrmConfig)();
    return new TransferCrmApiClient({
        baseUrl: cfg.baseUrl,
        timeoutMs: cfg.timeoutMs,
        auth: cfg.auth,
    });
}
//# sourceMappingURL=TransferCrmApiClient.js.map
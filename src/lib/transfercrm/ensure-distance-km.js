"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDistanceKmOnPayload = ensureDistanceKmOnPayload;
exports.resolveBookingPayloadDistance = resolveBookingPayloadDistance;
const estimate_route_distance_km_1 = require("../routing/estimate-route-distance-km");
const booking_mappers_1 = require("./booking-mappers");
async function ensureDistanceKmOnPayload(payload, crm) {
    const existing = payload.details.distanceKm;
    if (existing !== undefined && Number.isFinite(existing) && existing > 0) {
        return payload;
    }
    try {
        const routeQuote = await crm.postQuote((0, booking_mappers_1.mapBookingPayloadToQuoteRequest)(payload));
        const d = Number(routeQuote.distance_km);
        if (Number.isFinite(d) && d > 0) {
            return { ...payload, details: { ...payload.details, distanceKm: d } };
        }
    }
    catch {
    }
    const est = await (0, estimate_route_distance_km_1.estimateRouteDistanceKm)(payload.route.pickup, payload.route.dropoff);
    if (est != null && est > 0) {
        return { ...payload, details: { ...payload.details, distanceKm: est } };
    }
    return payload;
}
const readyByPayload = new WeakMap();
function resolveBookingPayloadDistance(payload, crm) {
    const existing = payload.details.distanceKm;
    if (existing !== undefined && Number.isFinite(existing) && existing > 0) {
        return Promise.resolve(payload);
    }
    let p = readyByPayload.get(payload);
    if (!p) {
        p = ensureDistanceKmOnPayload(payload, crm);
        readyByPayload.set(payload, p);
    }
    return p;
}
//# sourceMappingURL=ensure-distance-km.js.map
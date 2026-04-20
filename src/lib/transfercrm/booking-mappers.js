"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapBookingToB2bBookBody = void 0;
exports.toIsoDateTimeUtc = toIsoDateTimeUtc;
exports.createExternalReference = createExternalReference;
exports.externalReferenceForWay2GoOrder = externalReferenceForWay2GoOrder;
exports.b2bSafeSegment = b2bSafeSegment;
exports.partnerExternalReferencePrefix = partnerExternalReferencePrefix;
exports.resolveB2BExternalReference = resolveB2BExternalReference;
exports.resolveExternalReference = resolveExternalReference;
exports.mapBookingPayloadToAvailabilityQuery = mapBookingPayloadToAvailabilityQuery;
exports.mapBookingPayloadToQuoteRequest = mapBookingPayloadToQuoteRequest;
exports.mergeQuoteDistanceIntoPayload = mergeQuoteDistanceIntoPayload;
exports.mapBookingPayloadToBookingRequest = mapBookingPayloadToBookingRequest;
exports.mapBookingToAvailabilityParams = mapBookingToAvailabilityParams;
const node_crypto_1 = require("node:crypto");
function toIsoDateTimeUtc(date, time) {
    const local = new Date(`${date}T${time}:00`);
    return local.toISOString();
}
function createExternalReference(payload) {
    const raw = [
        payload.contact.email.toLowerCase(),
        payload.contact.phone,
        payload.route.pickup.toLowerCase(),
        payload.route.dropoff.toLowerCase(),
        payload.route.date,
        payload.route.time,
    ].join("|");
    return `w2g_${(0, node_crypto_1.createHash)("sha256").update(raw).digest("hex").slice(0, 24)}`;
}
function externalReferenceForWay2GoOrder(internalOrderId) {
    const safe = internalOrderId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    if (safe.length > 0)
        return `w2g_ord_${safe}`;
    return `w2g_ord_${(0, node_crypto_1.createHash)("sha256").update(internalOrderId).digest("hex").slice(0, 20)}`;
}
function b2bSafeSegment(raw, max) {
    const s = raw
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, max);
    return s.length > 0 ? s : "Partner";
}
function partnerExternalReferencePrefix(partnerRefId) {
    return `B2B-REF-${b2bSafeSegment(partnerRefId, 48)}-`;
}
function resolveB2BExternalReference(payload) {
    const p = payload.partnerBooking;
    if (!p?.partnerDisplayName?.trim()) {
        throw new Error("partnerBooking.partnerDisplayName is required for B2B reference.");
    }
    const idSeg = p.partnerRefId?.trim() ? b2bSafeSegment(p.partnerRefId, 48) : b2bSafeSegment(p.partnerDisplayName, 48);
    return `B2B-REF-${idSeg}-${Date.now()}`.slice(0, 200);
}
function resolveExternalReference(payload) {
    const pb = payload.partnerBooking;
    if (pb?.partnerDisplayName?.trim() && pb.paymentMethod === "account") {
        return resolveB2BExternalReference(payload);
    }
    const internal = payload.internalOrderId?.trim();
    if (internal)
        return externalReferenceForWay2GoOrder(internal);
    return createExternalReference(payload);
}
function mapBookingPayloadToAvailabilityQuery(payload) {
    const q = {
        pickup_location: payload.route.pickup,
        dropoff_location: payload.route.dropoff,
        pickup_date: toIsoDateTimeUtc(payload.route.date, payload.route.time),
        passengers: payload.details.passengers,
    };
    if (payload.details.distanceKm !== undefined) {
        q.distance_km = payload.details.distanceKm;
    }
    return q;
}
function mapBookingPayloadToQuoteRequest(payload, vehicleType) {
    const base = mapBookingPayloadToAvailabilityQuery(payload);
    const distance = payload.details.distanceKm;
    const vt = vehicleType ?? payload.vehicleType;
    return {
        pickup_location: base.pickup_location,
        dropoff_location: base.dropoff_location,
        pickup_date: base.pickup_date,
        ...(distance !== undefined && distance !== null && !Number.isNaN(distance) ? { distance_km: distance } : {}),
        ...(vt ? { vehicle_type: vt } : {}),
        ...(base.passengers !== undefined ? { passengers: base.passengers } : {}),
    };
}
function mergeQuoteDistanceIntoPayload(payload, quote) {
    if (payload.details.distanceKm !== undefined)
        return payload;
    const raw = quote.distance_km;
    if (raw == null)
        return payload;
    const d = Number(raw);
    if (!Number.isFinite(d))
        return payload;
    return {
        ...payload,
        details: { ...payload.details, distanceKm: d },
    };
}
function buildNotesFromPayload(payload) {
    const parts = [];
    const pb = payload.partnerBooking;
    if (pb?.partnerDisplayName?.trim()) {
        if (pb.paymentMethod) {
            const pay = pb.paymentMethod === "stripe" ? "Stripe" : "Account";
            parts.push(`B2B Booking - Partner: ${pb.partnerDisplayName.trim()} - Payment: ${pay}`);
        }
        else {
            parts.push(`B2B | Partner: ${pb.partnerDisplayName.trim()}`);
        }
        if (pb.internalReference?.trim()) {
            parts.push(`Partner internal ref: ${pb.internalReference.trim()}`);
        }
        if (pb.vipRequests?.trim()) {
            parts.push(`VIP / special requests: ${pb.vipRequests.trim()}`);
        }
    }
    if (payload.details.notes?.trim()) {
        parts.push(payload.details.notes.trim());
    }
    if (payload.route.childSeat) {
        parts.push("Child seat requested.");
    }
    if (payload.details.luggage > 0) {
        parts.push(`Luggage pieces: ${payload.details.luggage}`);
    }
    parts.push(`Locale: ${payload.locale}`);
    const merged = parts.join(" | ");
    return merged ? merged.slice(0, 2000) : undefined;
}
function mapBookingPayloadToBookingRequest(payload, paid) {
    const pickup_date = toIsoDateTimeUtc(payload.route.date, payload.route.time);
    const request = {
        pickup_location: payload.route.pickup.slice(0, 500),
        dropoff_location: payload.route.dropoff.slice(0, 500),
        pickup_date,
        passenger_name: payload.contact.fullName.slice(0, 200),
        external_reference: paid?.externalReference ?? resolveExternalReference(payload),
    };
    const phone = payload.contact.phone.trim();
    if (phone) {
        request.passenger_phone = phone;
    }
    const email = payload.contact.email.trim();
    if (email) {
        request.passenger_email = email;
    }
    if (payload.route.flightNumber?.trim()) {
        request.flight_number = payload.route.flightNumber.trim();
    }
    if (payload.details.passengers >= 1) {
        request.passengers_count = payload.details.passengers;
    }
    if (payload.details.distanceKm !== undefined && Number.isFinite(payload.details.distanceKm)) {
        request.distance_km = payload.details.distanceKm;
    }
    const vehicle = paid?.vehicleType?.trim() || payload.vehicleType?.trim();
    if (vehicle) {
        request.vehicle_type = vehicle;
    }
    if (paid) {
        request.price = paid.price;
        request.currency = paid.currency;
    }
    else if (payload.quotedPrice) {
        request.price = payload.quotedPrice.amount;
        request.currency = payload.quotedPrice.currency;
    }
    const notes = buildNotesFromPayload(payload);
    if (notes) {
        request.notes = notes;
    }
    return request;
}
exports.mapBookingToB2bBookBody = mapBookingPayloadToBookingRequest;
function mapBookingToAvailabilityParams(payload) {
    const q = mapBookingPayloadToAvailabilityQuery(payload);
    const params = new URLSearchParams();
    params.set("pickup_location", q.pickup_location);
    params.set("dropoff_location", q.dropoff_location);
    params.set("pickup_date", q.pickup_date);
    if (q.passengers !== undefined) {
        params.set("passengers", String(q.passengers));
    }
    if (q.distance_km !== undefined) {
        params.set("distance_km", String(q.distance_km));
    }
    return params;
}
//# sourceMappingURL=booking-mappers.js.map
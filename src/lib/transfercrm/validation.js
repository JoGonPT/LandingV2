"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBookingPayload = validateBookingPayload;
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
function validateBookingPayload(payload, options) {
    const requireContact = options?.requireContact ?? true;
    const requireGdpr = options?.requireGdpr ?? true;
    if (!payload || typeof payload !== "object") {
        return { ok: false, message: "Invalid payload." };
    }
    const candidate = payload;
    if (candidate.locale !== "pt" && candidate.locale !== "en") {
        return { ok: false, message: "Invalid locale." };
    }
    if (!candidate.route || !isNonEmptyString(candidate.route.pickup) || !isNonEmptyString(candidate.route.dropoff)) {
        return { ok: false, message: "Pickup and dropoff are required." };
    }
    if (!isNonEmptyString(candidate.route.date) || !isNonEmptyString(candidate.route.time)) {
        return { ok: false, message: "Date and time are required." };
    }
    if (!candidate.details || typeof candidate.details.passengers !== "number" || candidate.details.passengers < 1) {
        return { ok: false, message: "Passengers must be at least 1." };
    }
    if (typeof candidate.details.luggage !== "number" || candidate.details.luggage < 0) {
        return { ok: false, message: "Luggage cannot be negative." };
    }
    let distanceKm;
    if (candidate.details.distanceKm !== undefined) {
        if (typeof candidate.details.distanceKm !== "number" || !Number.isFinite(candidate.details.distanceKm)) {
            return { ok: false, message: "Trip distance must be a valid number when provided." };
        }
        if (candidate.details.distanceKm < 0 || candidate.details.distanceKm > 10000) {
            return { ok: false, message: "Trip distance must be between 0 and 10000 km." };
        }
        distanceKm = candidate.details.distanceKm;
    }
    if (candidate.vehicleType !== undefined && candidate.vehicleType !== null) {
        if (typeof candidate.vehicleType !== "string") {
            return { ok: false, message: "Invalid vehicle type." };
        }
    }
    if (candidate.quotedPrice !== undefined) {
        if (!candidate.quotedPrice || typeof candidate.quotedPrice !== "object") {
            return { ok: false, message: "Invalid quoted price." };
        }
        const qp = candidate.quotedPrice;
        if (typeof qp.amount !== "number" || !Number.isFinite(qp.amount)) {
            return { ok: false, message: "Quoted price amount must be a number." };
        }
        if (typeof qp.currency !== "string" || !qp.currency.trim()) {
            return { ok: false, message: "Quoted price currency is required." };
        }
    }
    const hasContact = !!candidate.contact &&
        isNonEmptyString(candidate.contact.fullName) &&
        isNonEmptyString(candidate.contact.email) &&
        isNonEmptyString(candidate.contact.phone);
    if (requireContact && !hasContact) {
        return { ok: false, message: "Contact information is required." };
    }
    if (requireGdpr && !candidate.gdprAccepted) {
        return { ok: false, message: "GDPR consent is required." };
    }
    const normalized = {
        internalOrderId: candidate.internalOrderId?.trim() || undefined,
        locale: candidate.locale,
        route: {
            pickup: candidate.route.pickup.trim(),
            dropoff: candidate.route.dropoff.trim(),
            date: candidate.route.date.trim(),
            time: candidate.route.time.trim(),
            flightNumber: candidate.route.flightNumber?.trim() || undefined,
            childSeat: Boolean(candidate.route.childSeat),
        },
        details: {
            passengers: candidate.details.passengers,
            luggage: candidate.details.luggage,
            notes: candidate.details.notes?.trim() || undefined,
            ...(distanceKm !== undefined ? { distanceKm } : {}),
        },
        ...(candidate.vehicleType?.trim()
            ? { vehicleType: candidate.vehicleType.trim() }
            : {}),
        ...(candidate.quotedPrice
            ? {
                quotedPrice: {
                    amount: candidate.quotedPrice.amount,
                    currency: candidate.quotedPrice.currency.trim(),
                },
            }
            : {}),
        contact: {
            fullName: candidate.contact?.fullName?.trim() || "",
            email: candidate.contact?.email?.trim() || "",
            phone: candidate.contact?.phone?.trim() || "",
        },
        gdprAccepted: Boolean(candidate.gdprAccepted),
    };
    return { ok: true, data: normalized };
}
//# sourceMappingURL=validation.js.map
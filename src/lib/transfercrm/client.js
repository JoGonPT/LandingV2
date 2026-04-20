"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransferCrmClientFromEnv = exports.TransferCrmApiClient = void 0;
exports.getTransferCrmApiClient = getTransferCrmApiClient;
exports.getVehicleOptions = getVehicleOptions;
exports.postQuoteForBooking = postQuoteForBooking;
exports.submitBooking = submitBooking;
exports.getBookingStatus = getBookingStatus;
exports.toPublicError = toPublicError;
const http_core_1 = require("./http-core");
const TransferCrmApiClient_1 = require("./TransferCrmApiClient");
let defaultClient = null;
function getTransferCrmApiClient() {
    if (!defaultClient) {
        defaultClient = (0, TransferCrmApiClient_1.createTransferCrmClientFromEnv)();
    }
    return defaultClient;
}
async function getVehicleOptions(payload) {
    return getTransferCrmApiClient().getAvailabilityForBooking(payload);
}
async function postQuoteForBooking(payload, vehicleType) {
    return getTransferCrmApiClient().postQuoteForBooking(payload, vehicleType);
}
async function submitBooking(payload) {
    return getTransferCrmApiClient().postBookForPayload(payload);
}
async function getBookingStatus(bookingId) {
    return getTransferCrmApiClient().getBooking(bookingId);
}
function toPublicError(error) {
    if (error instanceof http_core_1.TransferCrmValidationFailedError) {
        return {
            code: "CRM_VALIDATION_ERROR",
            message: error.validation.message || "Validation failed for booking request.",
            details: error.validation.errors,
        };
    }
    if (error instanceof http_core_1.TransferCrmHttpError) {
        if (error.status === 401 || error.status === 403) {
            return { code: "AUTH_FAILED", message: "Authentication failed with CRM provider." };
        }
        if (error.status === 429) {
            return { code: "CRM_RATE_LIMIT", message: "Too many requests. Please try again in a moment." };
        }
        if (error.status >= 500) {
            return { code: "CRM_UNAVAILABLE", message: "CRM provider is temporarily unavailable." };
        }
        return { code: "CRM_REQUEST_FAILED", message: "CRM request was rejected." };
    }
    if (error instanceof Error && error.name === "AbortError") {
        return { code: "CRM_TIMEOUT", message: "CRM request timeout." };
    }
    return { code: "UNKNOWN_ERROR", message: "Unexpected error while processing booking." };
}
var TransferCrmApiClient_2 = require("./TransferCrmApiClient");
Object.defineProperty(exports, "TransferCrmApiClient", { enumerable: true, get: function () { return TransferCrmApiClient_2.TransferCrmApiClient; } });
Object.defineProperty(exports, "createTransferCrmClientFromEnv", { enumerable: true, get: function () { return TransferCrmApiClient_2.createTransferCrmClientFromEnv; } });
//# sourceMappingURL=client.js.map
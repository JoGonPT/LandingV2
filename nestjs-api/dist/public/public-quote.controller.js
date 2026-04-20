"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PublicQuoteController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicQuoteController = void 0;
const common_1 = require("@nestjs/common");
const validation_1 = require("../../../src/lib/transfercrm/validation");
const client_1 = require("../../../src/lib/transfercrm/client");
const validation_errors_1 = require("../../../src/lib/transfercrm/validation-errors");
const pricing_service_1 = require("./pricing.service");
function createRequestId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function asError(message, requestId, code = "VALIDATION_ERROR") {
    return { success: false, code, message, requestId };
}
let PublicQuoteController = PublicQuoteController_1 = class PublicQuoteController {
    constructor(pricing) {
        this.pricing = pricing;
        this.log = new common_1.Logger(PublicQuoteController_1.name);
    }
    async quote(body) {
        const requestId = createRequestId();
        this.log.log(`request received requestId=${requestId} vehicleType=${body.vehicleType ?? "(none)"}`);
        try {
            const validated = (0, validation_1.validateBookingPayload)(body.payload);
            if (!validated.ok) {
                this.log.warn(`validation failed requestId=${requestId} message=${validated.message}`);
                throw new common_1.HttpException(asError(validated.message, requestId), common_1.HttpStatus.BAD_REQUEST);
            }
            this.log.log(`calling PricingService.quoteForBooking requestId=${requestId}`);
            const quote = await this.pricing.quoteForBooking(validated.data, body.vehicleType);
            this.log.log(`quote success requestId=${requestId}`);
            return { success: true, data: quote };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            const publicError = (0, client_1.toPublicError)(error);
            const details = publicError.details;
            const friendly = publicError.code === "CRM_VALIDATION_ERROR"
                ? (0, validation_errors_1.firstTransferCrmValidationMessage)(details) || publicError.message
                : publicError.message;
            this.log.error(`quote error requestId=${requestId} code=${publicError.code} message=${publicError.message}`);
            const status = publicError.code === "CRM_VALIDATION_ERROR" ? common_1.HttpStatus.UNPROCESSABLE_ENTITY : common_1.HttpStatus.BAD_GATEWAY;
            throw new common_1.HttpException({ ...asError(friendly, requestId, publicError.code), details: publicError.details }, status);
        }
    }
};
exports.PublicQuoteController = PublicQuoteController;
__decorate([
    (0, common_1.Post)("quote"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PublicQuoteController.prototype, "quote", null);
exports.PublicQuoteController = PublicQuoteController = PublicQuoteController_1 = __decorate([
    (0, common_1.Controller)("public"),
    __metadata("design:paramtypes", [pricing_service_1.PricingService])
], PublicQuoteController);
//# sourceMappingURL=public-quote.controller.js.map
import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Logger, Post } from "@nestjs/common";

import {
  buildBookingPayloadFromQuoteRequest,
  mapQuoteResponseToPublic,
  parseQuoteRequestDto,
  validateQuoteBookingPayload,
} from "@/lib/booking/quote-public";
import { toPublicError } from "@/lib/transfercrm/client";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";
import type { BookingApiError } from "@/lib/transfercrm/types";

import { BookingService } from "./booking.service";
import { PricingService } from "./pricing.service";

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function asError(message: string, requestId: string, code = "VALIDATION_ERROR"): BookingApiError {
  return { success: false, code, message, requestId };
}

@Controller("public")
export class PublicQuoteController {
  private readonly log = new Logger(PublicQuoteController.name);

  constructor(
    private readonly pricing: PricingService,
    private readonly booking: BookingService,
  ) {}

  @Post("quote")
  async quote(@Body() body: unknown) {
    const requestId = createRequestId();
    this.log.log(`request received requestId=${requestId}`);

    const parsed = parseQuoteRequestDto(body);
    if (!parsed.ok) {
      this.log.warn(`dto validation failed requestId=${requestId} message=${parsed.message}`);
      throw new HttpException(asError(parsed.message, requestId), HttpStatus.BAD_REQUEST);
    }

    const dto = parsed.data;
    this.log.log(
      `quote dto requestId=${requestId} vehicleType=${dto.vehicleType ?? "(none)"} passengers=${dto.passengers}`,
    );

    try {
      const internal = buildBookingPayloadFromQuoteRequest(dto);
      const validated = validateQuoteBookingPayload(internal);
      if (!validated.ok) {
        this.log.warn(`payload validation failed requestId=${requestId} message=${validated.message}`);
        throw new HttpException(asError(validated.message, requestId), HttpStatus.BAD_REQUEST);
      }

      this.log.log(`calling PricingService.quoteForBooking requestId=${requestId}`);
      const quote = await this.pricing.quoteForBooking(validated.data, dto.vehicleType);
      this.log.log(`quote success requestId=${requestId}`);
      const data = mapQuoteResponseToPublic(quote, dto.vehicleType);
      return { success: true as const, data };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const publicError = toPublicError(error);
      const details = publicError.details as Record<string, string[]> | undefined;
      const friendly =
        publicError.code === "CRM_VALIDATION_ERROR"
          ? firstTransferCrmValidationMessage(details) || publicError.message
          : publicError.message;
      this.log.error(
        `quote error requestId=${requestId} code=${publicError.code} message=${publicError.message}`,
      );
      const status =
        publicError.code === "CRM_VALIDATION_ERROR" ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.BAD_GATEWAY;
      throw new HttpException(
        { ...asError(friendly, requestId, publicError.code), details: publicError.details },
        status,
      );
    }
  }

  @Post("book")
  @HttpCode(HttpStatus.CREATED)
  async book(@Body() body: unknown, @Headers("idempotency-key") idempotencyKey?: string) {
    return this.booking.createFromPublicDto(body, idempotencyKey);
  }
}

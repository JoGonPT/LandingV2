import Stripe from "stripe";
import { TransferCrmHttpError, TransferCrmValidationFailedError } from "@/lib/transfercrm/http-core";
import { firstTransferCrmValidationMessage } from "@/lib/transfercrm/validation-errors";
import {
  CheckoutAmountMismatchError,
  CheckoutError,
  CheckoutPaymentMetadataError,
  CheckoutPaymentNotCompleteError,
  CheckoutQuoteIncompleteError,
  CheckoutRefundFailedError,
} from "@/lib/checkout/checkout-errors";

export interface PublicCheckoutError {
  code: string;
  message: string;
  status: number;
  details?: unknown;
}

/** Way2Go-facing copy only — never mention TransferCRM or Stripe by name to the user. */
export function toPublicCheckoutError(error: unknown): PublicCheckoutError {
  if (error instanceof TransferCrmValidationFailedError) {
    const details = error.validation.errors;
    const friendly = firstTransferCrmValidationMessage(details) || "Please check your booking details and try again.";
    return { code: "BOOKING_VALIDATION_ERROR", message: friendly, status: 422, details };
  }

  if (error instanceof TransferCrmHttpError) {
    if (error.status === 401 || error.status === 403) {
      return { code: "SERVICE_AUTH_ERROR", message: "The booking service could not be reached. Please try again later.", status: 502 };
    }
    if (error.status === 429) {
      return { code: "RATE_LIMIT", message: "Too many requests. Please wait a moment and try again.", status: 429 };
    }
    if (error.status >= 500) {
      return { code: "SERVICE_UNAVAILABLE", message: "The booking service is temporarily unavailable. Please try again shortly.", status: 502 };
    }
    return { code: "BOOKING_REQUEST_FAILED", message: "We could not complete this step. Please try again.", status: 502 };
  }

  if (error instanceof CheckoutQuoteIncompleteError) {
    return {
      code: error.code,
      message: "We could not confirm the price for this trip. Please check the route and distance, then try again.",
      status: 502,
    };
  }

  if (error instanceof CheckoutPaymentNotCompleteError) {
    return {
      code: error.code,
      message: "Payment was not completed. If a charge appears, contact us and we will help immediately.",
      status: 402,
    };
  }

  if (error instanceof CheckoutPaymentMetadataError || error instanceof CheckoutAmountMismatchError) {
    return {
      code: error.code,
      message: "There was a problem confirming your payment. Please start again or contact support.",
      status: 400,
    };
  }

  if (error instanceof CheckoutRefundFailedError) {
    return {
      code: error.code,
      message: error.message,
      status: 500,
    };
  }

  if (error instanceof CheckoutError) {
    return { code: error.code, message: "Something went wrong with checkout. Please try again.", status: 500 };
  }

  if (error instanceof Stripe.errors.StripeError) {
    return {
      code: "PAYMENT_SERVICE_ERROR",
      message: "Our payment partner is temporarily unavailable. Please try again in a few minutes.",
      status: 502,
    };
  }

  if (error instanceof Error && error.name === "AbortError") {
    return { code: "TIMEOUT", message: "The request took too long. Please try again.", status: 504 };
  }

  return { code: "UNKNOWN_ERROR", message: "Something unexpected happened. Please try again.", status: 500 };
}

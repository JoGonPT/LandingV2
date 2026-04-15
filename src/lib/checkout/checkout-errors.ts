export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

/** Quote response did not include price/currency needed for Stripe. */
export class CheckoutQuoteIncompleteError extends CheckoutError {
  constructor() {
    super("Quote did not return a price and currency.", "QUOTE_INCOMPLETE");
    this.name = "CheckoutQuoteIncompleteError";
  }
}

export class CheckoutPaymentNotCompleteError extends CheckoutError {
  constructor(public readonly stripeStatus: string | null) {
    super(`Payment is not complete (status: ${stripeStatus ?? "unknown"}).`, "PAYMENT_NOT_COMPLETE");
    this.name = "CheckoutPaymentNotCompleteError";
  }
}

export class CheckoutPaymentMetadataError extends CheckoutError {
  constructor() {
    super("Payment metadata is missing or invalid.", "PAYMENT_METADATA_INVALID");
    this.name = "CheckoutPaymentMetadataError";
  }
}

export class CheckoutAmountMismatchError extends CheckoutError {
  constructor() {
    super("Charged amount does not match the quoted price.", "AMOUNT_MISMATCH");
    this.name = "CheckoutAmountMismatchError";
  }
}

export class CheckoutRefundFailedError extends CheckoutError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message, "REFUND_FAILED");
    this.name = "CheckoutRefundFailedError";
  }
}

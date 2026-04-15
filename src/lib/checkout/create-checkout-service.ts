import { CheckoutService } from "@/lib/checkout/CheckoutService";
import { createStripeClient } from "@/lib/checkout/stripe-client";
import { createTransferCrmClientFromEnv } from "@/lib/transfercrm/TransferCrmApiClient";

export function createCheckoutServiceFromEnv(): CheckoutService {
  return new CheckoutService({
    stripe: createStripeClient(),
    crm: createTransferCrmClientFromEnv(),
  });
}

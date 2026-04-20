import { proxyStripeWebhookToNest } from "@/lib/booking/quote-nest-proxy";

export async function POST(request: Request) {
  return proxyStripeWebhookToNest(request);
}

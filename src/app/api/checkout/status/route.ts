import { proxyPaymentsCheckoutStatus } from "@/lib/booking/quote-nest-proxy";

export async function GET(request: Request) {
  return proxyPaymentsCheckoutStatus(request);
}

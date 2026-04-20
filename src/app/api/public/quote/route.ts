import { proxyQuoteToNest } from "@/lib/booking/quote-nest-proxy";

export async function POST(request: Request) {
  return proxyQuoteToNest(request);
}

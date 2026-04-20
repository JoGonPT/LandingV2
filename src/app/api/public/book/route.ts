import { proxyBookToNest } from "@/lib/booking/quote-nest-proxy";

export async function POST(request: Request) {
  return proxyBookToNest(request);
}

import { proxyDriverApiToNest } from "@/lib/drivers/driver-nest-proxy";

export async function GET(request: Request) {
  const u = new URL(request.url);
  return proxyDriverApiToNest(request, `/api/drivers/bookings${u.search}`);
}

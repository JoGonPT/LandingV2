import { proxyDriverApiToNest } from "@/lib/drivers/driver-nest-proxy";

/** Proxies to Nest `POST /api/drivers/status` (`{ booking_id, travel_status }`). */
export async function POST(request: Request) {
  return proxyDriverApiToNest(request, "/api/drivers/status");
}

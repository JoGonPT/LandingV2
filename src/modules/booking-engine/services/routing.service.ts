export interface RouteDistanceInput {
  pickup: string;
  dropoff: string;
  requestedDistanceKm?: number;
}

export interface RouteDistanceResult {
  distanceKm: number;
  source: "request" | "osrm";
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseCoordinates(value: string): { lat: number; lng: number } | null {
  const m = value.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export class RoutingService {
  constructor(private readonly osrmBaseUrl = "https://router.project-osrm.org") {}

  async resolveDistanceKm(input: RouteDistanceInput): Promise<RouteDistanceResult> {
    const requested = toNumber(input.requestedDistanceKm);
    const from = parseCoordinates(input.pickup);
    const to = parseCoordinates(input.dropoff);

    if (from && to) {
      try {
        const url =
          `${this.osrmBaseUrl}/route/v1/driving/` +
          `${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&alternatives=false&steps=false`;
        const response = await fetch(url, { method: "GET" });
        if (response.ok) {
          const data = (await response.json()) as { routes?: Array<{ distance?: number }> };
          const meters = toNumber(data.routes?.[0]?.distance);
          if (meters !== null) {
            return { distanceKm: Number((meters / 1000).toFixed(2)), source: "osrm" };
          }
        }
      } catch {
        // fallback below
      }
    }

    return { distanceKm: requested ?? 0, source: "request" };
  }
}

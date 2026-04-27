/**
 * Road distance estimate (km) when TransferCRM quote requires `distance_km` but cannot derive it alone.
 * Uses Google Directions API (optional), then Nominatim (geocode) + OSRM demo router.
 * Suitable as B2B pricing input; not navigation-grade.
 */

function parseCountriesFromEnv(): string[] {
  const raw = (process.env.PLACES_COUNTRIES ?? "pt,es").trim();
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => /^[a-z]{2}$/.test(item))
    .slice(0, 5);
}

function normalizeAddressVariant(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\(([^)]{2,6})\)/g, "$1")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

function normalizeForMatch(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

type LatLon = { lat: number; lon: number };

const KNOWN_PLACE_COORDS: Array<{ aliases: string[]; coords: LatLon }> = [
  { aliases: ["aeroporto do porto", "aeroporto francisco sa carneiro", "porto airport", "opo airport", " opo "], coords: { lat: 41.2421, lon: -8.6781 } },
  { aliases: ["aeroporto de lisboa", "aeroporto humberto delgado", "lis airport", " lis "], coords: { lat: 38.7742, lon: -9.1342 } },
  { aliases: ["aeroporto de faro", "faro airport", " fao "], coords: { lat: 37.0144, lon: -7.9659 } },
  { aliases: ["aveiro"], coords: { lat: 40.6405, lon: -8.6538 } },
  { aliases: ["porto"], coords: { lat: 41.1579, lon: -8.6291 } },
  { aliases: ["gaia", "vila nova de gaia"], coords: { lat: 41.124, lon: -8.612 } },
  { aliases: ["braga"], coords: { lat: 41.5454, lon: -8.4265 } },
  { aliases: ["coimbra"], coords: { lat: 40.2033, lon: -8.4103 } },
  { aliases: ["leiria"], coords: { lat: 39.7436, lon: -8.8071 } },
  { aliases: ["viseu"], coords: { lat: 40.661, lon: -7.9097 } },
  { aliases: ["guimaraes"], coords: { lat: 41.4425, lon: -8.2918 } },
  { aliases: ["lisboa", "lisbon"], coords: { lat: 38.7223, lon: -9.1393 } },
  { aliases: ["setubal"], coords: { lat: 38.5244, lon: -8.8882 } },
  { aliases: ["faro"], coords: { lat: 37.0194, lon: -7.9304 } },
  { aliases: ["madrid"], coords: { lat: 40.4168, lon: -3.7038 } },
  { aliases: ["barcelona"], coords: { lat: 41.3874, lon: 2.1686 } },
  { aliases: ["vigo"], coords: { lat: 42.2406, lon: -8.7207 } },
];

function knownPlaceCoords(address: string): LatLon | null {
  const n = ` ${normalizeForMatch(address)} `;
  if (
    n.includes(" aeroporto do porto ") ||
    n.includes(" francisco sa carneiro ") ||
    n.includes(" porto airport ") ||
    /\bopo\b/.test(n)
  ) {
    return { lat: 41.2421, lon: -8.6781 };
  }
  if (
    n.includes(" aeroporto de lisboa ") ||
    n.includes(" aeroporto humberto delgado ") ||
    n.includes(" lis airport ") ||
    /\blis\b/.test(n)
  ) {
    return { lat: 38.7742, lon: -9.1342 };
  }
  if (
    n.includes(" aeroporto de faro ") ||
    n.includes(" faro airport ") ||
    /\bfao\b/.test(n)
  ) {
    return { lat: 37.0144, lon: -7.9659 };
  }
  for (const entry of KNOWN_PLACE_COORDS) {
    if (entry.aliases.some((alias) => n.includes(` ${normalizeForMatch(alias)} `) || n.includes(normalizeForMatch(alias)))) {
      return entry.coords;
    }
  }
  return null;
}

function getGoogleMapsApiKey(): string | null {
  const raw = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return raw ? raw : null;
}

async function googleDrivingDistanceKm(pickup: string, dropoff: string): Promise<number | null> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return null;
  const params = new URLSearchParams({
    origin: pickup.trim(),
    destination: dropoff.trim(),
    mode: "driving",
    key: apiKey,
  });
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      status?: string;
      routes?: Array<{ legs?: Array<{ distance?: { value?: number } }> }>;
    };
    if (json.status !== "OK") return null;
    const legs = json.routes?.[0]?.legs ?? [];
    const meters = legs.reduce((sum, leg) => sum + (typeof leg.distance?.value === "number" ? leg.distance.value : 0), 0);
    if (!Number.isFinite(meters) || meters <= 0) return null;
    return meters / 1000;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function buildAddressVariants(address: string): string[] {
  const out = new Set<string>();
  const a = address.trim();
  if (!a) return [];
  out.add(a);
  out.add(normalizeAddressVariant(a));

  // Try first segment only (often enough for airport names with long suffixes).
  const firstSeg = a.split(",")[0]?.trim();
  if (firstSeg) {
    out.add(firstSeg);
    out.add(normalizeAddressVariant(firstSeg));
  }

  // OPO-specific resilience: explicit airport aliases.
  const am = normalizeForMatch(a);
  if (
    /\bOPO\b/i.test(a) ||
    /Francisco S[aá] Carneiro/i.test(a) ||
    am.includes("aeroporto do porto") ||
    am.includes("porto airport") ||
    am.includes("sa carneiro") ||
    am.includes("francisco sa carneiro")
  ) {
    out.add("Aeroporto Francisco Sá Carneiro");
    out.add("Porto Airport OPO");
    out.add("OPO Airport");
    out.add("Aeroporto do Porto");
    out.add("Francisco Sa Carneiro Airport");
  }

  return [...out].filter(Boolean);
}

async function geocodeNominatim(address: string): Promise<{ lat: number; lon: number } | null> {
  const q = address.trim();
  if (!q) return null;
  const known = knownPlaceCoords(q);
  if (known) return known;
  const countries = parseCountriesFromEnv();
  const trySearch = async (countrycodes: string | undefined) => {
    for (const candidate of buildAddressVariants(q)) {
      const params = new URLSearchParams({
        q: candidate,
        format: "jsonv2",
        limit: "1",
        "accept-language": "en-GB",
      });
      if (countrycodes) params.set("countrycodes", countrycodes);
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          headers: {
            Accept: "application/json",
            "User-Agent": "Way2GoLanding/1.0 (way2go.pt; route-distance estimate)",
          },
          signal: controller.signal,
        });
        if (!response.ok) continue;
        const rows = (await response.json()) as Array<{ lat?: string; lon?: string }>;
        const row = rows[0];
        if (!row?.lat || !row?.lon) continue;
        const lat = Number(row.lat);
        const lon = Number(row.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        return { lat, lon };
      } finally {
        clearTimeout(t);
      }
    }
    return null;
  };

  const withCountries = countries.length > 0 ? countries.join(",") : undefined;
  if (withCountries) {
    const a = await trySearch(withCountries);
    if (a) return a;
  }
  return trySearch(undefined);
}

async function osrmDrivingDistanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): Promise<number | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { routes?: Array<{ distance?: number }> };
    const meters = json.routes?.[0]?.distance;
    if (typeof meters !== "number" || !Number.isFinite(meters) || meters <= 0) return null;
    return meters / 1000;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Haversine km (great-circle), used only if OSRM fails. */
function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

/**
 * Returns a positive distance in km, or null if geocoding/routing could not produce one.
 */
export async function estimateRouteDistanceKm(pickup: string, dropoff: string): Promise<number | null> {
  const googleKm = await googleDrivingDistanceKm(pickup, dropoff);
  if (googleKm != null && googleKm > 0) {
    return Math.min(10000, Math.round(googleKm * 1000) / 1000);
  }
  const [from, to] = await Promise.all([geocodeNominatim(pickup), geocodeNominatim(dropoff)]);
  if (!from || !to) return null;
  const road = await osrmDrivingDistanceKm(from, to);
  if (road != null && road > 0) {
    return Math.min(10000, Math.round(road * 1000) / 1000);
  }
  const straight = haversineKm(from, to);
  if (!Number.isFinite(straight) || straight <= 0) return null;
  // Rough road factor when OSRM is unavailable
  const approx = straight * 1.25;
  return Math.min(10000, Math.round(approx * 1000) / 1000);
}

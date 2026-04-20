"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateRouteDistanceKm = estimateRouteDistanceKm;
function parseCountriesFromEnv() {
    const raw = (process.env.PLACES_COUNTRIES ?? "pt,es").trim();
    return raw
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => /^[a-z]{2}$/.test(item))
        .slice(0, 5);
}
async function geocodeNominatim(address) {
    const q = address.trim();
    if (!q)
        return null;
    const countries = parseCountriesFromEnv();
    const trySearch = async (countrycodes) => {
        const params = new URLSearchParams({
            q,
            format: "jsonv2",
            limit: "1",
            "accept-language": "en-GB",
        });
        if (countrycodes)
            params.set("countrycodes", countrycodes);
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
            if (!response.ok)
                return null;
            const rows = (await response.json());
            const row = rows[0];
            if (!row?.lat || !row?.lon)
                return null;
            const lat = Number(row.lat);
            const lon = Number(row.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon))
                return null;
            return { lat, lon };
        }
        finally {
            clearTimeout(t);
        }
    };
    const withCountries = countries.length > 0 ? countries.join(",") : undefined;
    if (withCountries) {
        const a = await trySearch(withCountries);
        if (a)
            return a;
    }
    return trySearch(undefined);
}
async function osrmDrivingDistanceKm(a, b) {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(url, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
        });
        if (!response.ok)
            return null;
        const json = (await response.json());
        const meters = json.routes?.[0]?.distance;
        if (typeof meters !== "number" || !Number.isFinite(meters) || meters <= 0)
            return null;
        return meters / 1000;
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(t);
    }
}
function haversineKm(a, b) {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
}
async function estimateRouteDistanceKm(pickup, dropoff) {
    const [from, to] = await Promise.all([geocodeNominatim(pickup), geocodeNominatim(dropoff)]);
    if (!from || !to)
        return null;
    const road = await osrmDrivingDistanceKm(from, to);
    if (road != null && road > 0) {
        return Math.min(10000, Math.round(road * 1000) / 1000);
    }
    const straight = haversineKm(from, to);
    if (!Number.isFinite(straight) || straight <= 0)
        return null;
    const approx = straight * 1.25;
    return Math.min(10000, Math.round(approx * 1000) / 1000);
}
//# sourceMappingURL=estimate-route-distance-km.js.map
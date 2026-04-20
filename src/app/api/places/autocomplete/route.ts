import { NextResponse } from "next/server";

interface PlaceSuggestion {
  id: string;
  label: string;
}

interface PlacesRequestContext {
  languageCode: string;
  countries: string[];
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
}

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeQuery(q: string | null): string {
  return (q ?? "").trim().slice(0, 120);
}

function parseCountriesFromEnv(): string[] {
  const raw = (process.env.PLACES_COUNTRIES ?? "pt,es").trim();
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => /^[a-z]{2}$/.test(item))
    .slice(0, 5);
}

function parseNumber(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseBoundingBoxFromEnv() {
  // Covers mainland Portugal + Spain with a small sea margin.
  const raw = (process.env.PLACES_BOUNDING_BOX ?? "-10.2,35.4,4.8,44.6").trim();
  const [westRaw, southRaw, eastRaw, northRaw] = raw.split(",").map((s) => s.trim());
  const west = parseNumber(westRaw ?? "");
  const south = parseNumber(southRaw ?? "");
  const east = parseNumber(eastRaw ?? "");
  const north = parseNumber(northRaw ?? "");

  if (
    west === null ||
    south === null ||
    east === null ||
    north === null ||
    west >= east ||
    south >= north ||
    west < -180 ||
    east > 180 ||
    south < -90 ||
    north > 90
  ) {
    return { west: -10.2, south: 35.4, east: 4.8, north: 44.6 };
  }

  return { west, south, east, north };
}

function resolveLanguageCode(locale: string | null): string {
  const normalized = (locale ?? "").trim().toLowerCase();
  if (normalized.startsWith("pt")) return "pt-PT";
  if (normalized.startsWith("es")) return "es-ES";
  return "en-GB";
}

async function fetchGoogleSuggestions(
  input: string,
  apiKey: string,
  context: PlacesRequestContext,
): Promise<PlaceSuggestion[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "suggestions.placePrediction.place,suggestions.placePrediction.text.text",
    },
    body: JSON.stringify({
      input,
      languageCode: context.languageCode,
      includedRegionCodes: context.countries,
      includeQueryPredictions: false,
      locationRestriction: {
        rectangle: {
          low: { latitude: context.bbox.south, longitude: context.bbox.west },
          high: { latitude: context.bbox.north, longitude: context.bbox.east },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Google places autocomplete failed with status ${response.status}`);
  }
  const json = (await response.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        place?: string;
        text?: { text?: string };
      };
    }>;
  };

  return (json.suggestions ?? [])
    .map((item) => {
      const id = item.placePrediction?.place ?? "";
      const label = item.placePrediction?.text?.text ?? "";
      if (!id || !label) return null;
      return { id, label };
    })
    .filter((item): item is PlaceSuggestion => Boolean(item))
    .slice(0, 6);
}

async function fetchNominatimSuggestions(
  input: string,
  context: PlacesRequestContext,
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({
    q: input,
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
    "accept-language": context.languageCode,
    countrycodes: context.countries.join(","),
    viewbox: `${context.bbox.west},${context.bbox.north},${context.bbox.east},${context.bbox.south}`,
    bounded: "1",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      // Nominatim policy requests identifying User-Agent/Referer.
      "User-Agent": "Way2GoLanding/1.0 (way2go.pt)",
    },
  });
  if (!response.ok) return [];

  const json = (await response.json()) as Array<{
    place_id?: number;
    display_name?: string;
    address?: { country_code?: string };
  }>;
  const allowed = new Set(context.countries.map((c) => c.toLowerCase()));
  return json
    .map((item) => {
      const cc = item.address?.country_code?.toLowerCase();
      if (!cc || !allowed.has(cc)) return null;
      if (!item.place_id || !item.display_name) return null;
      return { id: String(item.place_id), label: item.display_name };
    })
    .filter((item): item is PlaceSuggestion => Boolean(item));
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const { searchParams } = new URL(request.url);
    const query = sanitizeQuery(searchParams.get("q"));
    if (query.length < 3) {
      return NextResponse.json({ success: true as const, suggestions: [] }, { status: 200 });
    }

    const context: PlacesRequestContext = {
      languageCode: resolveLanguageCode(searchParams.get("locale")),
      countries: parseCountriesFromEnv(),
      bbox: parseBoundingBoxFromEnv(),
    };

    const provider = (process.env.PLACES_PROVIDER ?? "nominatim").trim().toLowerCase();
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

    let suggestions: PlaceSuggestion[] = [];
    if (provider === "google" && googleApiKey) {
      try {
        suggestions = await fetchGoogleSuggestions(query, googleApiKey, context);
      } catch {
        // Quota/auth/network errors on Google should not break UX; fallback to OSM.
        suggestions = await fetchNominatimSuggestions(query, context);
      }
    } else {
      suggestions = await fetchNominatimSuggestions(query, context);
    }

    return NextResponse.json({ success: true as const, suggestions }, { status: 200 });
  } catch (error) {
    console.error("[places-autocomplete]", { requestId, error });
    return NextResponse.json(
      {
        success: false as const,
        code: "PLACES_ERROR",
        message: "Could not load location suggestions right now.",
      },
      { status: 502 },
    );
  }
}

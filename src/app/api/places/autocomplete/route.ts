import { NextResponse } from "next/server";

interface PlaceSuggestion {
  id: string;
  label: string;
}

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeQuery(q: string | null): string {
  return (q ?? "").trim().slice(0, 120);
}

async function fetchGoogleSuggestions(input: string, apiKey: string): Promise<PlaceSuggestion[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "suggestions.placePrediction.place,suggestions.placePrediction.text.text",
    },
    body: JSON.stringify({
      input,
      languageCode: "en",
      includeQueryPredictions: false,
    }),
  });

  if (!response.ok) return [];
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

async function fetchNominatimSuggestions(input: string): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({
    q: input,
    format: "jsonv2",
    addressdetails: "0",
    limit: "6",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      // Nominatim policy requests identifying User-Agent/Referer.
      "User-Agent": "Way2GoLanding/1.0 (way2go.pt)",
    },
  });
  if (!response.ok) return [];

  const json = (await response.json()) as Array<{ place_id?: number; display_name?: string }>;
  return json
    .map((item) => {
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

    const provider = (process.env.PLACES_PROVIDER ?? "nominatim").trim().toLowerCase();
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

    let suggestions: PlaceSuggestion[] = [];
    if (provider === "google" && googleApiKey) {
      suggestions = await fetchGoogleSuggestions(query, googleApiKey);
    } else {
      suggestions = await fetchNominatimSuggestions(query);
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

import { useEffect, useRef, useState } from "react";

import { quoteCacheKey } from "@/lib/booking/quote-cache-key";
import type { BookingPayload } from "@/lib/transfercrm/types";
import type { QuoteResponse } from "@/lib/transfercrm/openapi.types";

const DEBOUNCE_MS = 500;
const MAX_CACHE = 48;

function trimCache(map: Map<string, QuoteResponse>) {
  while (map.size > MAX_CACHE) {
    const first = map.keys().next().value;
    if (first === undefined) break;
    map.delete(first);
  }
}

export function useDebouncedQuote(state: {
  payload: BookingPayload | null;
  vehicleType: string;
  enabled: boolean;
}): { quote: QuoteResponse | null; loading: boolean; error: string | null } {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, QuoteResponse>());

  useEffect(() => {
    if (!state.enabled || !state.payload || !state.vehicleType.trim()) {
      setQuote(null);
      setLoading(false);
      setError(null);
      return;
    }

    const key = quoteCacheKey(state.payload, state.vehicleType);
    const cached = cacheRef.current.get(key);
    if (cached) {
      setQuote(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setQuote(null);
    setError(null);
    setLoading(true);

    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/booking/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: state.payload, vehicleType: state.vehicleType }),
          signal: ac.signal,
        });
        const body = (await res.json().catch(() => null)) as
          | { success?: boolean; data?: QuoteResponse; message?: string }
          | null;

        if (!res.ok || !body || body.success !== true || !body.data) {
          setQuote(null);
          setError(typeof body?.message === "string" ? body.message : "Quote failed.");
          return;
        }

        cacheRef.current.set(key, body.data);
        trimCache(cacheRef.current);
        setQuote(body.data);
        setError(null);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setQuote(null);
        setError("Quote failed.");
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [state.enabled, state.payload, state.vehicleType]);

  return { quote, loading, error };
}

import { useEffect, useState } from "react";

const DEBOUNCE_MS = 550;

export type RoutePreviewData = {
  source: "quote" | "availability";
  distanceKm: number | null;
  price: number | null;
  currency: string | null;
};

export function useDebouncedRoutePreview(state: {
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  passengers: number;
  enabled: boolean;
}): { loading: boolean; error: string | null; data: RoutePreviewData | null } {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RoutePreviewData | null>(null);

  useEffect(() => {
    if (!state.enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const pickup = state.pickup.trim();
    const dropoff = state.dropoff.trim();
    const date = state.date.trim();
    const time = state.time.trim();
    if (!pickup || !dropoff || !date || !time || state.passengers < 1) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/booking/route-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pickup,
            dropoff,
            date,
            time,
            passengers: state.passengers,
          }),
          signal: ac.signal,
        });
        const body = (await res.json().catch(() => null)) as
          | {
              success?: boolean;
              source?: RoutePreviewData["source"];
              distanceKm?: number | null;
              price?: number | null;
              currency?: string | null;
              message?: string;
            }
          | null;

        if (!res.ok || !body || body.success !== true || !body.source) {
          setData(null);
          setError(typeof body?.message === "string" ? body.message : "Preview unavailable.");
          return;
        }

        setData({
          source: body.source,
          distanceKm: body.distanceKm ?? null,
          price: body.price ?? null,
          currency: body.currency ?? null,
        });
        setError(null);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setData(null);
        setError("Preview unavailable.");
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [state.enabled, state.pickup, state.dropoff, state.date, state.time, state.passengers]);

  return { loading, error, data };
}

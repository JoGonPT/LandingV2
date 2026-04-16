"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { driverBookingHref, driverLoginHref } from "@/lib/drivers/client-paths";

type BookingRow = {
  booking_id?: number;
  order_number?: string;
  pickup_location?: string;
  dropoff_location?: string;
  pickup_date?: string;
  status?: string;
  travel_status?: string | null;
};

function pickString(r: Record<string, unknown>, key: string): string | undefined {
  const v = r[key];
  return typeof v === "string" ? v : undefined;
}

function pickNumber(r: Record<string, unknown>, key: string): number | undefined {
  const v = r[key];
  return typeof v === "number" ? v : undefined;
}

function formatWhen(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function ScheduleClient() {
  const router = useRouter();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/drivers/bookings/", { credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as { data?: unknown[]; error?: string };
      if (res.status === 401) {
        router.push(driverLoginHref());
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Could not load schedule.");
        setRows([]);
        return;
      }
      const rawList = Array.isArray(json.data) ? json.data : [];
      const mapped: BookingRow[] = rawList.map((item) => {
        const r = item as Record<string, unknown>;
        return {
          booking_id: pickNumber(r, "booking_id"),
          order_number: pickString(r, "order_number"),
          pickup_location: pickString(r, "pickup_location"),
          dropoff_location: pickString(r, "dropoff_location"),
          pickup_date: pickString(r, "pickup_date"),
          status: pickString(r, "status"),
          travel_status: (r.travel_status as string | null | undefined) ?? null,
        };
      });
      setRows(mapped);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    await fetch("/api/drivers/auth/logout/", { method: "POST", credentials: "include" });
    router.push(driverLoginHref());
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Schedule</h1>
          <p className="mt-1 text-neutral-400">Your assigned jobs</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-xl border border-neutral-600 px-4 py-3 text-sm font-medium text-neutral-200"
        >
          Log out
        </button>
      </header>

      <button
        type="button"
        onClick={() => void load()}
        className="mb-6 w-full min-h-14 rounded-2xl border border-neutral-600 text-base font-medium text-white"
      >
        Refresh
      </button>

      {loading ? <p className="text-neutral-400">Loading…</p> : null}
      {error ? <p className="mb-4 text-red-400">{error}</p> : null}

      <ul className="flex flex-col gap-4">
        {!loading && !error && rows.length === 0 ? (
          <li className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">No bookings found.</li>
        ) : null}
        {rows.map((row) => {
          const id = row.booking_id;
          if (id == null) return null;
          return (
            <li key={id}>
              <Link
                href={driverBookingHref(String(id))}
                className="block rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-white no-underline active:border-white"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold">{row.order_number ?? `#${id}`}</span>
                  <span className="text-sm text-neutral-500">{formatWhen(row.pickup_date)}</span>
                </div>
                <p className="mt-3 line-clamp-2 text-base text-neutral-300">{row.pickup_location ?? "Pickup"}</p>
                <p className="mt-1 line-clamp-2 text-base text-neutral-500">→ {row.dropoff_location ?? "Dropoff"}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
                  {row.status ? <span className="rounded-full border border-neutral-700 px-2 py-1">{row.status}</span> : null}
                  {row.travel_status ? (
                    <span className="rounded-full border border-neutral-700 px-2 py-1">{row.travel_status}</span>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

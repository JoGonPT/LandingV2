"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { driverBookingHref, driverLoginHref } from "@/lib/drivers/client-paths";
import type { DriverJobDto } from "@/lib/drivers/job-dto";

const POLL_MS = 30_000;

type BookingRow = {
  booking_id?: number;
  order_number?: string;
  pickup_location?: string;
  dropoff_location?: string;
  pickup_date?: string;
  status?: string;
  travel_status?: string | null;
  tracking_url?: string | null;
};

function formatWhen(iso?: string | null): string {
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

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parsePickup(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isCompleted(row: BookingRow): boolean {
  const s = (row.status ?? "").toLowerCase().trim();
  const t = (row.travel_status ?? "").toLowerCase().trim();
  return s === "completed" || t === "completed";
}

function pickupDayMs(iso?: string | null): number | null {
  const d = parsePickup(iso);
  if (!d) return null;
  return startOfLocalDay(d).getTime();
}

function sortByPickupAsc(a: BookingRow, b: BookingRow): number {
  const ta = parsePickup(a.pickup_date)?.getTime() ?? 0;
  const tb = parsePickup(b.pickup_date)?.getTime() ?? 0;
  return ta - tb;
}

function sortByPickupDesc(a: BookingRow, b: BookingRow): number {
  return sortByPickupAsc(b, a);
}

type ScheduleBuckets = {
  today: BookingRow[];
  upcoming: BookingRow[];
  completed: BookingRow[];
};

function bucketRows(rows: BookingRow[]): ScheduleBuckets {
  const now = new Date();
  const sodMs = startOfLocalDay(now).getTime();
  const completed: BookingRow[] = [];
  const today: BookingRow[] = [];
  const upcoming: BookingRow[] = [];

  for (const row of rows) {
    if (isCompleted(row)) {
      completed.push(row);
      continue;
    }
    const dayMs = pickupDayMs(row.pickup_date);
    if (dayMs === null) {
      upcoming.push(row);
      continue;
    }
    if (dayMs < sodMs) {
      today.push(row);
      continue;
    }
    if (dayMs === sodMs) {
      today.push(row);
      continue;
    }
    upcoming.push(row);
  }

  today.sort(sortByPickupAsc);
  upcoming.sort(sortByPickupAsc);
  completed.sort(sortByPickupDesc);

  return { today, upcoming, completed };
}

function jobDtoToRow(j: DriverJobDto): BookingRow {
  return {
    booking_id: j.booking_id ?? undefined,
    order_number: j.order_number ?? undefined,
    pickup_location: j.pickup_location ?? undefined,
    dropoff_location: j.dropoff_location ?? undefined,
    pickup_date: j.pickup_date ?? undefined,
    status: j.status ?? undefined,
    travel_status: j.travel_status,
    tracking_url: j.tracking_url,
  };
}

function TripCard({ row }: { row: BookingRow }) {
  const id = row.booking_id;
  if (id == null) return null;
  const tracking = row.tracking_url?.trim();
  return (
    <li className="flex flex-col gap-3">
      <Link
        href={driverBookingHref(String(id))}
        className="block min-h-[5.5rem] rounded-2xl border-2 border-neutral-800 bg-neutral-950 px-5 py-5 text-white no-underline transition-colors active:border-white hover:border-neutral-600"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-semibold leading-tight">{row.order_number ?? `#${id}`}</span>
          <span className="shrink-0 text-sm tabular-nums text-neutral-500">{formatWhen(row.pickup_date)}</span>
        </div>
        <p className="mt-3 line-clamp-2 text-base leading-snug text-neutral-200">{row.pickup_location ?? "Pickup"}</p>
        <p className="mt-1 line-clamp-2 text-base leading-snug text-neutral-500">→ {row.dropoff_location ?? "Dropoff"}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
          {row.status ? (
            <span className="rounded-full border border-neutral-700 px-3 py-1.5">{row.status}</span>
          ) : null}
          {row.travel_status ? (
            <span className="rounded-full border border-neutral-700 px-3 py-1.5">{row.travel_status}</span>
          ) : null}
        </div>
      </Link>
      {tracking ? (
        <a
          href={tracking}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-violet-700/80 bg-violet-950/50 text-center text-sm font-semibold text-violet-100 no-underline active:border-violet-400"
        >
          Customer tracking page
        </a>
      ) : null}
    </li>
  );
}

function Section({
  title,
  subtitle,
  rows,
  emptyLabel,
}: {
  title: string;
  subtitle?: string;
  rows: BookingRow[];
  emptyLabel: string;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-neutral-600">{subtitle}</p> : null}
      {rows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-neutral-800/80 bg-neutral-950/80 px-5 py-6 text-center text-neutral-500">
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {rows
            .filter((row) => row.booking_id != null)
            .map((row) => (
              <TripCard key={row.booking_id} row={row} />
            ))}
        </ul>
      )}
    </section>
  );
}

export function ScheduleClient() {
  const router = useRouter();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPoll, setLastPoll] = useState<string | null>(null);

  const buckets = useMemo(() => bucketRows(rows), [rows]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/driver/my-jobs?mode=schedule`, { credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as {
        jobs?: DriverJobDto[];
        error?: string;
        polledAt?: string;
      };
      if (res.status === 401) {
        router.push(driverLoginHref());
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Could not load schedule.");
        setRows([]);
        return;
      }
      const list = Array.isArray(json.jobs) ? json.jobs : [];
      setRows(list.map(jobDtoToRow));
      setLastPoll(json.polledAt ?? new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void load();
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  async function logout() {
    await fetch("/api/drivers/auth/logout/", { method: "POST", credentials: "include" });
    router.push(driverLoginHref());
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">Way2Go</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Chauffeur</h1>
          <p className="mt-1 text-sm text-neutral-500">Your assigned trips</p>
          {lastPoll ? (
            <p className="mt-1 text-[10px] text-neutral-600 tabular-nums">Updated {new Date(lastPoll).toLocaleTimeString()}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-12 shrink-0 rounded-2xl border-2 border-neutral-700 px-5 text-sm font-semibold text-neutral-100 active:border-white"
        >
          Log out
        </button>
      </header>

      <button
        type="button"
        onClick={() => void load()}
        className="mb-8 w-full min-h-14 rounded-2xl border-2 border-neutral-600 bg-neutral-950 text-base font-semibold text-white active:border-white"
      >
        Refresh schedule
      </button>

      {loading ? <p className="text-neutral-500">Loading…</p> : null}
      {error ? <p className="mb-6 rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-red-200">{error}</p> : null}

      {!loading && !error && rows.length === 0 ? (
        <p className="rounded-2xl border border-neutral-800 bg-neutral-950 px-5 py-8 text-center text-neutral-500">
          No bookings assigned.
        </p>
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <Section
            title="Today & open"
            subtitle="Earlier dates and today — complete or start these first."
            rows={buckets.today}
            emptyLabel="Nothing due today or overdue."
          />
          <Section title="Upcoming" rows={buckets.upcoming} emptyLabel="No future trips scheduled." />
          <Section title="Completed" rows={buckets.completed} emptyLabel="No completed trips in this list." />
        </>
      ) : null}
    </main>
  );
}

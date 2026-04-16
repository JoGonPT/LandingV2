"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { driverHomeHref, driverLoginHref } from "@/lib/drivers/client-paths";
import { googleMapsNavigateUrl, telHref, wazeNavigateUrl, whatsappHref } from "@/lib/drivers/nav-links";

const STATUS_PRESETS: { label: string; value: string }[] = [
  { label: "Arrived", value: "arrived" },
  { label: "Passenger on board", value: "passenger_on_board" },
  { label: "Completed", value: "completed" },
];

function pickString(r: Record<string, unknown>, key: string): string | undefined {
  const v = r[key];
  return typeof v === "string" ? v : undefined;
}

export function BookingDetailClient({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/drivers/bookings/${encodeURIComponent(bookingId)}/`, { credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as { data?: Record<string, unknown>; error?: string };
      if (res.status === 401) {
        router.push(driverLoginHref());
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Could not load job.");
        setRow(null);
        return;
      }
      setRow(json.data ?? null);
    } finally {
      setLoading(false);
    }
  }, [bookingId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setTravelStatus(travel_status: string) {
    setStatusMsg(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/drivers/bookings/${encodeURIComponent(bookingId)}/travel-status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ travel_status }),
      });
      const json = (await res.json().catch(() => ({}))) as { warning?: string; error?: string };
      if (res.status === 401) {
        router.push(driverLoginHref());
        return;
      }
      if (!res.ok) {
        setStatusMsg(json.error ?? "Update failed.");
        return;
      }
      if (json.warning) setStatusMsg(json.warning);
      else setStatusMsg("Status updated.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
        <p className="text-neutral-400">Loading…</p>
      </main>
    );
  }

  if (error || !row) {
    return (
      <main className="mx-auto min-h-screen max-w-lg px-4 py-8">
        <p className="text-red-400">{error ?? "Not found."}</p>
        <Link href={driverHomeHref()} className="mt-6 inline-block text-lg text-white underline">
          Back to schedule
        </Link>
      </main>
    );
  }

  const pickup = pickString(row, "pickup_location") ?? "";
  const dropoff = pickString(row, "dropoff_location") ?? "";
  const passenger = pickString(row, "passenger_name");
  const phone = pickString(row, "passenger_phone");
  const flight = pickString(row, "flight_number");
  const flightStatus = pickString(row, "flight_status");
  const order = pickString(row, "order_number");
  const travelStatus = row.travel_status != null ? String(row.travel_status) : "";

  const navigateTarget = pickup || dropoff;

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-8">
      <Link href={driverHomeHref()} className="mb-6 inline-block text-neutral-400 no-underline">
        ← Schedule
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{order ?? `Booking ${bookingId}`}</h1>
      {travelStatus ? <p className="mt-2 text-sm text-neutral-500">Travel status: {travelStatus}</p> : null}

      <section className="mt-8 space-y-4 text-base">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Pickup</h2>
          <p className="mt-2 text-lg text-white">{pickup || "—"}</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Dropoff</h2>
          <p className="mt-2 text-lg text-white">{dropoff || "—"}</p>
        </div>
        {(passenger || phone) && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Passenger</h2>
            {passenger ? <p className="mt-2 text-lg text-white">{passenger}</p> : null}
            {phone ? <p className="mt-1 text-neutral-400">{phone}</p> : null}
          </div>
        )}
        {(flight || flightStatus) && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Flight</h2>
            {flight ? <p className="mt-2 text-lg text-white">{flight}</p> : null}
            {flightStatus ? <p className="mt-1 text-neutral-400">Status: {flightStatus}</p> : null}
          </div>
        )}
      </section>

      <section className="mt-10 flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Navigation</h2>
        <a
          href={navigateTarget ? googleMapsNavigateUrl(navigateTarget) : "#"}
          className="flex min-h-16 items-center justify-center rounded-2xl bg-white text-center text-lg font-semibold text-black no-underline"
        >
          Google Maps
        </a>
        <a
          href={navigateTarget ? wazeNavigateUrl(navigateTarget) : "#"}
          className="flex min-h-16 items-center justify-center rounded-2xl border-2 border-white text-center text-lg font-semibold text-white no-underline"
        >
          Waze
        </a>
      </section>

      {phone ? (
        <section className="mt-10 flex flex-col gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Contact</h2>
          <a
            href={telHref(phone)}
            className="flex min-h-16 items-center justify-center rounded-2xl bg-neutral-100 text-center text-lg font-semibold text-black no-underline"
          >
            Call passenger
          </a>
          <a
            href={whatsappHref(phone)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-16 items-center justify-center rounded-2xl border border-neutral-600 text-center text-lg font-semibold text-white no-underline"
          >
            WhatsApp
          </a>
        </section>
      ) : null}

      <section className="mt-12 flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Travel status</h2>
        {STATUS_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            disabled={busy}
            onClick={() => void setTravelStatus(p.value)}
            className="min-h-16 rounded-2xl border border-neutral-600 text-lg font-semibold text-white disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
        {statusMsg ? <p className="text-sm text-neutral-400">{statusMsg}</p> : null}
      </section>
    </main>
  );
}

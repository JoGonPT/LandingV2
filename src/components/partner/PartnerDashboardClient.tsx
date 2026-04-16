"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { formatMoneyAmount } from "@/lib/checkout/format-money";
import type { PartnerBookingListItem } from "@/lib/partner/bookings-list";

type CreditPayload = {
  creditLimit: number;
  currentUsage: number;
  available: number;
  currency: string;
  totalCommissionsEarned?: number;
};

export function PartnerDashboardClient({ slug, displayName }: { slug: string; displayName: string }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [secretInput, setSecretInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [credit, setCredit] = useState<CreditPayload | null>(null);
  const [bookings, setBookings] = useState<PartnerBookingListItem[]>([]);
  const [loadError, setLoadError] = useState("");

  const refreshSession = useCallback(async () => {
    const res = await fetch(`/api/partner/session?slug=${encodeURIComponent(slug)}`);
    const data = (await res.json().catch(() => null)) as { authenticated?: boolean } | null;
    setAuthenticated(Boolean(data?.authenticated));
  }, [slug]);

  const loadData = useCallback(async () => {
    setLoadError("");
    try {
      const [cRes, bRes] = await Promise.all([
        fetch(`/api/partner/credit?slug=${encodeURIComponent(slug)}`),
        fetch(`/api/partner/bookings?slug=${encodeURIComponent(slug)}`),
      ]);
      if (cRes.status === 401 || bRes.status === 401) {
        setAuthenticated(false);
        return;
      }
      const cJson = (await cRes.json().catch(() => null)) as { success?: boolean; credit?: CreditPayload } | null;
      const bJson = (await bRes.json().catch(() => null)) as { success?: boolean; data?: PartnerBookingListItem[] } | null;
      const errs: string[] = [];
      if (cJson?.success && cJson.credit) setCredit(cJson.credit);
      else errs.push("Could not load credit.");
      if (bJson?.success && Array.isArray(bJson.data)) setBookings(bJson.data);
      else errs.push("Could not load bookings.");
      setLoadError(errs.length ? errs.join(" ") : "");
    } catch {
      setLoadError("Could not load dashboard.");
    }
  }, [slug]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (authenticated === true) void loadData();
  }, [authenticated, loadData]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/partner/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, secret: secretInput }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      setAuthError(data?.message || "Access denied.");
      return;
    }
    setSecretInput("");
    await refreshSession();
  }

  if (authenticated === null) {
    return <p className="text-sm text-neutral-500">Checking access…</p>;
  }

  if (!authenticated) {
    return (
      <form onSubmit={login} className="mx-auto max-w-md space-y-6 border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-black">Partner access</h2>
        <p className="text-sm text-neutral-600">
          Enter the access key for <strong>{displayName}</strong>.
        </p>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">Access key</span>
          <input
            type="password"
            autoComplete="current-password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            className="min-h-[44px] w-full border border-neutral-300 px-3 text-black outline-none focus:border-black"
            required
          />
        </label>
        {authError ? <p className="text-sm text-red-600">{authError}</p> : null}
        <button type="submit" className="w-full min-h-[48px] bg-black text-sm font-semibold text-white">
          Continue
        </button>
      </form>
    );
  }

  const pct = credit && credit.creditLimit > 0 ? Math.min(100, (credit.currentUsage / credit.creditLimit) * 100) : 0;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Concierge account</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">{displayName}</h2>
        </div>
        <Link
          href={`/partner/${slug}/book/`}
          className="min-h-[44px] border border-black px-4 text-sm font-medium leading-[44px] text-black"
        >
          New booking
        </Link>
      </div>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      {credit ? (
        <section className="border border-neutral-200 bg-neutral-50 p-6">
          <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Available credit</h3>
          <p className="mt-4 text-3xl font-light tabular-nums text-black">
            {formatMoneyAmount(credit.available, credit.currency, "en")}
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Used {formatMoneyAmount(credit.currentUsage, credit.currency, "en")} of{" "}
            {formatMoneyAmount(credit.creditLimit, credit.currency, "en")}
          </p>
          <div className="mt-6 h-2 w-full overflow-hidden bg-neutral-200">
            <div className="h-full bg-black transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          {credit.totalCommissionsEarned != null ? (
            <p className="mt-6 text-sm text-neutral-600">
              <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                Total commissions earned
              </span>
              <span className="mt-1 block text-2xl font-light tabular-nums text-black">
                {formatMoneyAmount(credit.totalCommissionsEarned, credit.currency, "en")}
              </span>
            </p>
          ) : null}
        </section>
      ) : null}

      <section>
        <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">Booking history</h3>
        {bookings.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">No bookings matched your account yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-neutral-200 border border-neutral-200">
            {bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-4">
                <div>
                  <p className="font-medium tabular-nums text-black">{b.orderNumber || b.id}</p>
                  <p className="text-xs text-neutral-500">{b.pickupDate || "—"}</p>
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-600">{b.status || "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

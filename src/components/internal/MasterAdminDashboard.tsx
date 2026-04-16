"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PartnerPricingModel = "MARKUP" | "NET_PRICE";

type PartnerRow = {
  slug: string;
  displayName: string;
  creditLimit: number;
  currentUsage: number;
  available: number;
  commissionRate: number;
  pricingModel: PartnerPricingModel;
  totalCommissionsEarned: number;
};

export function MasterAdminDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<PartnerRow[] | null>(null);
  const [error, setError] = useState("");
  const [creditEdits, setCreditEdits] = useState<Record<string, string>>({});
  const [commissionEdits, setCommissionEdits] = useState<Record<string, string>>({});
  const [pricingEdits, setPricingEdits] = useState<Record<string, PartnerPricingModel>>({});
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/internal/admin/partners");
    if (res.status === 401) {
      router.replace("/internal/admin/login");
      return;
    }
    const data = (await res.json().catch(() => null)) as { ok?: boolean; data?: PartnerRow[] } | null;
    if (!res.ok || !data?.ok || !Array.isArray(data.data)) {
      setError("Could not load partners.");
      return;
    }
    setRows(data.data);
    const nextCredit: Record<string, string> = {};
    const nextCommission: Record<string, string> = {};
    const nextPricing: Record<string, PartnerPricingModel> = {};
    for (const p of data.data) {
      nextCredit[p.slug] = String(p.creditLimit);
      nextCommission[p.slug] = String(p.commissionRate ?? 0);
      nextPricing[p.slug] = p.pricingModel === "NET_PRICE" ? "NET_PRICE" : "MARKUP";
    }
    setCreditEdits(nextCredit);
    setCommissionEdits(nextCommission);
    setPricingEdits(nextPricing);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    await fetch("/api/internal/admin/logout", { method: "POST" });
    router.replace("/internal/admin/login");
    router.refresh();
  }

  async function savePartner(e: FormEvent, slug: string) {
    e.preventDefault();
    const rawCredit = creditEdits[slug]?.trim() ?? "";
    const creditLimit = Number(rawCredit);
    if (!Number.isFinite(creditLimit) || creditLimit < 0) {
      setError("Credit limit must be a non-negative number.");
      return;
    }
    const rawPct = commissionEdits[slug]?.trim() ?? "";
    const commissionRate = Number(rawPct);
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      setError("Commission must be between 0 and 100.");
      return;
    }
    const pricingModel = pricingEdits[slug] ?? "MARKUP";

    setBusySlug(slug);
    setError("");
    try {
      const res = await fetch(`/api/internal/admin/partners/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditLimit, commissionRate, pricingModel }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data && "message" in data && typeof data.message === "string" ? data.message : "Update failed.");
        return;
      }
      await load();
    } finally {
      setBusySlug(null);
    }
  }

  async function resetUsage(slug: string) {
    setBusySlug(slug);
    setError("");
    try {
      const res = await fetch(`/api/internal/admin/partners/${encodeURIComponent(slug)}/reset-usage`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data && "message" in data && typeof data.message === "string" ? data.message : "Reset failed.");
        return;
      }
      await load();
    } finally {
      setBusySlug(null);
    }
  }

  if (rows === null) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Way2Go</p>
          <h1 className="mt-2 text-2xl font-light tracking-tight text-white">Partner terms</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Credit limits (EUR), commission %, pricing model (MARKUP vs NET_PRICE), and account settlement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-[40px] border border-neutral-600 px-4 text-xs font-medium uppercase tracking-wider text-neutral-200"
        >
          Sign out
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <ul className="space-y-6">
        {rows.map((p) => {
          const pct = p.creditLimit > 0 ? Math.min(100, (p.currentUsage / p.creditLimit) * 100) : 0;
          return (
            <li key={p.slug} className="border border-neutral-800 bg-neutral-900/30 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-lg font-medium text-white">{p.displayName}</p>
                  <p className="text-xs text-neutral-500">{p.slug}</p>
                </div>
                <p className="text-sm tabular-nums text-neutral-300">
                  Used €{p.currentUsage.toFixed(2)} / €{p.creditLimit.toFixed(2)}
                </p>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden bg-neutral-800">
                <div className="h-full bg-white transition-[width]" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Available €{p.available.toFixed(2)}
                <span className="text-neutral-600"> · </span>
                Commissions accrued €{(p.totalCommissionsEarned ?? 0).toFixed(2)}
              </p>

              <form onSubmit={(e) => void savePartner(e, p.slug)} className="mt-6 space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Credit limit (EUR)
                    </span>
                    <input
                      value={creditEdits[p.slug] ?? ""}
                      onChange={(e) => setCreditEdits((s) => ({ ...s, [p.slug]: e.target.value }))}
                      className="min-h-[44px] w-36 border border-neutral-700 bg-neutral-950 px-3 tabular-nums text-white outline-none focus:border-white"
                      inputMode="decimal"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Commission (%)
                    </span>
                    <input
                      value={commissionEdits[p.slug] ?? ""}
                      onChange={(e) => setCommissionEdits((s) => ({ ...s, [p.slug]: e.target.value }))}
                      className="min-h-[44px] w-28 border border-neutral-700 bg-neutral-950 px-3 tabular-nums text-white outline-none focus:border-white"
                      inputMode="decimal"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Pricing model
                    </span>
                    <select
                      value={pricingEdits[p.slug] ?? "MARKUP"}
                      onChange={(e) =>
                        setPricingEdits((s) => ({
                          ...s,
                          [p.slug]: e.target.value === "NET_PRICE" ? "NET_PRICE" : "MARKUP",
                        }))
                      }
                      className="min-h-[44px] border border-neutral-700 bg-neutral-950 px-3 text-sm text-white outline-none focus:border-white"
                    >
                      <option value="MARKUP">MARKUP (guest pays CRM × (1 + rate))</option>
                      <option value="NET_PRICE">NET_PRICE (guest pays CRM; net settlement)</option>
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={busySlug === p.slug}
                    className="min-h-[44px] bg-white px-4 text-xs font-semibold uppercase tracking-wider text-black disabled:opacity-50"
                  >
                    Save terms
                  </button>
                  <button
                    type="button"
                    disabled={busySlug === p.slug}
                    onClick={() => void resetUsage(p.slug)}
                    className="min-h-[44px] border border-neutral-600 px-4 text-xs font-medium uppercase tracking-wider text-neutral-200 disabled:opacity-50"
                  >
                    Mark account paid
                  </button>
                </div>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RecentBooking = {
  id: string;
  orderNumber?: string;
  status?: string;
  pickupDate?: string;
  price?: string;
  currency?: string;
  crmUrl: string | null;
};

type PartnerFinanceRow = {
  slug: string;
  displayName: string;
  partnerKind: string;
  creditLimit: number;
  currentUsage: number;
  available: number;
  pctUsed: number;
  alert: boolean;
  commissionRate: number;
  pricingModel: "MARKUP" | "NET_PRICE";
  totalCommissionsEarned: number;
  recentBookings: RecentBooking[];
};

type FinancePayload = {
  ok: boolean;
  summary?: { totalOutstandingEur: number; partnerCount: number; currency: string };
  partners?: PartnerFinanceRow[];
};

function eur(n: number) {
  return `€${n.toFixed(2)}`;
}

export function MasterFinanceDashboard() {
  const router = useRouter();
  const [payload, setPayload] = useState<FinancePayload | null>(null);
  const [error, setError] = useState("");
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState("");
  const [editCommission, setEditCommission] = useState("");
  const [editModel, setEditModel] = useState<"MARKUP" | "NET_PRICE">("MARKUP");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/master-admin/finance");
    if (res.status === 401) {
      router.replace("/master-admin/login/");
      return;
    }
    const data = (await res.json().catch(() => null)) as FinancePayload | null;
    if (!res.ok || !data?.ok || !data.summary || !Array.isArray(data.partners)) {
      setError("Could not load finance data.");
      setPayload(null);
      return;
    }
    setPayload(data);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    await fetch("/api/internal/admin/logout", { method: "POST" });
    router.replace("/master-admin/login/");
    router.refresh();
  }

  function openEdit(p: PartnerFinanceRow) {
    setEditSlug(p.slug);
    setEditLimit(String(p.creditLimit));
    setEditCommission(String(p.commissionRate));
    setEditModel(p.pricingModel);
  }

  function closeEdit() {
    setEditSlug(null);
    setEditLimit("");
    setEditCommission("");
    setEditModel("MARKUP");
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editSlug) return;
    const limitN = Number(editLimit.trim());
    const commN = Number(editCommission.trim());
    if (!Number.isFinite(limitN) || limitN < 0) {
      setError("Credit limit must be a non-negative number.");
      return;
    }
    if (!Number.isFinite(commN) || commN < 0 || commN > 100) {
      setError("Commission rate must be between 0 and 100.");
      return;
    }
    setBusySlug(editSlug);
    setError("");
    try {
      const res = await fetch(`/api/internal/admin/partners/${encodeURIComponent(editSlug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditLimit: limitN,
          commissionRate: commN,
          pricingModel: editModel,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(typeof data?.message === "string" ? data.message : "Update failed.");
        return;
      }
      closeEdit();
      await load();
    } finally {
      setBusySlug(null);
    }
  }

  async function settleBalance(slug: string) {
    if (!window.confirm("Clear on-account usage for this partner? Use after invoice is paid.")) return;
    setBusySlug(slug);
    setError("");
    try {
      const res = await fetch(`/api/internal/admin/partners/${encodeURIComponent(slug)}/reset-usage`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(typeof data?.message === "string" ? data.message : "Reset failed.");
        return;
      }
      await load();
    } finally {
      setBusySlug(null);
    }
  }

  if (payload === null && !error) {
    return <p className="font-mono text-xs text-neutral-500">Loading finance data…</p>;
  }

  if (!payload?.summary || !payload.partners) {
    return (
      <div className="space-y-4">
        {error ? <p className="font-mono text-xs text-red-400">{error}</p> : null}
        <button
          type="button"
          onClick={() => void load()}
          className="font-mono text-xs uppercase tracking-wider text-neutral-400 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, partners } = payload;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-neutral-600">Way2Go owner</p>
          <h1 className="mt-2 font-mono text-2xl font-medium tracking-tight text-white">Partner finance</h1>
          <p className="mt-1 font-mono text-xs text-neutral-500">Credit lines · on-account usage · TransferCRM links</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-[40px] border border-neutral-700 px-4 font-mono text-[10px] uppercase tracking-wider text-neutral-300"
        >
          Sign out
        </button>
      </header>

      {error ? <p className="font-mono text-xs text-red-400">{error}</p> : null}

      <section className="grid gap-4 border border-neutral-800 bg-neutral-950/50 p-5 md:grid-cols-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">Total outstanding</p>
          <p className="mt-2 font-mono text-2xl tabular-nums text-white">{eur(summary.totalOutstandingEur)}</p>
          <p className="mt-1 font-mono text-[10px] text-neutral-600">{summary.currency} · pending collection</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">Partners</p>
          <p className="mt-2 font-mono text-2xl tabular-nums text-white">{summary.partnerCount}</p>
          <p className="mt-1 font-mono text-[10px] text-neutral-600">Active B2B accounts</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">Credit model</p>
          <p className="mt-2 font-mono text-sm text-neutral-300">Usage increases on pay-on-account bookings; settle after invoice.</p>
        </div>
      </section>

      <div className="overflow-x-auto border border-neutral-800">
        <table className="w-full min-w-[1180px] border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-950 text-[10px] uppercase tracking-wider text-neutral-500">
              <th className="px-3 py-3 font-medium">Partner</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium tabular-nums">Credit limit</th>
              <th className="px-3 py-3 font-medium tabular-nums">Current balance</th>
              <th className="px-3 py-3 font-medium">Pricing</th>
              <th className="px-3 py-3 font-medium tabular-nums">Rate</th>
              <th className="px-3 py-3 font-medium tabular-nums">Comm. earned</th>
              <th className="px-3 py-3 font-medium">Usage</th>
              <th className="px-3 py-3 font-medium">On-account in CRM</th>
              <th className="px-3 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr
                key={p.slug}
                className={`border-b border-neutral-800/80 ${
                  p.alert ? "bg-red-950/40 text-red-100" : "bg-transparent text-neutral-200"
                }`}
              >
                <td className="px-3 py-3 align-top">
                  <span className="block text-sm text-white">{p.displayName}</span>
                  <span className="text-[10px] text-neutral-500">{p.slug}</span>
                  {p.alert ? (
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-red-400">
                      Above 90% limit
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 align-top text-neutral-400">{p.partnerKind}</td>
                <td className="px-3 py-3 align-top tabular-nums text-neutral-200">{eur(p.creditLimit)}</td>
                <td className="px-3 py-3 align-top tabular-nums text-white">{eur(p.currentUsage)}</td>
                <td className="px-3 py-3 align-top text-neutral-400">{p.pricingModel}</td>
                <td className="px-3 py-3 align-top tabular-nums text-neutral-300">{p.commissionRate.toFixed(1)}%</td>
                <td className="px-3 py-3 align-top tabular-nums text-neutral-300">{eur(p.totalCommissionsEarned)}</td>
                <td className="px-3 py-3 align-top">
                  <div className={`h-1.5 w-full max-w-[120px] overflow-hidden ${p.alert ? "bg-red-900/60" : "bg-neutral-800"}`}>
                    <div
                      className={`h-full ${p.alert ? "bg-red-500" : "bg-white"}`}
                      style={{ width: `${p.pctUsed}%` }}
                    />
                  </div>
                  <span className="mt-1 block tabular-nums text-[10px] text-neutral-500">{p.pctUsed.toFixed(1)}%</span>
                </td>
                <td className="max-w-[280px] px-3 py-3 align-top">
                  {p.recentBookings.length === 0 ? (
                    <span className="text-neutral-600">—</span>
                  ) : (
                    <ul className="space-y-1.5">
                      {p.recentBookings.map((b) => (
                        <li key={b.id} className="leading-snug">
                          {b.crmUrl ? (
                            <a
                              href={b.crmUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`underline underline-offset-2 ${p.alert ? "text-red-200" : "text-neutral-300"}`}
                            >
                              {b.orderNumber || b.id}
                            </a>
                          ) : (
                            <span className="text-neutral-500" title="Set TRANSFERCRM_BOOKING_URL_TEMPLATE">
                              {b.orderNumber || b.id}
                            </span>
                          )}
                          <span className="text-neutral-600"> · {b.status || "—"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={busySlug === p.slug}
                      onClick={() => openEdit(p)}
                      className="min-h-[36px] border border-neutral-600 px-2 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-200 disabled:opacity-50"
                    >
                      Edit terms
                    </button>
                    <button
                      type="button"
                      disabled={busySlug === p.slug}
                      onClick={() => void settleBalance(p.slug)}
                      className="min-h-[36px] border border-neutral-600 px-2 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-200 disabled:opacity-50"
                    >
                      Clear balance
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-[10px] text-neutral-600">
        CRM links use <code className="text-neutral-400">TRANSFERCRM_BOOKING_URL_TEMPLATE</code> (placeholders{" "}
        <code className="text-neutral-400">{"{id}"}</code>) when the default URL guess is wrong.
      </p>

      {editSlug ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <form
            onSubmit={saveEdit}
            className="w-full max-w-sm border border-neutral-700 bg-neutral-950 p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-limit-title"
          >
            <h2 id="edit-limit-title" className="font-mono text-sm font-medium text-white">
              Partner commercial terms
            </h2>
            <p className="mt-1 font-mono text-[10px] text-neutral-500">{editSlug}</p>
            <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-neutral-500">
              Credit limit (EUR)
              <input
                value={editLimit}
                onChange={(e) => setEditLimit(e.target.value)}
                className="mt-2 min-h-[44px] w-full border border-neutral-700 bg-black px-3 tabular-nums text-sm text-white outline-none focus:border-neutral-400"
                inputMode="decimal"
                autoFocus
              />
            </label>
            <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-neutral-500">
              Commission rate (%)
              <input
                value={editCommission}
                onChange={(e) => setEditCommission(e.target.value)}
                className="mt-2 min-h-[44px] w-full border border-neutral-700 bg-black px-3 tabular-nums text-sm text-white outline-none focus:border-neutral-400"
                inputMode="decimal"
              />
            </label>
            <fieldset className="mt-4 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
              <legend className="mb-2">Pricing model</legend>
              <label className="mr-4 inline-flex items-center gap-2 normal-case text-neutral-300">
                <input
                  type="radio"
                  name="pricingModel"
                  checked={editModel === "MARKUP"}
                  onChange={() => setEditModel("MARKUP")}
                  className="accent-white"
                />
                Markup (retail = CRM × (1 + rate))
              </label>
              <label className="inline-flex items-center gap-2 normal-case text-neutral-300">
                <input
                  type="radio"
                  name="pricingModel"
                  checked={editModel === "NET_PRICE"}
                  onChange={() => setEditModel("NET_PRICE")}
                  className="accent-white"
                />
                Net price (retail = CRM)
              </label>
            </fieldset>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="min-h-[44px] flex-1 border border-neutral-700 font-mono text-[10px] uppercase tracking-wider text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busySlug === editSlug}
                className="min-h-[44px] flex-1 bg-white font-mono text-[10px] font-semibold uppercase tracking-wider text-black disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

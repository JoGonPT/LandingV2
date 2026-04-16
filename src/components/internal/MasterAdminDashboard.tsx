"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PartnerRow = {
  slug: string;
  displayName: string;
  creditLimit: number;
  currentUsage: number;
  available: number;
};

export function MasterAdminDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<PartnerRow[] | null>(null);
  const [error, setError] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
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
    const nextEdits: Record<string, string> = {};
    for (const p of data.data) {
      nextEdits[p.slug] = String(p.creditLimit);
    }
    setEdits(nextEdits);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    await fetch("/api/internal/admin/logout", { method: "POST" });
    router.replace("/internal/admin/login");
    router.refresh();
  }

  async function saveLimit(e: FormEvent, slug: string) {
    e.preventDefault();
    const raw = edits[slug]?.trim() ?? "";
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      setError("Credit limit must be a non-negative number.");
      return;
    }
    setBusySlug(slug);
    setError("");
    try {
      const res = await fetch(`/api/internal/admin/partners/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditLimit: n }),
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
          <h1 className="mt-2 text-2xl font-light tracking-tight text-white">Partner credit</h1>
          <p className="mt-1 text-sm text-neutral-400">Adjust limits and settle accounts (EUR).</p>
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
              <p className="mt-2 text-xs text-neutral-500">Available €{p.available.toFixed(2)}</p>

              <form onSubmit={(e) => void saveLimit(e, p.slug)} className="mt-6 flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">Credit limit (EUR)</span>
                  <input
                    value={edits[p.slug] ?? ""}
                    onChange={(e) => setEdits((s) => ({ ...s, [p.slug]: e.target.value }))}
                    className="min-h-[44px] w-40 border border-neutral-700 bg-neutral-950 px-3 tabular-nums text-white outline-none focus:border-white"
                    inputMode="decimal"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busySlug === p.slug}
                  className="min-h-[44px] bg-white px-4 text-xs font-semibold uppercase tracking-wider text-black disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={busySlug === p.slug}
                  onClick={() => void resetUsage(p.slug)}
                  className="min-h-[44px] border border-neutral-600 px-4 text-xs font-medium uppercase tracking-wider text-neutral-200 disabled:opacity-50"
                >
                  Mark account paid
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

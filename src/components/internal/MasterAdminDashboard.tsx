"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PartnerPricingModel = "MARKUP" | "NET_PRICE";

type PartnerRow = {
  id?: number;
  slug: string;
  displayName: string;
  name?: string;
  token?: string;
  isActive?: boolean;
  commissionPercentage?: number;
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
  const [success, setSuccess] = useState("");
  const [creditEdits, setCreditEdits] = useState<Record<string, string>>({});
  const [commissionEdits, setCommissionEdits] = useState<Record<string, string>>({});
  const [pricingEdits, setPricingEdits] = useState<Record<string, PartnerPricingModel>>({});
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({});
  const [tokenEdits, setTokenEdits] = useState<Record<string, string>>({});
  const [activeEdits, setActiveEdits] = useState<Record<string, boolean>>({});
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    slug: "",
    name: "",
    token: "",
    commissionPercentage: "0",
    isActive: true,
  });

  const load = useCallback(async () => {
    setError("");
    setSuccess("");
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
    const nextName: Record<string, string> = {};
    const nextToken: Record<string, string> = {};
    const nextActive: Record<string, boolean> = {};
    for (const p of data.data) {
      nextCredit[p.slug] = String(p.creditLimit);
      nextCommission[p.slug] = String(p.commissionRate ?? 0);
      nextPricing[p.slug] = p.pricingModel === "NET_PRICE" ? "NET_PRICE" : "MARKUP";
      nextName[p.slug] = p.name ?? p.displayName;
      nextToken[p.slug] = p.token ?? "";
      nextActive[p.slug] = p.isActive ?? true;
    }
    setCreditEdits(nextCredit);
    setCommissionEdits(nextCommission);
    setPricingEdits(nextPricing);
    setNameEdits(nextName);
    setTokenEdits(nextToken);
    setActiveEdits(nextActive);
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
    const name = (nameEdits[slug] ?? "").trim();
    const token = (tokenEdits[slug] ?? "").trim();
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
    if (!name) {
      setError("Name is required.");
      return;
    }
    if (!token) {
      setError("Token is required.");
      return;
    }
    const pricingModel = pricingEdits[slug] ?? "MARKUP";
    const isActive = activeEdits[slug] ?? true;

    setBusySlug(slug);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/internal/admin/partners/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          token,
          isActive,
          commissionPercentage: commissionRate,
          creditLimit,
          commissionRate,
          pricingModel,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data && "message" in data && typeof data.message === "string" ? data.message : "Update failed.");
        return;
      }
      setSuccess(`Partner "${slug}" updated successfully.`);
      setEditSlug(null);
      await load();
    } finally {
      setBusySlug(null);
    }
  }

  async function resetUsage(slug: string) {
    setBusySlug(slug);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/internal/admin/partners/${encodeURIComponent(slug)}/reset-usage`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data && "message" in data && typeof data.message === "string" ? data.message : "Reset failed.");
        return;
      }
      setSuccess(`Usage reset for "${slug}".`);
      await load();
    } finally {
      setBusySlug(null);
    }
  }

  function generateToken(): string {
    const random = Math.random().toString(36).slice(2, 10);
    const stamp = Date.now().toString(36).slice(-6);
    return `w2g_${random}${stamp}`;
  }

  async function createPartner(e: FormEvent) {
    e.preventDefault();
    const slug = createForm.slug.trim();
    const name = createForm.name.trim();
    const token = createForm.token.trim();
    const commission = Number(createForm.commissionPercentage);
    if (!slug || !name || !token) {
      setError("Slug, name and token are required.");
      return;
    }
    if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
      setError("Commission must be between 0 and 100.");
      return;
    }
    setBusySlug("__create__");
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/internal/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name,
          token,
          commissionPercentage: commission,
          isActive: createForm.isActive,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data && typeof data.message === "string" ? data.message : "Could not create partner.");
        return;
      }
      setCreateForm({
        slug: "",
        name: "",
        token: generateToken(),
        commissionPercentage: "0",
        isActive: true,
      });
      setShowNewModal(false);
      setSuccess(`Partner "${slug}" created successfully.`);
      await load();
    } finally {
      setBusySlug(null);
    }
  }

  function openCreateModal() {
    setError("");
    setSuccess("");
    setCreateForm({
      slug: "",
      name: "",
      token: generateToken(),
      commissionPercentage: "10",
      isActive: true,
    });
    setShowNewModal(true);
  }

  if (rows === null) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Way2Go</p>
          <h1 className="mt-2 text-2xl font-light tracking-tight text-white">Gestão de Parceiros</h1>
          <p className="mt-1 text-sm text-neutral-400">Gerir parceiros B2B, comissões, estado e credenciais de acesso.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-[40px] bg-white px-4 text-xs font-semibold uppercase tracking-wider text-black"
          >
            + Novo Parceiro
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="min-h-[40px] border border-neutral-600 px-4 text-xs font-medium uppercase tracking-wider text-neutral-200"
          >
            Sign out
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

      {rows.length === 0 ? (
        <div className="border border-neutral-800 bg-neutral-900/30 p-6 text-sm text-neutral-400">
          No partners found. Create your first partner above.
        </div>
      ) : null}

      <section className="overflow-hidden border border-neutral-800 bg-neutral-900/30">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-800 bg-neutral-950/50 text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Nome do Parceiro</th>
                <th className="px-4 py-3">Slug (URL)</th>
                <th className="px-4 py-3">Comissão (%)</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.slug} className="border-b border-neutral-800/70 text-neutral-200">
                  <td className="px-4 py-3">{nameEdits[p.slug] ?? p.name ?? p.displayName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-400">/partner/{p.slug}/book</td>
                  <td className="px-4 py-3 tabular-nums">{Number(commissionEdits[p.slug] ?? p.commissionRate).toFixed(2)}%</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
                        (activeEdits[p.slug] ?? p.isActive ?? true)
                          ? "bg-emerald-900/30 text-emerald-300"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {(activeEdits[p.slug] ?? p.isActive ?? true) ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditSlug(p.slug);
                        setError("");
                        setSuccess("");
                      }}
                      className="min-h-[36px] border border-neutral-600 px-3 text-xs font-medium uppercase tracking-wider text-neutral-200"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showNewModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl border border-neutral-700 bg-neutral-950 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-200">Novo Parceiro</h2>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-xs uppercase tracking-wider text-neutral-400"
              >
                Fechar
              </button>
            </div>
            <form onSubmit={(e) => void createPartner(e)} className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">Nome</span>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                  className="min-h-[44px] w-full border border-neutral-700 bg-neutral-900 px-3 text-white outline-none focus:border-white"
                  placeholder="Hotel Mar Azul"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">Slug</span>
                <input
                  value={createForm.slug}
                  onChange={(e) => setCreateForm((s) => ({ ...s, slug: e.target.value }))}
                  className="min-h-[44px] w-full border border-neutral-700 bg-neutral-900 px-3 text-white outline-none focus:border-white"
                  placeholder="hotel-mar-azul"
                />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">Token</span>
                <div className="flex gap-2">
                  <input
                    value={createForm.token}
                    onChange={(e) => setCreateForm((s) => ({ ...s, token: e.target.value }))}
                    className="min-h-[44px] w-full border border-neutral-700 bg-neutral-900 px-3 text-white outline-none focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={() => setCreateForm((s) => ({ ...s, token: generateToken() }))}
                    className="min-h-[44px] border border-neutral-600 px-3 text-xs uppercase tracking-wider text-neutral-200"
                  >
                    Gerar
                  </button>
                </div>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Percentagem de Comissão
                </span>
                <input
                  value={createForm.commissionPercentage}
                  onChange={(e) => setCreateForm((s) => ({ ...s, commissionPercentage: e.target.value }))}
                  className="min-h-[44px] w-full border border-neutral-700 bg-neutral-900 px-3 text-white outline-none focus:border-white"
                  inputMode="decimal"
                  placeholder="10"
                />
              </label>
              <label className="inline-flex min-h-[44px] items-center gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm((s) => ({ ...s, isActive: e.target.checked }))}
                />
                Ativo
              </label>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="min-h-[44px] border border-neutral-600 px-4 text-xs uppercase tracking-wider text-neutral-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busySlug === "__create__"}
                  className="min-h-[44px] bg-white px-4 text-xs font-semibold uppercase tracking-wider text-black disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editSlug ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl border border-neutral-700 bg-neutral-950 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-200">
                Editar Parceiro — {editSlug}
              </h2>
              <button
                type="button"
                onClick={() => setEditSlug(null)}
                className="text-xs uppercase tracking-wider text-neutral-400"
              >
                Fechar
              </button>
            </div>
            <form onSubmit={(e) => void savePartner(e, editSlug)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">Nome</span>
                  <input
                    value={nameEdits[editSlug] ?? ""}
                    onChange={(e) => setNameEdits((s) => ({ ...s, [editSlug]: e.target.value }))}
                    className="min-h-[44px] w-full border border-neutral-700 bg-neutral-900 px-3 text-white outline-none focus:border-white"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">Slug</span>
                  <input
                    value={editSlug}
                    disabled
                    className="min-h-[44px] w-full border border-neutral-800 bg-neutral-900/60 px-3 text-neutral-400"
                  />
                </label>
                <label className="text-sm md:col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">Token</span>
                  <div className="flex gap-2">
                    <input
                      value={tokenEdits[editSlug] ?? ""}
                      onChange={(e) => setTokenEdits((s) => ({ ...s, [editSlug]: e.target.value }))}
                      className="min-h-[44px] w-full border border-neutral-700 bg-neutral-900 px-3 text-white outline-none focus:border-white"
                    />
                    <button
                      type="button"
                      onClick={() => setTokenEdits((s) => ({ ...s, [editSlug]: generateToken() }))}
                      className="min-h-[44px] border border-neutral-600 px-3 text-xs uppercase tracking-wider text-neutral-200"
                    >
                      Gerar
                    </button>
                  </div>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Comissão (%)
                  </span>
                  <input
                    value={commissionEdits[editSlug] ?? ""}
                    onChange={(e) => setCommissionEdits((s) => ({ ...s, [editSlug]: e.target.value }))}
                    className="min-h-[44px] w-full border border-neutral-700 bg-neutral-900 px-3 text-white outline-none focus:border-white"
                    inputMode="decimal"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Crédito (€)
                  </span>
                  <input
                    value={creditEdits[editSlug] ?? ""}
                    onChange={(e) => setCreditEdits((s) => ({ ...s, [editSlug]: e.target.value }))}
                    className="min-h-[44px] w-full border border-neutral-700 bg-neutral-900 px-3 text-white outline-none focus:border-white"
                    inputMode="decimal"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Pricing model
                  </span>
                  <select
                    value={pricingEdits[editSlug] ?? "MARKUP"}
                    onChange={(e) =>
                      setPricingEdits((s) => ({
                        ...s,
                        [editSlug]: e.target.value === "NET_PRICE" ? "NET_PRICE" : "MARKUP",
                      }))
                    }
                    className="min-h-[44px] w-full border border-neutral-700 bg-neutral-900 px-3 text-sm text-white outline-none focus:border-white"
                  >
                    <option value="MARKUP">MARKUP</option>
                    <option value="NET_PRICE">NET_PRICE</option>
                  </select>
                </label>
                <label className="inline-flex min-h-[44px] items-center gap-2 text-xs text-neutral-300">
                  <input
                    type="checkbox"
                    checked={activeEdits[editSlug] ?? true}
                    onChange={(e) => setActiveEdits((s) => ({ ...s, [editSlug]: e.target.checked }))}
                  />
                  Ativo
                </label>
              </div>
              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void resetUsage(editSlug)}
                  disabled={busySlug === editSlug}
                  className="min-h-[44px] border border-neutral-600 px-4 text-xs uppercase tracking-wider text-neutral-200 disabled:opacity-50"
                >
                  Marcar conta como paga
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditSlug(null)}
                    className="min-h-[44px] border border-neutral-600 px-4 text-xs uppercase tracking-wider text-neutral-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={busySlug === editSlug}
                    className="min-h-[44px] bg-white px-4 text-xs font-semibold uppercase tracking-wider text-black disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

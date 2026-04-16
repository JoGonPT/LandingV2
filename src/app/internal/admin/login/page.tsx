"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function MasterAdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/internal/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.message || "Could not sign in.");
        return;
      }
      router.replace("/internal/admin/");
      router.refresh();
    } catch {
      setError("Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Way2Go</p>
      <h1 className="mt-3 text-2xl font-light tracking-tight text-white">Master admin</h1>
      <p className="mt-2 text-sm text-neutral-400">Partner credit controls — authorized personnel only.</p>

      <form onSubmit={onSubmit} className="mt-10 space-y-6 border border-neutral-800 bg-neutral-900/40 p-6">
        <label className="block text-sm">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-500">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-[48px] w-full border border-neutral-700 bg-neutral-950 px-3 text-white outline-none focus:border-white"
            required
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[48px] bg-white text-sm font-semibold text-black disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Continue"}
        </button>
      </form>
    </main>
  );
}

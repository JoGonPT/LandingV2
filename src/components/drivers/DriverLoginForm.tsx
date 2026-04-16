"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { driverHomeHref } from "@/lib/drivers/client-paths";

export function DriverLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/drivers/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not sign in.");
        return;
      }
      router.push(driverHomeHref());
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-16 pt-8">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-white">Way2Go</h1>
      <p className="mb-10 text-lg text-neutral-400">Driver sign in</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <label className="flex flex-col gap-2 text-sm text-neutral-300">
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="min-h-14 rounded-xl border border-neutral-700 bg-neutral-950 px-4 text-lg text-white outline-none ring-white focus:border-white focus:ring-1"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-neutral-300">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="min-h-14 rounded-xl border border-neutral-700 bg-neutral-950 px-4 text-lg text-white outline-none ring-white focus:border-white focus:ring-1"
            required
          />
        </label>
        {error ? <p className="text-base text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="min-h-16 rounded-2xl bg-white text-lg font-semibold text-black disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

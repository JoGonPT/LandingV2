"use client";

import { FormEvent, useState } from "react";

/**
 * Ecrã de "Em breve", com entrada de administração.
 *
 * O botão só revela o campo de password depois de clicado: um formulário
 * sempre visível convida a tentativas de quem passe por aqui.
 */
export function ComingSoonScreen() {
    const [aberto, setAberto] = useState(false);
    const [password, setPassword] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const [aEnviar, setAEnviar] = useState(false);

    async function entrar(event: FormEvent) {
        event.preventDefault();
        if (aEnviar) return;

        setAEnviar(true);
        setErro(null);

        try {
            const res = await fetch("/api/preview/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                // Recarrega na raiz: o middleware passa a deixar ver o site.
                window.location.href = "/";
                return;
            }

            const data = (await res.json().catch(() => ({}))) as { message?: string };
            setErro(data.message ?? "Não foi possível entrar.");
        } catch {
            setErro("Falha de ligação. Tente novamente.");
        } finally {
            setAEnviar(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-white px-6 py-24 text-black">
            <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-black">
                    <span className="text-2xl font-bold text-white">W</span>
                </div>

                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                    Way2Go
                </p>

                <h1 className="mb-5 text-3xl font-bold tracking-tight sm:text-4xl">Em breve</h1>

                <p className="mb-12 leading-relaxed text-neutral-600">
                    Estamos a preparar a nova plataforma de transfers privados.
                    <br className="hidden sm:block" /> Para já, fale connosco diretamente.
                </p>

                <div className="mb-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <a
                        href="https://wa.me/351913281953"
                        className="w-full rounded-lg bg-black px-6 py-3 font-semibold text-white transition-colors hover:bg-neutral-800 sm:w-auto"
                    >
                        WhatsApp
                    </a>
                    <a
                        href="mailto:reservas@vruum.pt"
                        className="w-full rounded-lg border border-neutral-200 px-6 py-3 font-semibold text-black transition-colors hover:bg-neutral-50 sm:w-auto"
                    >
                        reservas@way2go.pt
                    </a>
                </div>

                <div className="border-t border-neutral-100 pt-8">
                    {!aberto ? (
                        <button
                            type="button"
                            onClick={() => setAberto(true)}
                            className="text-sm font-medium text-neutral-400 underline underline-offset-4 transition-colors hover:text-black"
                        >
                            Entrar como admin
                        </button>
                    ) : (
                        <form onSubmit={entrar} className="mx-auto flex max-w-xs flex-col gap-3">
                            <label
                                htmlFor="preview-password"
                                className="text-left text-xs font-medium uppercase tracking-wider text-neutral-500"
                            >
                                Password
                            </label>
                            <input
                                id="preview-password"
                                type="password"
                                autoFocus
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="min-h-[44px] w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none transition-colors focus:border-black"
                            />

                            {erro && (
                                <p role="alert" className="text-left text-sm text-red-600">
                                    {erro}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={aEnviar || password.length === 0}
                                className="min-h-[44px] rounded-lg bg-black px-6 font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
                            >
                                {aEnviar ? "A entrar…" : "Entrar"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}

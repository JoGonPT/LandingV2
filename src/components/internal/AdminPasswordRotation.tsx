"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

/**
 * Trocar a password de administração.
 *
 * A password é gerada no servidor e mostrada **uma só vez**. Depois de gravada
 * só existe como hash `scrypt`: não há forma de a recuperar, nem por aqui nem
 * pela base de dados. Por isso o ecrã insiste em que seja guardada antes de
 * confirmar.
 *
 * Tal como nos interruptores, é preciso escrever a frase à mão. Aqui há uma
 * razão adicional: quem troca a password sem a guardar tranca-se fora do painel.
 */
export function AdminPasswordRotation() {
    const [password, setPassword] = useState("");
    const [confirmacao, setConfirmacao] = useState("");
    const [frase, setFrase] = useState("");
    const [operador, setOperador] = useState("");
    const [guardei, setGuardei] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [feito, setFeito] = useState(false);
    const [aGravar, setAGravar] = useState(false);

    const gerar = useCallback(async () => {
        setErro(null);
        try {
            const res = await fetch("/api/master-admin/settings/password", { cache: "no-store" });
            if (res.status === 401) {
                window.location.href = "/master-admin/login/";
                return;
            }
            const data = (await res.json()) as { ok: boolean; password?: string; confirmation?: string };
            if (!data.ok || !data.password) {
                setErro("Não foi possível gerar uma password.");
                return;
            }
            setPassword(data.password);
            setConfirmacao(data.confirmation ?? "");
            setGuardei(false);
        } catch {
            setErro("Falha de ligação ao servidor.");
        }
    }, []);

    useEffect(() => {
        void gerar();
    }, [gerar]);

    async function gravar(event: FormEvent) {
        event.preventDefault();
        if (aGravar) return;
        setAGravar(true);
        setErro(null);
        try {
            const res = await fetch("/api/master-admin/settings/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, confirmationTyped: frase, actorLabel: operador }),
            });
            const data = (await res.json()) as { ok: boolean; message?: string };
            if (!data.ok) {
                setErro(data.message ?? "Não foi possível guardar a password.");
                return;
            }
            setFeito(true);
        } catch {
            setErro("Falha de ligação ao servidor.");
        } finally {
            setAGravar(false);
        }
    }

    if (feito) {
        return (
            <div className="rounded-xl border-2 border-black bg-white p-6">
                <h1 className="text-xl font-bold text-black">Password trocada</h1>
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                    A partir de agora é esta a password de entrada. A variável de ambiente deixou de
                    servir. Se a perdeu, a única saída é apagar a linha corrente da tabela{" "}
                    <code className="font-mono text-xs">admin_credentials</code> no Supabase, o que faz
                    o login voltar a aceitar a variável de ambiente.
                </p>
                <Link
                    href="/master-admin/settings/"
                    className="mt-4 inline-block rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white"
                >
                    Voltar ao painel
                </Link>
            </div>
        );
    }

    const fraseCerta = frase.trim().replace(/\s+/g, " ") === confirmacao;

    return (
        <form onSubmit={gravar} className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold tracking-tight text-black">Password de administração</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
                    Gerada aqui e mostrada uma só vez. Depois de guardada só existe como hash — nem
                    este painel nem a base de dados a conseguem mostrar outra vez.
                </p>
            </header>

            {erro ? (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {erro}
                </p>
            ) : null}

            <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Password nova
                </p>
                <p className="mt-2 break-all font-mono text-lg font-semibold tracking-tight text-black">
                    {password || "…"}
                </p>
                <button
                    type="button"
                    onClick={gerar}
                    className="mt-3 text-sm font-medium text-neutral-500 underline underline-offset-4 hover:text-black"
                >
                    Gerar outra
                </button>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                <input
                    type="checkbox"
                    checked={guardei}
                    onChange={(e) => setGuardei(e.target.checked)}
                    className="mt-0.5 h-5 w-5 flex-shrink-0"
                />
                <span className="text-sm leading-relaxed text-neutral-700">
                    Guardei esta password num sítio seguro. Percebo que <strong>não há forma de a
                    recuperar</strong> e que sem ela não consigo voltar a entrar.
                </span>
            </label>

            <div className="rounded-xl border-2 border-black bg-neutral-50 p-4">
                <label
                    htmlFor="frase"
                    className="block text-xs font-medium uppercase tracking-wider text-neutral-500"
                >
                    Escreva para confirmar (não é possível colar)
                </label>
                <p className="mt-1 select-none font-mono text-sm font-bold tracking-wide text-black">
                    {confirmacao}
                </p>
                <input
                    id="frase"
                    value={frase}
                    onChange={(e) => setFrase(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    autoComplete="off"
                    spellCheck={false}
                    className="mt-2 min-h-[44px] w-full rounded-lg border border-neutral-300 px-3 font-mono text-sm outline-none focus:border-black"
                />

                <label
                    htmlFor="operador"
                    className="mt-4 block text-xs font-medium uppercase tracking-wider text-neutral-500"
                >
                    Quem está a fazer isto
                </label>
                <input
                    id="operador"
                    value={operador}
                    onChange={(e) => setOperador(e.target.value)}
                    placeholder="nome ou iniciais"
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-black"
                />
            </div>

            <button
                type="submit"
                disabled={aGravar || !guardei || !fraseCerta || !password}
                className="min-h-[48px] w-full rounded-lg bg-black px-6 font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-30 sm:w-auto"
            >
                {aGravar ? "A gravar…" : "Trocar a password"}
            </button>
        </form>
    );
}

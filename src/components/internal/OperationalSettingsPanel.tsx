"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

/**
 * Painel de controlo operacional.
 *
 * Duas ideias governam este ecrã:
 *
 * 1. **Nada muda com um clique.** Escolher um estado abre uma caixa que exige a
 *    frase escrita à mão, e o colar está bloqueado. A frase diz o que vai
 *    acontecer, de propósito — o mecanismo é obrigar a ler, e uma frase genérica
 *    seria executada de cor à terceira vez.
 * 2. **Diz-se sempre de onde vem cada valor.** Base de dados, variável de
 *    ambiente ou omissão. Foi essa ambiguidade que custou horas de diagnóstico
 *    quando um interruptor parecia desligado e o site continuava a cobrar.
 */

interface Option {
    value: string;
    label: string;
    consequence: string;
    confirmation: string | null;
}

interface Setting {
    key: string;
    label: string;
    description: string;
    critical: boolean;
    envVar: string;
    value: string;
    source: "database" | "environment" | "default";
    databaseValue: string | null;
    environmentValue: string | null;
    options: Option[];
}

interface AuditEntry {
    key: string;
    old_value: string | null;
    new_value: string;
    actor_label: string | null;
    created_at: string;
}

interface Snapshot {
    ok: true;
    degraded: boolean;
    degradedReason: string | null;
    passwordInDatabase: boolean;
    settings: Setting[];
    audit: AuditEntry[];
}

const SOURCE_LABEL: Record<Setting["source"], string> = {
    database: "base de dados",
    environment: "variável de ambiente",
    default: "omissão",
};

/**
 * Bloqueia colar, arrastar e o menu de contexto.
 *
 * É ergonomia, não segurança — o servidor valida a frase de novo. O objetivo é
 * que a confirmação custe os segundos que obrigam a olhar para o que se está a
 * fazer.
 */
const NO_PASTE = {
    onPaste: (e: React.ClipboardEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => e.preventDefault(),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    autoComplete: "off" as const,
    spellCheck: false,
};

const EMERGENCY_CONFIRMATION = "PARAR TUDO AGORA";

/**
 * Paragem de emergência.
 *
 * Corta a cobrança automática e a faturação real de uma vez. Num incidente
 * ninguém deve ter de se lembrar de quais são os dois interruptores nem em que
 * ordem — e são a mesma decisão quando alguma coisa correu mal.
 *
 * Continua a exigir a frase escrita: uma paragem acidental fecha a receita.
 */
function EmergencyStop({ degraded, onDone }: { degraded: boolean; onDone: () => Promise<void> }) {
    const [aberto, setAberto] = useState(false);
    const [frase, setFrase] = useState("");
    const [operador, setOperador] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const [aParar, setAParar] = useState(false);

    async function parar(event: FormEvent) {
        event.preventDefault();
        if (aParar) return;
        setAParar(true);
        setErro(null);
        try {
            const res = await fetch("/api/master-admin/settings/emergency-stop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmationTyped: frase, actorLabel: operador }),
            });
            const data = (await res.json()) as { ok: boolean; message?: string };
            if (!data.ok) {
                setErro(data.message ?? "Não foi possível parar.");
                return;
            }
            setAberto(false);
            setFrase("");
            await onDone();
        } catch {
            setErro("Falha de ligação ao servidor.");
        } finally {
            setAParar(false);
        }
    }

    return (
        <section className="rounded-xl border-2 border-red-600 bg-white p-5">
            <h2 className="font-semibold text-red-800">Paragem de emergência</h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-700">
                Desliga de uma vez a cobrança automática e a faturação real. Deixa o sistema nos
                estados seguros: pagamento manual e faturação em ensaio. As reservas continuam a
                entrar.
            </p>

            {erro ? (
                <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {erro}
                </p>
            ) : null}

            {!aberto ? (
                <button
                    type="button"
                    disabled={degraded}
                    onClick={() => {
                        setAberto(true);
                        setFrase("");
                        setErro(null);
                    }}
                    className="mt-3 rounded-lg border border-red-600 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Parar tudo
                </button>
            ) : (
                <form onSubmit={parar} className="mt-3 rounded-lg bg-red-50 p-4">
                    <label
                        htmlFor="frase-emergencia"
                        className="block text-xs font-medium uppercase tracking-wider text-red-700"
                    >
                        Escreva para confirmar (não é possível colar)
                    </label>
                    <p className="mt-1 select-none font-mono text-sm font-bold tracking-wide text-red-900">
                        {EMERGENCY_CONFIRMATION}
                    </p>
                    <input
                        id="frase-emergencia"
                        value={frase}
                        onChange={(e) => setFrase(e.target.value)}
                        {...NO_PASTE}
                        className="mt-2 min-h-[44px] w-full rounded-lg border border-red-300 px-3 font-mono text-sm outline-none focus:border-red-700"
                    />
                    <label
                        htmlFor="operador-emergencia"
                        className="mt-3 block text-xs font-medium uppercase tracking-wider text-red-700"
                    >
                        Quem está a fazer isto
                    </label>
                    <input
                        id="operador-emergencia"
                        value={operador}
                        onChange={(e) => setOperador(e.target.value)}
                        placeholder="nome ou iniciais"
                        className="mt-1 min-h-[44px] w-full rounded-lg border border-red-300 px-3 text-sm outline-none focus:border-red-700"
                    />
                    <div className="mt-4 flex gap-2">
                        <button
                            type="submit"
                            disabled={aParar || frase.trim().replace(/\s+/g, " ") !== EMERGENCY_CONFIRMATION}
                            className="min-h-[44px] rounded-lg bg-red-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:opacity-30"
                        >
                            {aParar ? "A parar…" : "Parar tudo"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAberto(false);
                                setFrase("");
                            }}
                            className="min-h-[44px] rounded-lg px-4 text-sm font-medium text-neutral-600 hover:text-black"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}

export function OperationalSettingsPanel() {
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const [aCarregar, setACarregar] = useState(true);

    /** Interruptor em confirmação: `${key}:${value}`. */
    const [aConfirmar, setAConfirmar] = useState<string | null>(null);
    const [frase, setFrase] = useState("");
    const [operador, setOperador] = useState("");
    const [aGravar, setAGravar] = useState(false);

    const carregar = useCallback(async () => {
        setACarregar(true);
        try {
            const res = await fetch("/api/master-admin/settings", { cache: "no-store" });
            if (res.status === 401) {
                window.location.href = "/master-admin/login/";
                return;
            }
            const data = (await res.json()) as Snapshot | { ok: false; message: string };
            if (!("ok" in data) || !data.ok) {
                setErro("message" in data ? data.message : "Não foi possível ler o estado.");
                return;
            }
            setSnapshot(data);
            setErro(null);
        } catch {
            setErro("Falha de ligação ao servidor.");
        } finally {
            setACarregar(false);
        }
    }, []);

    useEffect(() => {
        void carregar();
    }, [carregar]);

    async function aplicar(event: FormEvent, setting: Setting, option: Option) {
        event.preventDefault();
        if (aGravar) return;
        setAGravar(true);
        setErro(null);

        try {
            const res = await fetch("/api/master-admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: setting.key,
                    value: option.value,
                    confirmationTyped: frase,
                    actorLabel: operador,
                }),
            });
            const data = (await res.json()) as { ok: boolean; message?: string };
            if (!data.ok) {
                setErro(data.message ?? "Não foi possível aplicar a alteração.");
                return;
            }
            setAConfirmar(null);
            setFrase("");
            await carregar();
        } catch {
            setErro("Falha de ligação ao servidor.");
        } finally {
            setAGravar(false);
        }
    }

    if (aCarregar && !snapshot) {
        return <p className="text-sm text-neutral-500">A ler o estado…</p>;
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-2xl font-bold tracking-tight text-black">Controlo operacional</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
                    Cada alteração aqui muda o comportamento do site em segundos, sem deploy. Nenhuma
                    acontece com um clique: é preciso escrever a frase de confirmação à mão.
                </p>
            </header>

            {snapshot?.degraded ? (
                <div role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-4">
                    <p className="font-semibold text-red-800">A base de dados não está a responder.</p>
                    <p className="mt-1 text-sm text-red-700">
                        Os valores abaixo são os de ambiente ou os últimos conhecidos, e{" "}
                        <strong>nenhuma alteração é aceite</strong> neste estado. O site mantém-se como
                        estava — nada foi desligado sozinho.
                    </p>
                    {snapshot.degradedReason ? (
                        <p className="mt-2 font-mono text-xs text-red-600">{snapshot.degradedReason}</p>
                    ) : null}
                </div>
            ) : null}

            {erro ? (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {erro}
                </p>
            ) : null}

            <section className="space-y-4">
                {snapshot?.settings.map((setting) => {
                    const actual = setting.options.find((o) => o.value === setting.value);
                    return (
                        <article
                            key={setting.key}
                            className={`rounded-xl border bg-white p-5 ${
                                setting.critical ? "border-neutral-300" : "border-neutral-200"
                            }`}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <h2 className="font-semibold text-black">{setting.label}</h2>
                                    <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                                        {setting.description}
                                    </p>
                                </div>
                                <span className="rounded-md bg-black px-2.5 py-1 text-xs font-semibold text-white">
                                    {actual?.label ?? setting.value}
                                </span>
                            </div>

                            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                                <div className="flex gap-1.5">
                                    <dt>Valor vem de:</dt>
                                    <dd className="font-medium text-neutral-800">{SOURCE_LABEL[setting.source]}</dd>
                                </div>
                                <div className="flex gap-1.5">
                                    <dt>Na base de dados:</dt>
                                    <dd className="font-mono">{setting.databaseValue ?? "—"}</dd>
                                </div>
                                <div className="flex gap-1.5">
                                    <dt title={setting.envVar}>No ambiente:</dt>
                                    <dd className="font-mono">{setting.environmentValue ?? "—"}</dd>
                                </div>
                            </dl>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {setting.options
                                    .filter((o) => o.value !== setting.value)
                                    .map((option) => {
                                        const id = `${setting.key}:${option.value}`;
                                        const aberto = aConfirmar === id;
                                        return (
                                            <div key={option.value} className="w-full">
                                                {!aberto ? (
                                                    <button
                                                        type="button"
                                                        disabled={snapshot.degraded}
                                                        onClick={() => {
                                                            setAConfirmar(id);
                                                            setFrase("");
                                                            setErro(null);
                                                        }}
                                                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-black transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        Mudar para: {option.label}
                                                    </button>
                                                ) : (
                                                    <form
                                                        onSubmit={(e) => aplicar(e, setting, option)}
                                                        className="rounded-lg border-2 border-black bg-neutral-50 p-4"
                                                    >
                                                        <p className="text-sm font-semibold text-black">
                                                            {option.label}
                                                        </p>
                                                        <p className="mt-1 text-sm leading-relaxed text-neutral-700">
                                                            {option.consequence}
                                                        </p>

                                                        {option.confirmation ? (
                                                            <>
                                                                <label
                                                                    htmlFor={`frase-${id}`}
                                                                    className="mt-4 block text-xs font-medium uppercase tracking-wider text-neutral-500"
                                                                >
                                                                    Escreva para confirmar (não é possível colar)
                                                                </label>
                                                                <p className="mt-1 select-none font-mono text-sm font-bold tracking-wide text-black">
                                                                    {option.confirmation}
                                                                </p>
                                                                <input
                                                                    id={`frase-${id}`}
                                                                    value={frase}
                                                                    onChange={(e) => setFrase(e.target.value)}
                                                                    {...NO_PASTE}
                                                                    className="mt-2 min-h-[44px] w-full rounded-lg border border-neutral-300 px-3 font-mono text-sm outline-none focus:border-black"
                                                                />
                                                            </>
                                                        ) : null}

                                                        <label
                                                            htmlFor={`operador-${id}`}
                                                            className="mt-3 block text-xs font-medium uppercase tracking-wider text-neutral-500"
                                                        >
                                                            Quem está a fazer isto
                                                        </label>
                                                        <input
                                                            id={`operador-${id}`}
                                                            value={operador}
                                                            onChange={(e) => setOperador(e.target.value)}
                                                            placeholder="nome ou iniciais"
                                                            className="mt-1 min-h-[44px] w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-black"
                                                        />

                                                        <div className="mt-4 flex gap-2">
                                                            <button
                                                                type="submit"
                                                                disabled={
                                                                    aGravar ||
                                                                    (option.confirmation !== null &&
                                                                        frase.trim().replace(/\s+/g, " ") !==
                                                                            option.confirmation)
                                                                }
                                                                className="min-h-[44px] rounded-lg bg-black px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-30"
                                                            >
                                                                {aGravar ? "A aplicar…" : "Aplicar"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setAConfirmar(null);
                                                                    setFrase("");
                                                                }}
                                                                className="min-h-[44px] rounded-lg px-4 text-sm font-medium text-neutral-600 hover:text-black"
                                                            >
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </form>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </article>
                    );
                })}
            </section>

            <EmergencyStop degraded={snapshot?.degraded ?? false} onDone={carregar} />

            <section className="rounded-xl border border-neutral-200 bg-white p-5">
                <h2 className="font-semibold text-black">Password de administração</h2>
                <p className="mt-1 text-sm text-neutral-600">
                    {snapshot?.passwordInDatabase
                        ? "Está definida no painel. A variável de ambiente já não serve para entrar."
                        : "Ainda vem da variável de ambiente, guardada em claro na configuração. Convém trocá-la."}
                </p>
                <Link
                    href="/master-admin/settings/password/"
                    className="mt-3 inline-block rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-black hover:border-black"
                >
                    Gerar uma password forte
                </Link>
            </section>

            {snapshot && snapshot.audit.length > 0 ? (
                <section>
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                        Últimas alterações
                    </h2>
                    <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white text-sm">
                        {snapshot.audit.map((a, i) => (
                            <li key={`${a.created_at}-${i}`} className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-2.5">
                                <span className="font-mono text-xs text-neutral-500">
                                    {new Date(a.created_at).toLocaleString("pt-PT")}
                                </span>
                                <span className="font-medium text-black">{a.key}</span>
                                <span className="font-mono text-xs text-neutral-600">
                                    {a.old_value ?? "—"} → {a.new_value}
                                </span>
                                <span className="text-xs text-neutral-500">{a.actor_label ?? "sem identificação"}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </div>
    );
}

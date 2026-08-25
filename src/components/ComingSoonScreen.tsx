"use client";

import { FormEvent, useEffect, useState } from "react";

import { COMING_SOON_LANGUAGES, type ComingSoonLang } from "@/lib/coming-soon/language";

/**
 * Ecrã de "Em breve", com entrada de administração.
 *
 * Cinco idiomas, escolhidos porque são de onde vêm os passageiros de aeroporto
 * no Porto e em Lisboa. O idioma inicial vem do Accept-Language, resolvido no
 * servidor — evita o piscar de quem carrega em português e vê trocar para
 * inglês meio segundo depois. Fora dos cinco, inglês.
 *
 * O botão de administração só revela o campo de password depois de clicado: um
 * formulário sempre visível convida a tentativas de quem passe por aqui.
 */

/** Como cada idioma se diz a si próprio — nunca traduzido. */
const NOMES: Record<ComingSoonLang, string> = {
    pt: "PT",
    en: "EN",
    es: "ES",
    de: "DE",
    fr: "FR",
};

interface Copy {
    title: string;
    body: string;
    contact: string;
    whatsapp: string;
    adminLink: string;
    passwordLabel: string;
    submit: string;
    submitting: string;
    errorGeneric: string;
    errorNetwork: string;
    langLabel: string;
    cancel: string;
}

const TEXTOS: Record<ComingSoonLang, Copy> = {
    pt: {
        title: "Em breve",
        body: "Estamos a preparar a nova plataforma de transfers privados.",
        contact: "Para já, fale connosco diretamente.",
        whatsapp: "WhatsApp",
        adminLink: "Entrar como admin",
        passwordLabel: "Password",
        submit: "Entrar",
        submitting: "A entrar…",
        errorGeneric: "Não foi possível entrar.",
        errorNetwork: "Falha de ligação. Tente novamente.",
        langLabel: "Idioma",
        cancel: "Cancelar",
    },
    en: {
        title: "Coming soon",
        body: "We are preparing the new private transfer platform.",
        contact: "In the meantime, talk to us directly.",
        whatsapp: "WhatsApp",
        adminLink: "Admin sign in",
        passwordLabel: "Password",
        submit: "Sign in",
        submitting: "Signing in…",
        errorGeneric: "Could not sign in.",
        errorNetwork: "Connection failed. Please try again.",
        langLabel: "Language",
        cancel: "Cancel",
    },
    es: {
        title: "Muy pronto",
        body: "Estamos preparando la nueva plataforma de traslados privados.",
        contact: "Mientras tanto, hable con nosotros directamente.",
        whatsapp: "WhatsApp",
        adminLink: "Acceso de administrador",
        passwordLabel: "Contraseña",
        submit: "Entrar",
        submitting: "Entrando…",
        errorGeneric: "No se ha podido entrar.",
        errorNetwork: "Error de conexión. Inténtelo de nuevo.",
        langLabel: "Idioma",
        cancel: "Cancelar",
    },
    de: {
        title: "Demnächst",
        body: "Wir bereiten die neue Plattform für private Transfers vor.",
        contact: "Bis dahin sprechen Sie uns direkt an.",
        whatsapp: "WhatsApp",
        adminLink: "Admin-Anmeldung",
        passwordLabel: "Passwort",
        submit: "Anmelden",
        submitting: "Anmeldung läuft…",
        errorGeneric: "Anmeldung nicht möglich.",
        errorNetwork: "Verbindungsfehler. Bitte erneut versuchen.",
        langLabel: "Sprache",
        cancel: "Abbrechen",
    },
    fr: {
        title: "Bientôt disponible",
        body: "Nous préparons la nouvelle plateforme de transferts privés.",
        contact: "En attendant, contactez-nous directement.",
        whatsapp: "WhatsApp",
        adminLink: "Connexion admin",
        passwordLabel: "Mot de passe",
        submit: "Se connecter",
        submitting: "Connexion…",
        errorGeneric: "Connexion impossible.",
        errorNetwork: "Échec de la connexion. Veuillez réessayer.",
        langLabel: "Langue",
        cancel: "Annuler",
    },
};

/**
 * O endereço mostrado e o endereço que recebe são diferentes, de propósito.
 *
 * O `reservas@way2go.pt` é o da marca e é o que o cliente deve ler; o
 * `reservas@vruum.pt` é o que existe hoje e recebe mesmo. Quando a caixa da
 * Way2Go estiver de pé, muda-se `PARA` e mais nada.
 */
const EMAIL_MOSTRADO = "reservas@way2go.pt";
const EMAIL_PARA = "reservas@vruum.pt";
const WHATSAPP = "https://wa.me/351913281953";

export function ComingSoonScreen({ idiomaInicial = "en" }: { idiomaInicial?: ComingSoonLang }) {
    const [lang, setLang] = useState<ComingSoonLang>(idiomaInicial);
    const [aberto, setAberto] = useState(false);
    const [password, setPassword] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const [aEnviar, setAEnviar] = useState(false);

    // Entrada suave, sem keyframes próprios: o estado muda uma vez depois de
    // montar e a transição faz o resto. `motion-reduce` desliga-a por inteiro.
    const [montado, setMontado] = useState(false);
    useEffect(() => setMontado(true), []);

    const t = TEXTOS[lang];

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
            setErro(data.message ?? t.errorGeneric);
        } catch {
            setErro(t.errorNetwork);
        } finally {
            setAEnviar(false);
        }
    }

    return (
        <main
            lang={lang}
            className="relative min-h-screen overflow-hidden bg-[#0a0a0b] text-neutral-200 antialiased"
        >
            {/* Duas luzes muito ténues, quentes, a sugerir faróis na estrada à
                noite. Puramente decorativas — escondidas dos leitores de ecrã. */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-[-18%] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,244,214,0.10),transparent_62%)]" />
                <div className="absolute bottom-[-24%] right-[-14%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_66%)]" />
            </div>

            {/* Seletor de idioma */}
            <nav
                aria-label={t.langLabel}
                className="relative z-10 flex justify-center pt-8 sm:justify-end sm:px-8"
            >
                <ul className="flex gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur">
                    {COMING_SOON_LANGUAGES.map((codigo) => {
                        const ativo = codigo === lang;
                        return (
                            <li key={codigo}>
                                <button
                                    type="button"
                                    lang={codigo}
                                    onClick={() => setLang(codigo)}
                                    aria-current={ativo ? "true" : undefined}
                                    className={`min-h-[36px] min-w-[42px] rounded-full px-3 text-xs font-semibold tracking-wide transition-colors ${
                                        ativo
                                            ? "bg-white text-black"
                                            : "text-neutral-400 hover:text-white"
                                    }`}
                                >
                                    {NOMES[codigo]}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="relative z-10 flex min-h-[calc(100vh-5.5rem)] items-center justify-center px-6 pb-16">
                <div
                    className={`w-full max-w-lg text-center transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                        montado ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                    }`}
                >
                    <div className="mx-auto mb-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur">
                        <span className="text-2xl font-bold text-white">W</span>
                    </div>

                    <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.35em] text-neutral-500">
                        Way2Go
                    </p>

                    <h1 className="mb-6 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        {t.title}
                    </h1>

                    <p className="mx-auto mb-12 max-w-md text-pretty leading-relaxed text-neutral-400">
                        {t.body}
                        <br className="hidden sm:block" /> {t.contact}
                    </p>

                    <div className="mb-14 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                        <a
                            href={WHATSAPP}
                            className="w-full rounded-full bg-white px-7 py-3.5 font-semibold text-black transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:hover:scale-100 sm:w-auto"
                        >
                            {t.whatsapp}
                        </a>
                        <a
                            href={`mailto:${EMAIL_PARA}`}
                            className="w-full rounded-full border border-white/20 px-7 py-3.5 font-medium text-neutral-200 transition-colors hover:border-white/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
                        >
                            {EMAIL_MOSTRADO}
                        </a>
                    </div>

                    <div className="border-t border-white/10 pt-8">
                        {!aberto ? (
                            <button
                                type="button"
                                onClick={() => setAberto(true)}
                                className="text-sm font-medium text-neutral-600 underline underline-offset-4 transition-colors hover:text-neutral-300"
                            >
                                {t.adminLink}
                            </button>
                        ) : (
                            <form onSubmit={entrar} className="mx-auto flex max-w-xs flex-col gap-3">
                                <label
                                    htmlFor="preview-password"
                                    className="text-left text-[0.68rem] font-medium uppercase tracking-[0.18em] text-neutral-500"
                                >
                                    {t.passwordLabel}
                                </label>
                                <input
                                    id="preview-password"
                                    type="password"
                                    autoFocus
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="min-h-[44px] w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 text-sm text-white outline-none transition-colors focus:border-white/60"
                                />

                                {erro && (
                                    <p role="alert" className="text-left text-sm text-red-400">
                                        {erro}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={aEnviar || password.length === 0}
                                    className="min-h-[44px] rounded-lg bg-white px-6 font-semibold text-black transition-colors hover:bg-neutral-200 disabled:opacity-30"
                                >
                                    {aEnviar ? t.submitting : t.submit}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAberto(false);
                                        setPassword("");
                                        setErro(null);
                                    }}
                                    className="text-sm text-neutral-600 transition-colors hover:text-neutral-300"
                                >
                                    {t.cancel}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

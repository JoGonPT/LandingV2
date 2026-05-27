"use client";

import { QuickQuoteForm } from "./QuickQuoteForm";

interface HeroSectionProps {
    dict: {
        badge: string;
        title: string;
        subtitle: string;
        cta: string;
    };
    locale: string;
}

export default function HeroSection({ dict, locale }: HeroSectionProps) {
    const isPT = locale === "pt";

    const mainTitle = isPT
        ? "Transfers Privados Portugal — Conforto e Pontualidade"
        : dict.title;

    const mainSubtitle = isPT
        ? "Serviço premium de transporte privado em Portugal. Viaje com elegância e tranquilidade."
        : dict.subtitle;

    return (
        <section className="relative min-h-screen overflow-hidden bg-white px-6 py-20 pt-32">
            <div className="relative mx-auto w-full max-w-7xl">
                <div className="flex flex-col items-stretch gap-12 lg:flex-row lg:gap-20">

                    {/* ── ESQUERDA: Título + Formulário de Orçamento ────────────── */}
                    <div className="flex w-full flex-col justify-between lg:w-1/2">
                        <div>
                            {/* Título da Hero */}
                            <div className="mb-8 text-center lg:text-left">
                                <h1
                                    className="font-bold leading-tight tracking-tight text-black"
                                    style={{ fontSize: "clamp(1.5rem, 6vw, 3.2rem)" }}
                                >
                                    {mainTitle}
                                </h1>
                                <p
                                    className="mt-4 font-medium text-gray-700"
                                    style={{ fontSize: "clamp(1rem, 3.5vw, 1.15rem)" }}
                                >
                                    {mainSubtitle}
                                </p>
                            </div>

                            {/* Formulário de Orçamento Rápido Bilingue */}
                            <div className="w-full rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
                                <QuickQuoteForm locale={locale} />
                            </div>
                        </div>

                        {/* Trustpilot */}
                        <div className="mt-8 flex justify-center lg:justify-start">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">EXCELLENT</span>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="bg-[#00B67A] p-0.5">
                                            <svg className="h-4 w-4 fill-current text-white" viewBox="0 0 20 20">
                                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                            </svg>
                                        </div>
                                    ))}
                                </div>
                                <span className="flex items-center gap-1 text-sm font-medium text-[#00B67A]">
                                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                    </svg>
                                    Trustpilot
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── DIREITA: Painel visual premium ───────────────────────── */}
                    <div className="relative hidden w-full lg:block lg:w-1/2">
                        <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-600 shadow-2xl">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_46%),radial-gradient(circle_at_80%_85%,rgba(255,255,255,0.18),transparent_48%)]" />
                            <div className="absolute inset-0 flex items-end p-10">
                                <p className="max-w-md text-xl font-semibold leading-relaxed text-white/90">
                                    {isPT
                                        ? "Viagens premium com pontualidade e conforto."
                                        : "Premium rides with punctuality and comfort."}
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}

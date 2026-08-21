"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";

import { QuickQuoteForm } from "./QuickQuoteForm";

/**
 * O funil só é descarregado quando está ligado.
 *
 * O `BookingForm` traz o Stripe Elements atrás dele. Importá-lo normalmente
 * punha esse peso no bundle da página inicial mesmo com o funil desligado — e
 * esta é a página cuja velocidade de carregamento mais custa ao negócio.
 * `ssr: false` porque o Stripe só existe no browser.
 */
const BookingForm = dynamic(() => import("./BookingForm"), {
    ssr: false,
    loading: () => <div className="min-h-[420px] animate-pulse rounded-xl bg-neutral-100" />,
});

interface HeroSectionProps {
    dict: {
        badge: string;
        title: string;
        subtitle: string;
        cta: string;
    };
    /** Dicionário do funil. Só é necessário quando o modo é `funnel`. */
    bookingDict?: Record<string, unknown>;
    /** Resolvido no servidor, para não ficar gravado no bundle do browser. */
    bookingUiMode?: "quote" | "funnel";
    locale: string;
}

export default function HeroSection({ dict, bookingDict, bookingUiMode, locale }: HeroSectionProps) {
    const isPT = locale === "pt";

    // O funil ocupa a página a partir do momento em que o cliente escolhe
    // veículo: a partir daí está a comprar, e o título e a imagem passam a
    // distrair de uma decisão já tomada.
    const [formPhase, setFormPhase] = useState<"form" | "vehicles" | "payment">("form");
    const useFunnel = bookingUiMode === "funnel" && bookingDict !== undefined;
    const bookingOnlyMode = useFunnel && formPhase !== "form";

    // A copy vem do dicionário nos dois idiomas. Havia aqui uma sobreposição em
    // português hardcoded que ignorava `dict.title`/`dict.subtitle`: o PT falava
    // de "Portugal" e o EN prometia "Worldwide", ou seja, as duas versões do
    // mesmo site comunicavam posicionamentos diferentes.
    const mainTitle = dict.title;
    const mainSubtitle = dict.subtitle;

    return (
        <section
            className={`relative min-h-screen overflow-hidden bg-white ${
                bookingOnlyMode ? "px-4 py-10 pt-24 lg:px-6" : "px-6 py-20 pt-32"
            }`}
        >
            <div className={`relative mx-auto w-full ${bookingOnlyMode ? "max-w-6xl" : "max-w-7xl"}`}>
                <div
                    className={`flex flex-col items-stretch ${
                        bookingOnlyMode ? "gap-0" : "gap-12 lg:flex-row lg:gap-20"
                    }`}
                >

                    {/* ── ESQUERDA: Título + Formulário de Orçamento ────────────── */}
                    <div className={`flex w-full flex-col justify-between ${bookingOnlyMode ? "" : "lg:w-1/2"}`}>
                        <div>
                            {/* Título da Hero */}
                            <div className={`mb-8 text-center lg:text-left ${bookingOnlyMode ? "hidden" : ""}`}>
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

                            {/* Formulário: orçamento por omissão, funil completo quando ligado */}
                            <div className="w-full rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
                                {useFunnel ? (
                                    <BookingForm
                                        dict={bookingDict as never}
                                        locale={locale}
                                        onPhaseChange={setFormPhase}
                                    />
                                ) : (
                                    <QuickQuoteForm locale={locale} />
                                )}
                            </div>
                        </div>

                        {/* Trustpilot */}
                        <div className={`mt-8 flex justify-center lg:justify-start ${bookingOnlyMode ? "hidden" : ""}`}>
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
                    <div className={`relative w-full lg:w-1/2 ${bookingOnlyMode ? "hidden" : "hidden lg:block"}`}>
                        <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] bg-neutral-900 shadow-2xl">
                            {/* Fotografia de fundo */}
                            <Image
                                src="/hero-chauffeur.webp"
                                alt="Motorista executivo Way2Go a abrir a porta do veículo para o cliente"
                                fill
                                priority
                                className="object-cover object-[55%_20%]"
                                sizes="(min-width: 1024px) 50vw, 0vw"
                            />
                            {/* Gradiente escuro na base — garante legibilidade do texto */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                            {/* Texto na base do painel */}
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

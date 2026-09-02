"use client";

import Link from "next/link";

import type { AlinhamentoCta, BlocoCta, VarianteCta } from "@/lib/cms/blocks";
import { track } from "@/lib/analytics/track";

/**
 * Botão de conversão, inserido a meio do conteúdo pelo CMS.
 *
 * É componente de cliente por uma razão só: o `onClick` que conta o evento.
 * Tudo o resto — o endereço, o estilo, o alinhamento — já vem decidido do
 * servidor, em `@/lib/cms/blocks`.
 *
 * A paleta é a do projeto, definida em `tailwind.config.ts`: `gold` (#D4AF37)
 * para o principal, `dark` (#050816) para o secundário.
 */

const ESTILOS: Record<VarianteCta, string> = {
    primary:
        "bg-gold text-dark hover:bg-gold-light active:bg-gold-dark shadow-sm hover:shadow-md",
    secondary: "bg-dark text-white hover:bg-dark/90 shadow-sm hover:shadow-md",
    outline:
        "border-2 border-dark text-dark hover:bg-dark hover:text-white",
};

const ALINHA: Record<AlinhamentoCta, string> = {
    left: "items-start text-left",
    center: "items-center text-center",
    right: "items-end text-right",
};

export default function CallToActionBlock({ bloco }: { bloco: BlocoCta }) {
    const { texto, subtexto, href, externo, variante, alinhamento, evento } = bloco;

    const aoCarregar = () => {
        if (evento) track(evento, { cta_text: texto, cta_href: href });
    };

    const classes = [
        // Largura total no telemóvel — um botão de conversão fino num ecrã
        // estreito é um alvo difícil de acertar com o polegar.
        "inline-flex w-full sm:w-auto items-center justify-center",
        "rounded-xl px-8 py-4 text-base font-semibold tracking-tight",
        "transition-all duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        ESTILOS[variante],
    ].join(" ");

    const conteudo = (
        <>
            {texto}
            <span aria-hidden className="ml-2">
                →
            </span>
        </>
    );

    return (
        <div className={`my-10 flex flex-col ${ALINHA[alinhamento]}`}>
            {externo ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={aoCarregar}
                    className={classes}
                >
                    {conteudo}
                </a>
            ) : (
                <Link href={href} onClick={aoCarregar} className={classes}>
                    {conteudo}
                </Link>
            )}

            {subtexto && (
                <p className="mt-3 text-sm text-gray-500 max-w-md">{subtexto}</p>
            )}
        </div>
    );
}

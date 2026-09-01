import type { ComponentProps } from "react";

import Image from "next/image";
import Link from "next/link";

import CookieConsent from "@/components/CookieConsent";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import type { Destino } from "@/lib/cms/destinations";

/**
 * A página de um destino.
 *
 * Partilhada pelas duas rotas — `/pt/transferes/…` e `/en/transfers/…` — que
 * existem separadas para que cada idioma tenha o seu endereço e o cruzado dê
 * 404, em vez de servir a mesma página em dois sítios.
 *
 * O desenho segue o que o site já faz: fundo branco, títulos a negro com
 * `tracking-tight`, corpo em `gray-700`, largura máxima de `4xl`. A
 * pré-visualização que serviu para rever o texto tinha outra identidade
 * própria; aqui a página tem de parecer parte do site, não uma visita.
 */

/**
 * As formas dos dicionários derivam dos próprios componentes, em vez de serem
 * escritas outra vez aqui. Se um deles passar a precisar de outro rótulo, isto
 * deixa de compilar — que é exactamente o aviso que se quer.
 */
interface Props {
    destino: Destino;
    locale: string;
    dict: {
        common: ComponentProps<typeof Navbar>["dict"] & { back: string };
        faq: { title: string };
        footer: ComponentProps<typeof Footer>["dict"];
        cookies: ComponentProps<typeof CookieConsent>["dict"];
    };
}

/** Rótulos dos dados da rota. Poucos e fixos — não justificam ir ao dicionário. */
const ROTULOS = {
    pt: { origem: "Origem", distancia: "Distância", duracao: "Duração", preco: "Preço desde" },
    en: { origem: "From", distancia: "Distance", duracao: "Duration", preco: "From" },
} as const;

export default function DestinationPage({ destino, locale, dict }: Props) {
    const r = ROTULOS[locale === "en" ? "en" : "pt"];
    const { rota } = destino;
    const temRota =
        rota.origem || rota.distanciaKm != null || rota.duracaoMin != null || rota.precoDesde != null;

    return (
        <>
            <Navbar dict={dict.common} locale={locale} />

            <main className="min-h-screen bg-white">
                <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
                    <Link
                        href={`/${locale}`}
                        className="inline-block mb-8 text-gray-600 hover:text-black transition-colors font-medium border-b border-black/10"
                    >
                        {dict.common.back}
                    </Link>

                    {destino.city && (
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500 mb-4">
                            {destino.city}
                        </p>
                    )}

                    <h1 className="text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight text-balance">
                        {destino.title}
                    </h1>

                    {destino.subtitle && (
                        <p className="text-xl text-gray-600 leading-relaxed mb-8 max-w-2xl">
                            {destino.subtitle}
                        </p>
                    )}
                </div>

                {destino.imagem && (
                    <div className="max-w-6xl mx-auto px-6 mb-16">
                        <Image
                            src={destino.imagem.url}
                            alt={destino.imagem.alt}
                            width={destino.imagem.width}
                            height={destino.imagem.height}
                            // A imagem de topo é o maior elemento acima da dobra:
                            // carregar com prioridade evita que salte depois.
                            priority
                            sizes="(max-width: 768px) 100vw, 1152px"
                            className="w-full h-auto rounded-lg object-cover"
                        />
                        {destino.imagem.credit && (
                            <p className="mt-2 text-xs text-gray-400">© {destino.imagem.credit}</p>
                        )}
                    </div>
                )}

                <div className="max-w-4xl mx-auto px-6">
                    {temRota && (
                        <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden mb-16">
                            {rota.origem && (
                                <div className="bg-white p-4 col-span-2 md:col-span-1">
                                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                                        {r.origem}
                                    </dt>
                                    <dd className="text-sm text-gray-900 leading-snug">{rota.origem}</dd>
                                </div>
                            )}
                            {rota.distanciaKm != null && (
                                <div className="bg-white p-4">
                                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                                        {r.distancia}
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900 tabular-nums">
                                        {rota.distanciaKm} km
                                    </dd>
                                </div>
                            )}
                            {rota.duracaoMin != null && (
                                <div className="bg-white p-4">
                                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                                        {r.duracao}
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900 tabular-nums">
                                        {rota.duracaoMin} min
                                    </dd>
                                </div>
                            )}
                            {rota.precoDesde != null && (
                                <div className="bg-white p-4">
                                    <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                                        {r.preco}
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900 tabular-nums">
                                        {rota.precoDesde} €
                                    </dd>
                                </div>
                            )}
                        </dl>
                    )}

                    {destino.highlights.length > 0 && (
                        <ul className="grid sm:grid-cols-2 gap-3 mb-16 list-none p-0">
                            {destino.highlights.map((ponto, i) => (
                                <li
                                    key={i}
                                    className="relative pl-8 pr-4 py-4 bg-gray-50 rounded-lg text-[15px] leading-snug text-gray-800"
                                >
                                    <span
                                        aria-hidden
                                        className="absolute left-4 top-[1.35rem] w-1.5 h-1.5 rounded-full bg-black"
                                    />
                                    {ponto}
                                </li>
                            ))}
                        </ul>
                    )}

                    {destino.bodyHtml && (
                        /*
                         * O HTML vem do nosso próprio CMS, convertido lá a partir
                         * do texto rico, e só quem tem conta no painel o escreve.
                         * Não é conteúdo de terceiros nem de visitantes.
                         */
                        <div
                            className="prose prose-neutral max-w-none text-gray-700 mb-8
                                       prose-headings:font-medium prose-headings:text-gray-900
                                       prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
                                       prose-p:leading-relaxed prose-li:marker:text-gray-400"
                            dangerouslySetInnerHTML={{ __html: destino.bodyHtml }}
                        />
                    )}
                </div>
            </main>

            {destino.faq.length > 0 && (
                <FAQSection dict={{ title: dict.faq.title, items: destino.faq }} />
            )}

            <Footer dict={dict.footer} locale={locale} />
            <CookieConsent dict={dict.cookies} locale={locale} />
        </>
    );
}

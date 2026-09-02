import Image from "next/image";
import Link from "next/link";

import type { DestinoResumo } from "@/lib/cms/destinations";
import { caminhoDestino } from "@/lib/i18n/route-segments";

/**
 * Os destinos, abaixo do formulário da página inicial.
 *
 * Até aqui não havia uma única ligação para as páginas de destino em todo o
 * site: existiam, e ninguém lá chegava.
 *
 * A lista vem do CMS. Acrescentar um destino no painel faz aparecer o cartão
 * dentro de cinco minutos, sem código e sem deploy.
 *
 * ## Se o CMS estiver em baixo
 *
 * A secção não aparece, e a página inicial serve na mesma. Esta é a página
 * mais importante do site e não pode depender de um CMS para se mostrar — o
 * `listarDestinos` devolve lista vazia em qualquer falha, e aqui isso traduz-se
 * em não renderizar nada.
 */

interface Props {
    destinos: DestinoResumo[];
    locale: string;
}

const TEXTOS = {
    pt: {
        titulo: "Destinos",
        subtitulo: "Transferes privados com motorista, preço fechado e acompanhamento do voo.",
    },
    en: {
        titulo: "Destinations",
        subtitulo: "Private transfers with a driver, a fixed price and flight tracking.",
    },
} as const;

export default function DestinationsSection({ destinos, locale }: Props) {
    if (destinos.length === 0) return null;

    const t = TEXTOS[locale === "en" ? "en" : "pt"];

    return (
        <section id="destinos" className="py-24 px-6 bg-gray-50">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-4xl font-bold text-black text-center tracking-tight text-balance">
                    {t.titulo}
                </h2>
                <p className="mt-4 mb-12 text-center text-gray-600 max-w-2xl mx-auto text-lg">
                    {t.subtitulo}
                </p>

                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 list-none p-0">
                    {destinos.map((d) => (
                        <li key={d.slug}>
                            <Cartao destino={d} locale={locale} />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

function Cartao({ destino, locale }: { destino: DestinoResumo; locale: string }) {
    const caminho = caminhoDestino(locale, destino.slug);
    if (!caminho) return null;

    const { imagem, aeroporto } = destino;

    return (
        <Link
            href={`/${locale}/${caminho}/`}
            className="group block relative overflow-hidden rounded-xl bg-black
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-black"
        >
            {/*
             * Sem fotografia o cartão continua a fazer sentido: fica com fundo
             * escuro e o mesmo texto. É melhor do que um buraco na grelha, e
             * evita ter de esconder destinos por lhes faltar a imagem.
             */}
            <div className="relative aspect-[16/10] w-full">
                {imagem ? (
                    <Image
                        src={imagem.url}
                        alt={imagem.alt}
                        fill
                        // Uma coluna no telemóvel, duas em tablet, três acima.
                        // Sem isto o browser descarrega sempre a maior versão.
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-900" />
                )}

                {/* O mesmo recurso do HeroSection: gradiente na base para o
                    texto branco ser legível sobre qualquer fotografia. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="text-xl font-bold text-white tracking-tight text-balance line-clamp-2">
                        {destino.city}
                    </h3>

                    {aeroporto.nome && (
                        <p className="mt-1.5 flex items-center gap-2 text-sm text-white/85">
                            <span aria-hidden className="shrink-0">
                                ✈
                            </span>
                            <span className="truncate">{aeroporto.nome}</span>
                            {aeroporto.codigo && (
                                <>
                                    <span aria-hidden className="text-white/40">
                                        ·
                                    </span>
                                    <span className="shrink-0 font-semibold text-amber-300 tracking-wide">
                                        {aeroporto.codigo}
                                    </span>
                                </>
                            )}
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}

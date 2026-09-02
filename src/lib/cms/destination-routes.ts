import type { Metadata } from "next";

import { obterDestino } from "@/lib/cms/destinations";
import { canonicalPath, DEFAULT_LOCALE, LOCALES, SITE_URL } from "@/lib/site";

/**
 * Os endereços das páginas de destino.
 *
 * O segmento traduz-se com o idioma — quem procura em inglês escreve
 * «transfer», quem procura em português escreve «transferes», e é isso que
 * decide se a página aparece nas pesquisas. O nome da cidade fica igual nos
 * dois: `porto` é `porto` em qualquer língua.
 *
 * Cada rota só aceita o seu idioma. `/en/transferes/porto` dá 404 em vez de
 * servir a mesma página num segundo endereço, que é o que o Google penaliza
 * como conteúdo duplicado.
 */
export const SEGMENTO_POR_LOCALE = {
    pt: "transferes",
    en: "transfers",
} as const;

export type LocaleDestino = keyof typeof SEGMENTO_POR_LOCALE;

export function segmentoDe(locale: string): string | null {
    return locale in SEGMENTO_POR_LOCALE
        ? SEGMENTO_POR_LOCALE[locale as LocaleDestino]
        : null;
}

/** O caminho relativo de um destino, no idioma dado. Ex.: `transferes/porto`. */
export function caminhoDestino(locale: string, slug: string): string | null {
    const segmento = segmentoDe(locale);
    return segmento ? `${segmento}/${slug}` : null;
}

/**
 * Mapa `hreflang` de um destino.
 *
 * Não se pode usar o `languageAlternates` de `@/lib/site` porque esse assume o
 * mesmo caminho em todos os idiomas, e aqui o segmento muda. Um `hreflang`
 * errado é pior do que nenhum: manda os motores de busca para endereços que
 * dão 404.
 */
export function alternativasDestino(slug: string): Record<string, string> {
    const mapa: Record<string, string> = {};
    for (const locale of LOCALES) {
        const caminho = caminhoDestino(locale, slug);
        if (caminho) mapa[locale] = canonicalPath(locale, caminho);
    }
    const omissao = caminhoDestino(DEFAULT_LOCALE, slug);
    if (omissao) mapa["x-default"] = canonicalPath(DEFAULT_LOCALE, omissao);
    return mapa;
}

/**
 * Metadata de uma página de destino.
 *
 * Se o destino não existir — ou o CMS estiver em baixo — devolve o mínimo. A
 * página em si trata do 404; aqui não se lança, porque uma excepção no
 * `generateMetadata` rebenta a página inteira em vez de a deixar não encontrar.
 */
export async function metadataDestino(slug: string, locale: string): Promise<Metadata> {
    const destino = await obterDestino(slug, locale);
    const caminho = caminhoDestino(locale, slug);

    if (!destino || !caminho) {
        return { title: "Way2Go", robots: { index: false, follow: false } };
    }

    const titulo = destino.seo.title ?? destino.title;
    const descricao = destino.seo.description ?? destino.summary;
    const url = canonicalPath(locale, caminho);

    return {
        title: titulo,
        description: descricao,
        alternates: {
            canonical: url,
            languages: alternativasDestino(slug),
        },
        openGraph: {
            title: titulo,
            description: descricao,
            url,
            siteName: "Way2Go",
            locale,
            type: "article",
            images: destino.imagem
                ? [
                      {
                          url: destino.imagem.url,
                          width: destino.imagem.width,
                          height: destino.imagem.height,
                          alt: destino.imagem.alt,
                      },
                  ]
                : [`${SITE_URL}/opengraph-image`],
        },
    };
}

/**
 * Constantes públicas do site, partilhadas por metadata, sitemap e robots.
 *
 * `SITE_URL` usa **www**, confirmado contra produção a 19 ago 2026:
 * `https://way2go.pt/` devolve `308 Permanent Redirect` para
 * `https://www.way2go.pt/`, que responde 200. O www é o domínio canónico.
 *
 * Isto importa: um canonical, hreflang ou sitemap apontado à raiz mandaria os
 * motores de busca para um URL que redireciona, dividindo a autoridade em vez
 * de a unir. O JSON-LD do repositório dizia `https://way2go.pt` e estava
 * errado; os textos legais, que sempre referiram `www.way2go.pt`, estavam certos.
 */
export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "https://www.way2go.pt";

/**
 * Locales suportados. Duplicado em `src/middleware.ts` — a duplicação é
 * deliberada por agora: o middleware é o ficheiro com mais correções urgentes
 * no histórico e sem qualquer teste, pelo que não se toca nele fora de um item
 * dedicado. Unificar quando o F2-4 lhe der cobertura de testes.
 */
export const LOCALES = ["pt", "en"] as const;
export const DEFAULT_LOCALE = "pt";

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
    return (LOCALES as readonly string[]).includes(value);
}

/** `trailingSlash: true` no next.config.ts — os URLs canónicos têm de o refletir. */
export function canonicalPath(locale: string, path = ""): string {
    const clean = path.replace(/^\/+|\/+$/g, "");
    return clean ? `${SITE_URL}/${locale}/${clean}/` : `${SITE_URL}/${locale}/`;
}

/** Mapa hreflang para `alternates.languages`, mais o `x-default` no locale por defeito. */
export function languageAlternates(path = ""): Record<string, string> {
    const map: Record<string, string> = {};
    for (const locale of LOCALES) map[locale] = canonicalPath(locale, path);
    map["x-default"] = canonicalPath(DEFAULT_LOCALE, path);
    return map;
}

/**
 * Cabeçalho de pedido onde o middleware deixa o locale resolvido, para o layout
 * raiz o poder ler. É a única via: o layout raiz serve todas as rotas e não
 * recebe `params`.
 */
export const LOCALE_HEADER = "x-w2g-locale";

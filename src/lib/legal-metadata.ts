import type { Metadata } from "next";

import { getDictionary } from "@/get-dictionaries";
import { canonicalPath, languageAlternates } from "@/lib/site";

/**
 * Metadados das páginas legais.
 *
 * Antes as três partilhavam o título e a descrição do layout, o que as tornava
 * indistinguíveis nos resultados de pesquisa. O título vem do dicionário, pelo
 * que acompanha o idioma sem duplicar copy.
 */
type LegalKey = "privacy" | "terms" | "cookies";

const PATHS: Record<LegalKey, string> = {
    privacy: "legal/privacy",
    terms: "legal/terms",
    cookies: "legal/cookies",
};

export async function legalMetadata(key: LegalKey, locale: string): Promise<Metadata> {
    const dict = await getDictionary(locale);
    const title = dict.legal[key].title;
    const path = PATHS[key];
    const url = canonicalPath(locale, path);
    const fullTitle = `${title} | Way2Go`;

    return {
        title: fullTitle,
        description: title,
        alternates: { canonical: url, languages: languageAlternates(path) },
        openGraph: { type: "article", siteName: "Way2Go", title: fullTitle, url },
        robots: { index: true, follow: true },
    };
}

import type { MetadataRoute } from "next";

import { caminhoDestino } from "@/lib/i18n/route-segments";
import { listarSlugsPublicados } from "@/lib/cms/destinations";
import { LOCALES, canonicalPath, languageAlternates } from "@/lib/site";

/**
 * Só as páginas públicas entram. O portal B2B, a PWA de motoristas e as áreas
 * de administração ficam de fora de propósito — são `noindex` e não têm
 * qualquer ligação a partir do site.
 */
const PUBLIC_PATHS = ["", "legal/privacy", "legal/terms", "legal/cookies"] as const;

/**
 * As páginas de destino vêm do CMS.
 *
 * Se o CMS estiver em baixo, `listarSlugsPublicados` devolve lista vazia e o
 * mapa sai com as páginas fixas apenas. Um mapa incompleto é mau; um mapa que
 * rebenta é pior — o Google deixa de conseguir ler qualquer endereço, incluindo
 * os que não dependem do CMS.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const lastModified = new Date();

    const fixas = LOCALES.flatMap((locale) =>
        PUBLIC_PATHS.map((path) => ({
            url: canonicalPath(locale, path),
            lastModified,
            changeFrequency: (path === "" ? "weekly" : "yearly") as "weekly" | "yearly",
            priority: path === "" ? 1 : 0.3,
            alternates: { languages: languageAlternates(path) },
        })),
    );

    const slugs = await listarSlugsPublicados();

    // O `hreflang` dos destinos não pode usar o `languageAlternates`: esse
    // assume o mesmo caminho em todos os idiomas, e aqui o segmento traduz-se
    // (`transferes` contra `transfers`).
    const destinos = slugs.flatMap((slug) => {
        const alternativas: Record<string, string> = {};
        for (const locale of LOCALES) {
            const caminho = caminhoDestino(locale, slug);
            if (caminho) alternativas[locale] = canonicalPath(locale, caminho);
        }

        return LOCALES.flatMap((locale) => {
            const caminho = caminhoDestino(locale, slug);
            if (!caminho) return [];
            return [
                {
                    url: canonicalPath(locale, caminho),
                    lastModified,
                    changeFrequency: "monthly" as const,
                    priority: 0.8,
                    alternates: { languages: alternativas },
                },
            ];
        });
    });

    return [...fixas, ...destinos];
}

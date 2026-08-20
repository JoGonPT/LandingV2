import type { MetadataRoute } from "next";

import { LOCALES, canonicalPath, languageAlternates } from "@/lib/site";

/**
 * Só as páginas públicas entram. O portal B2B, a PWA de motoristas e as áreas
 * de administração ficam de fora de propósito — são `noindex` e não têm
 * qualquer ligação a partir do site.
 */
const PUBLIC_PATHS = ["", "legal/privacy", "legal/terms", "legal/cookies"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

    return LOCALES.flatMap((locale) =>
        PUBLIC_PATHS.map((path) => ({
            url: canonicalPath(locale, path),
            lastModified,
            changeFrequency: (path === "" ? "weekly" : "yearly") as "weekly" | "yearly",
            priority: path === "" ? 1 : 0.3,
            alternates: { languages: languageAlternates(path) },
        })),
    );
}

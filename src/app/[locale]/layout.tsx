import type { Metadata } from "next";

import { SITE_URL, canonicalPath, languageAlternates } from "@/lib/site";

export function generateStaticParams() {
    return [{ locale: "pt" }, { locale: "en" }];
}

/** Cada locale tem título e descrição próprios — antes todas as páginas partilhavam um só. */
const META = {
    pt: {
        title: "Way2Go | Transfers Privados e Serviço de Motorista",
        description:
            "Transfers privados de aeroporto com motorista profissional em Portugal e Espanha. Meet & Greet, monitorização de voo e 1h de espera gratuita incluída.",
    },
    en: {
        title: "Way2Go | Private Airport Transfers & Chauffeur Service",
        description:
            "Private airport transfers with professional chauffeurs in Portugal and Spain. Meet & Greet, flight monitoring and 1 hour of free waiting time included.",
    },
} as const;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const meta = META[locale as keyof typeof META] ?? META.pt;

    return {
        title: meta.title,
        description: meta.description,
        alternates: {
            canonical: canonicalPath(locale),
            languages: languageAlternates(),
        },
        openGraph: {
            type: "website",
            siteName: "Way2Go",
            title: meta.title,
            description: meta.description,
            url: canonicalPath(locale),
            locale: locale === "en" ? "en_GB" : "pt_PT",
        },
        twitter: {
            card: "summary_large_image",
            title: meta.title,
            description: meta.description,
        },
        robots: {
            index: true,
            follow: true,
            googleBot: { index: true, follow: true, "max-image-preview": "large" },
        },
        other: {
            "trustpilot-one-time-domain-verification-id": "f96a6770-e2b7-446f-a14e-e547c0425ea8",
        },
    };
}

// Sem `params`: o `lang` do `<html>` passou a vir do layout raiz, através do
// cabeçalho posto pelo middleware. O JSON-LD abaixo não depende do idioma.
export default function LocaleLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "LocalBusiness",
                        "name": "Way2Go",
                        "description": "Serviço de transfer profissional em Portugal",
                        // Do `SITE_URL`, não hardcoded: o valor anterior era a raiz
                        // `https://way2go.pt`, que faz 308 para o www.
                        "url": SITE_URL,
                        "telephone": "+351913281953",
                        "email": "support@way2go.pt",
                        // Morada completa, confirmada pelo dono do produto (20 ago 2026).
                        // Coerente com o foro contratual da Comarca do Porto nos T&C —
                        // a Maia é do distrito do Porto, o que confirma que o "Lisboa"
                        // que aqui estava antes era um placeholder errado, não só genérico.
                        "address": {
                            "@type": "PostalAddress",
                            "streetAddress": "Rua Álvaro Aurélio do Céu Oliveira 312, 9.º C",
                            "addressLocality": "Maia",
                            "postalCode": "4470-134",
                            "addressRegion": "Porto",
                            "addressCountry": "PT",
                        },
                        "areaServed": [
                            { "@type": "Country", "name": "Portugal" },
                            { "@type": "Country", "name": "Espanha" },
                        ],
                        "openingHoursSpecification": {
                            "@type": "OpeningHoursSpecification",
                            "dayOfWeek": [
                                "Monday",
                                "Tuesday",
                                "Wednesday",
                                "Thursday",
                                "Friday",
                                "Saturday",
                                "Sunday",
                            ],
                            "opens": "00:00",
                            "closes": "23:59",
                        },
                        "priceRange": "$$",
                    }),
                }}
            />
            {children}
        </>
    );
}

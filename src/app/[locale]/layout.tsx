import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export function generateStaticParams() {
    return [{ locale: "pt" }, { locale: "en" }];
}

export const metadata: Metadata = {
    title: "Way2Go | Professional Transfer Service",
    description: "Serviço de transfer de alta qualidade em Portugal. High-quality transfer service in Portugal.",
    keywords: "transfer, airport, transport, portugal, chauffeur, transferes, aeroporto",
};

export default async function RootLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "LocalBusiness",
                            "name": "Way2Go",
                            "description": "Serviço de transfer profissional em Portugal",
                            "url": "https://way2go.pt",
                            "telephone": "+351XXXXXXXXX",
                            "address": {
                                "@type": "PostalAddress",
                                "streetAddress": "Lisboa",
                                "addressLocality": "Lisboa",
                                "addressRegion": "Lisboa",
                                "postalCode": "1000",
                                "addressCountry": "PT",
                            },
                            "geo": {
                                "@type": "GeoCoordinates",
                                "latitude": 38.7223,
                                "longitude": -9.1393,
                            },
                            "openingHoursSpecification": {
                                "@type": "OpeningHoursSpecification",
                                "dayOfWeek": [
                                    "Monday",
                                    "Tuesday",
                                    "Wednesday",
                                    "Thursday",
                                    "Friday",
                                    "Saturday",
                                    "Sunday"
                                ],
                                "opens": "00:00",
                                "closes": "23:59",
                            },
                            "priceRange": "$$",
                        }),
                    }}
                />
            </head>
            <body className={inter.className}>{children}</body>
        </html>
    );
}

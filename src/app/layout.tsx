import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Inter } from "next/font/google";

import { DEFAULT_LOCALE, LOCALE_HEADER, SITE_URL, isLocale } from "@/lib/site";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

/**
 * `metadataBase` é o pré-requisito de tudo o resto: sem ele o Next não
 * consegue resolver URLs relativos em canonical, hreflang e Open Graph.
 */
export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
};

export default async function RootLayout({ children }: { children: ReactNode }) {
    // O locale vem do cabeçalho posto pelo middleware. É a única via disponível:
    // o layout raiz serve todas as rotas e não recebe `params`.
    //
    // Custo assumido: ler `headers()` torna estas páginas dinâmicas, quando
    // antes eram pré-renderizadas. São páginas que só leem um dicionário JSON —
    // sem base de dados nem chamadas externas — e o middleware já corria em
    // todos os pedidos. A alternativa que manteria a pré-renderização seria
    // dividir a app em grupos de rotas com layouts raiz separados: mais
    // correto, bastante mais invasivo. Ver F1-7 em docs/TODO.md.
    const requestHeaders = await headers();
    const headerLocale = requestHeaders.get(LOCALE_HEADER) ?? "";
    const lang = isLocale(headerLocale) ? headerLocale : DEFAULT_LOCALE;

    return (
        <html lang={lang} suppressHydrationWarning>
            <body className={`${inter.className} min-h-screen antialiased`}>{children}</body>
        </html>
    );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Ecrã partilhado pelas páginas de erro e de 404.
 *
 * É um componente de cliente porque `error.tsx` e `global-error.tsx` têm de o
 * ser, por imposição do Next. Isso impede o uso do `getDictionary`, que é
 * `server-only` — daí a copy embutida aqui. É a mesma duplicação assinalada no
 * `QuickQuoteForm`; consolidar quando os dicionários forem acessíveis ao
 * cliente. Ver F2 em docs/TODO.md.
 */
const COPY = {
    pt: {
        notFoundTitle: "Página não encontrada",
        notFoundBody: "O endereço que procura não existe ou foi movido.",
        errorTitle: "Algo correu mal",
        errorBody: "Ocorreu um erro inesperado. Tente novamente dentro de momentos.",
        retry: "Tentar novamente",
        home: "Voltar ao início",
    },
    en: {
        notFoundTitle: "Page not found",
        notFoundBody: "The address you are looking for does not exist or has moved.",
        errorTitle: "Something went wrong",
        errorBody: "An unexpected error occurred. Please try again in a moment.",
        retry: "Try again",
        home: "Back to home",
    },
} as const;

type Variant = "not-found" | "error";

export function ErrorScreen({ variant, reset }: { variant: Variant; reset?: () => void }) {
    // O locale vem do caminho: estes ecrãs não recebem `params` de forma fiável.
    //
    // A página 404 é pré-renderizada em build, onde não há caminho — o HTML sai
    // sempre em `pt`. Derivar o locale durante o render faria o cliente calcular
    // `en` e divergir do servidor, provocando erro de hidratação. Por isso
    // arranca em `pt` (igual ao servidor) e só corrige depois de montar.
    const pathname = usePathname();
    const [locale, setLocale] = useState<"pt" | "en">("pt");

    useEffect(() => {
        if (pathname?.startsWith("/en")) setLocale("en");
    }, [pathname]);

    const t = COPY[locale];

    const isNotFound = variant === "not-found";

    return (
        <main className="flex min-h-screen items-center justify-center bg-white px-6 py-24 text-black">
            <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-black">
                    <span className="text-xl font-bold text-white">W</span>
                </div>

                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
                    {isNotFound ? "404" : "500"}
                </p>

                <h1 className="mb-4 text-3xl font-bold tracking-tight">
                    {isNotFound ? t.notFoundTitle : t.errorTitle}
                </h1>

                <p className="mb-10 leading-relaxed text-gray-600">
                    {isNotFound ? t.notFoundBody : t.errorBody}
                </p>

                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                    {!isNotFound && reset && (
                        <button
                            type="button"
                            onClick={reset}
                            className="w-full rounded-lg bg-black px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-800 sm:w-auto"
                        >
                            {t.retry}
                        </button>
                    )}
                    <Link
                        href={`/${locale}`}
                        className="w-full rounded-lg border border-gray-200 px-6 py-3 font-semibold text-black transition-colors hover:bg-gray-50 sm:w-auto"
                    >
                        {t.home}
                    </Link>
                </div>
            </div>
        </main>
    );
}

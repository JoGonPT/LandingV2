import Link from "next/link";

/**
 * Estava em português fixo — com acentos em falta ("esta pre-reservado",
 * "proximos") e um botão em inglês no meio. Passa a acompanhar o idioma.
 *
 * A copy fica aqui, e não nos dicionários, porque este ramo pertence ao funil
 * de reserva que está desligado (`BookingForm` é órfão). Mover para
 * `src/dictionaries/` quando o funil for religado — ver §6-A em docs/TODO.md.
 */
const COPY = {
    pt: {
        title: "Reserva registada com sucesso",
        body: "O seu transfer está pré-reservado. Verifique o seu email nos próximos minutos para receber o link de pagamento oficial e garantir a sua viagem.",
        cta: "Voltar ao início",
    },
    en: {
        title: "Booking successfully registered",
        body: "Your transfer is pre-booked. Please check your email in the next few minutes for the official payment link to secure your trip.",
        cta: "Back to home",
    },
} as const;

export default async function CheckoutSuccessPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const safeLocale = locale === "en" ? "en" : "pt";
    const t = COPY[safeLocale];

    return (
        <main className="min-h-screen bg-white px-4 py-16">
            <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-neutral-200 p-6 text-center">
                <h1 className="text-2xl font-semibold text-black">{t.title}</h1>
                <p className="text-sm text-neutral-600">{t.body}</p>
                <Link
                    href={`/${safeLocale}/`}
                    className="inline-flex rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white"
                >
                    {t.cta}
                </Link>
            </div>
        </main>
    );
}

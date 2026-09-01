import { notFound } from "next/navigation";

import DestinationPage from "@/components/destinations/DestinationPage";
import { getDictionary } from "@/get-dictionaries";
import { metadataDestino } from "@/lib/cms/destination-routes";
import { listarSlugsPublicados, obterDestino } from "@/lib/cms/destinations";

/**
 * Página de destino em inglês: `/en/transfers/porto/`.
 *
 * A gémea portuguesa vive em `../../transferes/[destino]`. Ver a nota que lá
 * está sobre porque são duas rotas e não uma.
 */

const LOCALE = "en";

interface Props {
    params: Promise<{ locale: string; destino: string }>;
}

export async function generateMetadata({ params }: Props) {
    const { locale, destino } = await params;
    if (locale !== LOCALE) return { title: "Way2Go", robots: { index: false, follow: false } };
    return metadataDestino(destino, LOCALE);
}

export async function generateStaticParams() {
    const slugs = await listarSlugsPublicados();
    return slugs.map((destino) => ({ locale: LOCALE, destino }));
}

export default async function Page({ params }: Props) {
    const { locale, destino: slug } = await params;

    // O endereço inglês só serve conteúdo inglês.
    if (locale !== LOCALE) notFound();

    const [destino, dict] = await Promise.all([
        obterDestino(slug, LOCALE),
        getDictionary(LOCALE),
    ]);

    if (!destino) notFound();

    return <DestinationPage destino={destino} locale={LOCALE} dict={dict as never} />;
}

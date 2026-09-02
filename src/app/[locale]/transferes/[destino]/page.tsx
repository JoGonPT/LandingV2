import { notFound } from "next/navigation";

import DestinationPage from "@/components/destinations/DestinationPage";
import { getDictionary } from "@/get-dictionaries";
import { metadataDestino } from "@/lib/cms/destination-routes";
import { listarSlugsPublicados, obterDestino } from "@/lib/cms/destinations";

/**
 * Página de destino em português: `/pt/transferes/porto/`.
 *
 * A gémea inglesa vive em `../../transfers/[destino]`. São duas rotas de
 * propósito: o segmento traduz-se, e cada uma só aceita o seu idioma, para que
 * `/en/transferes/porto` dê 404 em vez de duplicar a página.
 */

const LOCALE = "pt";

interface Props {
    params: Promise<{ locale: string; destino: string }>;
}

export async function generateMetadata({ params }: Props) {
    const { locale, destino } = await params;
    if (locale !== LOCALE) return { title: "Way2Go", robots: { index: false, follow: false } };
    return metadataDestino(destino, LOCALE);
}

/**
 * Pré-gera os destinos publicados. Se o CMS estiver em baixo devolve lista
 * vazia — o site constrói-se na mesma, apenas sem estas páginas pré-feitas.
 */
export async function generateStaticParams() {
    const slugs = await listarSlugsPublicados();
    return slugs.map((destino) => ({ locale: LOCALE, destino }));
}

export default async function Pagina({ params }: Props) {
    const { locale, destino: slug } = await params;

    // O endereço português só serve conteúdo português.
    if (locale !== LOCALE) notFound();

    const [destino, dict] = await Promise.all([
        obterDestino(slug, LOCALE),
        getDictionary(LOCALE),
    ]);

    if (!destino) notFound();

    return <DestinationPage destino={destino} locale={LOCALE} dict={dict as never} />;
}

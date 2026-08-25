import type { Metadata } from "next";
import { headers } from "next/headers";

import { ComingSoonScreen } from "@/components/ComingSoonScreen";
import { detectComingSoonLanguage } from "@/lib/coming-soon/language";

/**
 * Ecrã público enquanto o site está em preparação.
 *
 * `noindex` de propósito: enquanto o portão estiver ativo, é esta a única
 * página que os motores de busca conseguem alcançar, e não convém que fique
 * indexada como se fosse o site.
 */
export const metadata: Metadata = {
    title: "Way2Go | Em breve",
    description: "O novo site da Way2Go está a chegar.",
    robots: { index: false, follow: false },
};

/**
 * Renderizada a pedido, e é isso que queremos: o idioma sai do `Accept-Language`
 * de quem chega, não do momento do build.
 *
 * Resolver no servidor evita o piscar de quem carrega em português e vê o texto
 * trocar para inglês meio segundo depois.
 */
export const dynamic = "force-dynamic";

export default async function ComingSoonPage() {
    const cabecalhos = await headers();
    return <ComingSoonScreen idiomaInicial={detectComingSoonLanguage(cabecalhos.get("accept-language"))} />;
}

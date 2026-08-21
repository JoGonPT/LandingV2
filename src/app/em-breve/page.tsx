import type { Metadata } from "next";

import { ComingSoonScreen } from "@/components/ComingSoonScreen";

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

export default function ComingSoonPage() {
    return <ComingSoonScreen />;
}

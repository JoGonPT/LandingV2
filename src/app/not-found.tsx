import { ErrorScreen } from "@/components/ErrorScreen";

/**
 * 404 para caminhos fora de `[locale]` — o portal B2B, a PWA de motoristas e
 * as áreas de administração. Sem isto, mostravam o ecrã genérico do Next.
 */
export default function NotFound() {
    return <ErrorScreen variant="not-found" />;
}

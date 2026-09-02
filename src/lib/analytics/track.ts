/**
 * Registo de eventos, sem ferramenta de analytics instalada.
 *
 * O site não tem nenhuma neste momento — procurei `gtag`, `dataLayer`,
 * Plausible, PostHog e Umami, e não existe nada. Mas os botões de conversão
 * precisam de um sítio para onde disparar, e ligar cada botão directamente a
 * uma ferramenta obrigaria a mexer nos botões no dia em que se escolhesse uma.
 *
 * Esta função escreve para as duas convenções mais comuns, se existirem, e
 * cala-se se não existirem. No dia em que instalar Google Analytics, Tag
 * Manager, ou qualquer coisa que ponha um `dataLayer` na página, os eventos
 * começam a chegar sem tocar num único componente.
 *
 * Nunca lança: um erro a contar um clique não pode impedir o clique.
 */

interface JanelaComAnalytics {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
}

export function track(evento: string, propriedades?: Record<string, unknown>): void {
    if (typeof window === "undefined") return;

    const nome = evento.trim();
    if (!nome) return;

    const w = window as unknown as JanelaComAnalytics;

    try {
        // Convenção do Google Tag Manager.
        if (Array.isArray(w.dataLayer)) {
            w.dataLayer.push({ event: nome, ...propriedades });
        }

        // Convenção do Google Analytics 4 sem Tag Manager.
        if (typeof w.gtag === "function") {
            w.gtag("event", nome, propriedades ?? {});
        }
    } catch {
        // Contar cliques é secundário. Se falhar, o clique segue na mesma.
    }
}

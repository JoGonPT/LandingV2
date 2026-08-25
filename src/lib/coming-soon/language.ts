import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

/**
 * Idiomas do ecrã de "Em breve".
 *
 * Cinco, e não os dois do site: quem aterra no Porto ou em Lisboa chega de
 * Espanha, Alemanha e França tanto como de Portugal ou do Reino Unido. Esta
 * lista é só desta página e não tem relação com o `locales` do middleware.
 */
export const COMING_SOON_LANGUAGES = ["pt", "en", "es", "de", "fr"] as const;
export type ComingSoonLang = (typeof COMING_SOON_LANGUAGES)[number];

export const COMING_SOON_FALLBACK: ComingSoonLang = "en";

/**
 * Idioma a partir do cabeçalho `Accept-Language`.
 *
 * Fora dos cinco, **inglês** — serve mais gente do que mostrar português a quem
 * chega de Amesterdão. Só o `pt` é servido em português, e isso é deliberado.
 *
 * Nunca lança: um cabeçalho estranho devolve o idioma de recurso em vez de
 * partir a única página que os visitantes conseguem ver enquanto o portão está
 * ligado.
 */
export function detectComingSoonLanguage(acceptLanguage: string | null | undefined): ComingSoonLang {
    if (!acceptLanguage?.trim()) return COMING_SOON_FALLBACK;

    let pedidos: string[];
    try {
        // O Negotiator devolve ["*"] quando não há preferência declarada —
        // "*" não é um idioma válido e faz o matchLocale rebentar.
        pedidos = new Negotiator({ headers: { "accept-language": acceptLanguage } })
            .languages()
            .filter((l) => l !== "*");
    } catch {
        return COMING_SOON_FALLBACK;
    }

    if (pedidos.length === 0) return COMING_SOON_FALLBACK;

    try {
        return matchLocale(pedidos, [...COMING_SOON_LANGUAGES], COMING_SOON_FALLBACK) as ComingSoonLang;
    } catch {
        return COMING_SOON_FALLBACK;
    }
}

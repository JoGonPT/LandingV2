import { LOCALES } from "@/lib/site";

/**
 * Segmentos de caminho que mudam com o idioma.
 *
 * A maior parte do site usa os mesmos caminhos nos dois idiomas — `legal/terms`
 * é `legal/terms` em português. Os destinos são a excepção: o segmento traduz-se
 * porque é o que decide se a página aparece nas pesquisas.
 *
 * ## Porque isto vive num módulo à parte
 *
 * O `Navbar` é um componente de cliente e precisa desta tabela para o selector
 * de idioma. O módulo dos destinos importa o cliente do CMS, que é
 * `server-only` — importá-lo do Navbar faria falhar o build. Aqui não há nada
 * além de dados e funções puras, e por isso serve os dois lados.
 */
export const SEGMENTO_DESTINO_POR_LOCALE = {
    pt: "transferes",
    en: "transfers",
} as const;

type LocaleComSegmento = keyof typeof SEGMENTO_DESTINO_POR_LOCALE;

const eLocaleComSegmento = (v: string): v is LocaleComSegmento =>
    v in SEGMENTO_DESTINO_POR_LOCALE;

/** O segmento dos destinos no idioma dado, ou `null` se o idioma não existir. */
export function segmentoDestino(locale: string): string | null {
    return eLocaleComSegmento(locale) ? SEGMENTO_DESTINO_POR_LOCALE[locale] : null;
}

/** O caminho relativo de um destino. Ex.: `transferes/porto`. */
export function caminhoDestino(locale: string, slug: string): string | null {
    const segmento = segmentoDestino(locale);
    return segmento ? `${segmento}/${slug}` : null;
}

/** Todos os segmentos traduzíveis, para reconhecer um caminho vindo do browser. */
const TODOS_OS_SEGMENTOS: ReadonlySet<string> = new Set(
    Object.values(SEGMENTO_DESTINO_POR_LOCALE),
);

/**
 * Traduz um caminho para outro idioma.
 *
 * Trocar só o prefixo do idioma não chega. `/pt/transferes/porto/` com o
 * prefixo trocado dá `/en/transferes/porto/`, que devolve **404** — a rota
 * inglesa vive em `transfers`, e o cruzado dá 404 de propósito, para não haver
 * a mesma página em dois endereços.
 *
 * Era este o defeito do selector de idioma: levava quem estivesse numa página
 * de destino direito a uma página que não existe.
 *
 * Caminhos sem segmento traduzível passam intactos, com o prefixo trocado.
 */
export function traduzirCaminho(pathname: string, destino: string): string {
    if (!pathname) return `/${destino}`;

    const partes = pathname.split("/");
    // ["", "pt", "transferes", "porto", ""] — o índice 0 é sempre vazio.
    if (partes.length < 2) return `/${destino}`;

    const origem = partes[1];
    const temLocale = (LOCALES as readonly string[]).includes(origem);

    // A raiz — `/` — chega aqui sem prefixo: o middleware reescreve `/` para o
    // idioma negociado mas o endereço no browser continua a ser `/`. Nesse caso
    // acrescenta-se o prefixo, senão a troca de idioma não faria nada.
    if (!temLocale && origem !== "") {
        // Um primeiro segmento que não é idioma nem vazio não tem tradução
        // segura. Devolve-se o caminho como está, em vez de inventar um.
        return pathname;
    }

    partes[1] = destino;

    const segmentoActual = partes[2];
    if (segmentoActual && TODOS_OS_SEGMENTOS.has(segmentoActual)) {
        const traduzido = segmentoDestino(destino);
        if (traduzido) partes[2] = traduzido;
    }

    return partes.join("/");
}

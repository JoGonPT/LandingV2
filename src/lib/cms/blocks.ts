import { caminhoDestino } from "@/lib/i18n/route-segments";

/**
 * Os blocos que compõem o corpo de um destino.
 *
 * O CMS entrega o texto já convertido para HTML e as chamadas para acção em
 * JSON simples. O site nunca vê Lexical nem importa nada do Payload — é essa a
 * fronteira que mantém as duas aplicações independentes.
 */

export interface BlocoTexto {
    tipo: "texto";
    html: string;
}

export type VarianteCta = "primary" | "secondary" | "outline";
export type AlinhamentoCta = "left" | "center" | "right";

export interface BlocoCta {
    tipo: "cta";
    texto: string;
    subtexto?: string;
    href: string;
    externo: boolean;
    variante: VarianteCta;
    alinhamento: AlinhamentoCta;
    evento?: string;
}

export type Bloco = BlocoTexto | BlocoCta;

/** Número de contacto da Way2Go, o mesmo dos dados estruturados do site. */
const WHATSAPP_OMISSAO = "351913281953";

const texto = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;

const objecto = (v: unknown): Record<string, unknown> | undefined =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;

/** Junta parâmetros a um endereço, respeitando um `?` que já lá esteja. */
function comParametros(href: string, params?: string): string {
    if (!params) return href;
    const limpo = params.replace(/^[?&]+/, "");
    if (!limpo) return href;
    return `${href}${href.includes("?") ? "&" : "?"}${limpo}`;
}

/**
 * O endereço final de uma chamada para acção.
 *
 * Montado aqui e não no CMS de propósito: os caminhos das rotas são traduzidos
 * — `/pt/transferes/…` contra `/en/transfers/…` — e essa tabela vive no site.
 * O CMS diz *para onde*, o site sabe *como lá chegar*.
 *
 * Devolve `null` quando não há endereço possível. Um botão que não leva a lado
 * nenhum é pior do que botão nenhum.
 */
function montarHref(
    b: Record<string, unknown>,
    locale: string,
): { href: string; externo: boolean } | null {
    const tipo = texto(b.linkType) ?? "bookingForm";
    const params = texto(b.customParams);

    if (tipo === "external") {
        const url = texto(b.externalUrl);
        if (!url || !/^https?:\/\//i.test(url)) return null;
        return { href: comParametros(url, params), externo: true };
    }

    if (tipo === "whatsapp") {
        const numero = (texto(b.whatsappNumber) ?? WHATSAPP_OMISSAO).replace(/\D/g, "");
        const mensagem = texto(b.whatsappMessage);
        const href = mensagem
            ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
            : `https://wa.me/${numero}`;
        return { href, externo: true };
    }

    if (tipo === "internal") {
        // A relação pode vir por preencher (só o id) ou já resolvida.
        const doc = objecto(b.internalDoc);
        const slug = texto(doc?.slug);
        if (slug) {
            const caminho = caminhoDestino(locale, slug);
            if (caminho) return { href: comParametros(`/${locale}/${caminho}/`, params), externo: false };
        }

        const manual = texto(b.internalPath);
        if (manual) {
            const limpo = manual.replace(/^\/+|\/+$/g, "");
            return { href: comParametros(`/${locale}/${limpo}/`, params), externo: false };
        }
        return null;
    }

    // `bookingForm`: o formulário está na página inicial, na âncora `#booking`.
    // Os parâmetros vão antes da âncora, senão fazem parte dela e perdem-se.
    const base = comParametros(`/${locale}/`, params);
    return { href: `${base}#booking`, externo: false };
}

const VARIANTES: ReadonlySet<string> = new Set(["primary", "secondary", "outline"]);
const ALINHAMENTOS: ReadonlySet<string> = new Set(["left", "center", "right"]);

/**
 * Converte a lista de blocos do CMS na forma que os componentes desenham.
 *
 * Blocos que não sirvam — texto vazio, botão sem destino — são descartados em
 * vez de renderizados a meio. Nunca lança.
 */
export function normalizarBlocos(bruto: unknown, locale: string): Bloco[] {
    if (!Array.isArray(bruto)) return [];

    const saida: Bloco[] = [];

    for (const item of bruto) {
        const b = objecto(item);
        if (!b) continue;

        if (b.blockType === "richText") {
            const html = texto(b.html);
            if (html) saida.push({ tipo: "texto", html });
            continue;
        }

        if (b.blockType === "callToAction") {
            const rotulo = texto(b.buttonText);
            if (!rotulo) continue;

            const destino = montarHref(b, locale);
            if (!destino) continue;

            const variante = texto(b.variant);
            const alinhamento = texto(b.alignment);

            saida.push({
                tipo: "cta",
                texto: rotulo,
                subtexto: texto(b.subtext),
                href: destino.href,
                externo: destino.externo,
                variante: (variante && VARIANTES.has(variante) ? variante : "primary") as VarianteCta,
                alinhamento: (alinhamento && ALINHAMENTOS.has(alinhamento)
                    ? alinhamento
                    : "center") as AlinhamentoCta,
                evento: texto(b.trackingEvent),
            });
        }
    }

    return saida;
}

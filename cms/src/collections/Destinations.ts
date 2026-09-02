import { convertLexicalToHTML, defaultHTMLConverters } from "@payloadcms/richtext-lexical/html";
import type { CollectionConfig } from "payload";

import { CallToAction } from "../blocks/CallToAction";
import { RichText } from "../blocks/RichText";

/**
 * Converte os blocos de texto rico para HTML, na leitura.
 *
 * ## Porque isto vive no CMS e não no site
 *
 * O texto é guardado no formato do Lexical, que não é HTML. Para o site o
 * desenhar teria de instalar o renderizador do Payload — e isso puxaria o CMS
 * para dentro do site, desfazendo o isolamento que é a razão de ser desta
 * arquitetura.
 *
 * Convertendo aqui, o site recebe uma lista de blocos onde os de texto já
 * trazem HTML pronto e os de acção trazem JSON simples. O site nunca conhece
 * o Payload, e continua a poder desenhar os botões como componentes React de
 * verdade — com o `onClick` do analytics, que HTML injectado não teria.
 *
 * Acrescenta `html` a cada bloco de texto. Não toca nos outros.
 */
function converterBlocos(body: unknown): unknown {
    if (!Array.isArray(body)) return body;

    return body.map((bloco) => {
        if (!bloco || typeof bloco !== "object") return bloco;
        const b = bloco as Record<string, unknown>;
        if (b.blockType !== "richText" || !b.content) return bloco;

        try {
            return {
                ...b,
                html: convertLexicalToHTML({
                    converters: defaultHTMLConverters,
                    data: b.content as never,
                }),
            };
        } catch {
            // Um bloco que não converte não deve derrubar a página inteira:
            // sai vazio, e os restantes seguem.
            return { ...b, html: "" };
        }
    });
}

/**
 * Destinos — uma página por cidade servida.
 *
 * ## Porque é uma coleção e não um global
 *
 * Os globals do site são gavetas fixas: existe um `hero`, um `footer`, e
 * editam-se. Aqui é o contrário — o que interessa é poder acrescentar. Porto
 * hoje, Guimarães amanhã, Braga quando fizer sentido, sem que ninguém toque em
 * código.
 *
 * ## O site ainda não as mostra
 *
 * Nesta fase isto existe só no painel. O site tem cinco páginas públicas, todas
 * fixas, e não tem rota dinâmica — ver `PUBLIC_PATHS` em `src/app/sitemap.ts`.
 * Escrever destinos agora é acumular conteúdo para quando a rota existir; não
 * publica nada.
 *
 * ## Rascunhos ligados de propósito
 *
 * Ao contrário dos globals, isto é para escrever aos poucos. Uma página de
 * cidade meio feita não deve poder aparecer, e quando o site as consumir vai
 * pedir só as publicadas.
 */
export const Destinations: CollectionConfig = {
    slug: "destinations",
    labels: { singular: "Destino", plural: "Destinos" },
    admin: {
        group: "Conteúdo",
        useAsTitle: "title",
        defaultColumns: ["title", "slug", "_status", "updatedAt"],
        description: "Uma página por cidade. Ainda não são visíveis no site.",
    },
    versions: { drafts: true },
    hooks: {
        afterRead: [
            ({ doc }) => {
                const d = doc as Record<string, unknown>;
                return { ...d, body: converterBlocos(d.body) };
            },
        ],
    },
    fields: [
        {
            name: "slug",
            type: "text",
            label: "Endereço (slug)",
            required: true,
            unique: true,
            index: true,
            admin: {
                position: "sidebar",
                description:
                    "O que aparece no URL: «porto» dá /pt/transferes/porto. Minúsculas, sem acentos nem espaços. Mudar isto depois de a página estar indexada parte as ligações.",
            },
        },
        {
            name: "title",
            type: "text",
            label: "Título da página",
            localized: true,
            required: true,
            admin: { description: "O título grande no topo. Ex.: «Transfer Aeroporto do Porto → Guimarães»." },
        },
        {
            name: "city",
            type: "text",
            label: "Cidade",
            localized: true,
            admin: { description: "O nome só por si, para listagens e migalhas. Ex.: «Guimarães»." },
        },
        {
            name: "subtitle",
            type: "textarea",
            label: "Subtítulo",
            localized: true,
        },
        {
            name: "image",
            type: "upload",
            relationTo: "media",
            label: "Imagem principal",
            admin: {
                description:
                    "A fotografia do topo. Não é localizada — a mesma serve os dois idiomas; o texto alternativo é que muda, e esse vive na imagem.",
            },
        },
        {
            name: "summary",
            type: "textarea",
            label: "Resumo",
            localized: true,
            admin: { description: "Duas ou três linhas, para cartões e listagens. Não é a meta-descrição." },
        },
        {
            name: "body",
            type: "blocks",
            label: "Corpo da página",
            blocks: [RichText, CallToAction],
            admin: {
                description:
                    "O conteúdo próprio deste destino, em blocos. Intercale chamadas para acção onde fizerem sentido — um botão logo a seguir ao parágrafo que explica porque compensa vale mais do que o mesmo botão no fim da página. Texto genérico com o nome trocado não serve: o Google trata páginas assim como páginas-porta.",
            },
        },
        {
            name: "highlights",
            type: "array",
            label: "Pontos a destacar",
            localized: true,
            admin: { initCollapsed: true, description: "Frases curtas. Ex.: «Motorista espera 60 minutos sem custo»." },
            fields: [{ name: "text", type: "text", label: "Ponto", required: true }],
        },
        {
            name: "airport",
            type: "group",
            label: "Aeroporto",
            admin: {
                description:
                    "Aparece no cartão da página inicial, por baixo do nome da cidade. Não confundir com a origem da rota, aqui em baixo, que é a morada completa de recolha.",
            },
            fields: [
                {
                    name: "name",
                    type: "text",
                    label: "Nome do aeroporto",
                    localized: true,
                    admin: { description: "Ex.: «Aeroporto Francisco Sá Carneiro»." },
                },
                {
                    name: "code",
                    type: "text",
                    label: "Código IATA",
                    maxLength: 4,
                    admin: {
                        description:
                            "As três letras: OPO, LIS, FAO. Não é traduzido — é o mesmo em qualquer idioma.",
                    },
                },
            ],
        },
        {
            name: "order",
            type: "number",
            label: "Ordem",
            defaultValue: 100,
            admin: {
                position: "sidebar",
                description:
                    "Decide a posição do cartão na página inicial: os números mais baixos aparecem primeiro. Deixando tudo igual, ordena-se por nome.",
            },
        },
        {
            name: "route",
            type: "group",
            label: "Dados da rota",
            admin: {
                description:
                    "Valores indicativos, para o visitante saber o que esperar. Não alimentam o motor de preços — esse continua a ser o TransferCRM.",
            },
            fields: [
                { name: "origin", type: "text", label: "Origem", localized: true, admin: { description: "Ex.: «Aeroporto Francisco Sá Carneiro (OPO)»." } },
                { name: "distanceKm", type: "number", label: "Distância (km)", min: 0 },
                { name: "durationMin", type: "number", label: "Duração (minutos)", min: 0 },
                { name: "priceFrom", type: "number", label: "Preço desde (€)", min: 0, admin: { description: "Só indicativo. O preço real vem sempre do orçamento." } },
            ],
        },
        {
            name: "faq",
            type: "array",
            label: "Perguntas frequentes deste destino",
            localized: true,
            admin: { initCollapsed: true, description: "Específicas desta rota. As gerais estão no global «FAQ»." },
            fields: [
                { name: "question", type: "text", label: "Pergunta", required: true },
                { name: "answer", type: "textarea", label: "Resposta", required: true },
            ],
        },
        {
            name: "seo",
            type: "group",
            label: "SEO",
            localized: true,
            admin: { description: "O que o Google mostra nos resultados. Se ficar vazio, usa-se o título e o resumo." },
            fields: [
                { name: "title", type: "text", label: "Título nos resultados", maxLength: 60 },
                { name: "description", type: "textarea", label: "Descrição nos resultados", maxLength: 160 },
            ],
        },
    ],
};

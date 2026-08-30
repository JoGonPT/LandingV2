import type { CollectionConfig } from "payload";

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
            name: "summary",
            type: "textarea",
            label: "Resumo",
            localized: true,
            admin: { description: "Duas ou três linhas, para cartões e listagens. Não é a meta-descrição." },
        },
        {
            name: "body",
            type: "richText",
            label: "Texto da página",
            localized: true,
            admin: {
                description:
                    "O conteúdo próprio deste destino: o que há para ver, particularidades da recolha, o que distingue esta rota. Texto genérico com o nome trocado não serve — o Google trata páginas assim como páginas-porta.",
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

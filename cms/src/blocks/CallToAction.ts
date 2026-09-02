import type { Block } from "payload";

/**
 * Bloco de chamada para acção.
 *
 * Insere-se em qualquer ponto do corpo de um destino, entre blocos de texto.
 * O objectivo é converter: um botão a meio de uma secção que acabou de
 * explicar porque é que o transfer compensa vale mais do que o mesmo botão no
 * fim da página.
 *
 * ## O que o site recebe
 *
 * JSON simples — texto, tipo de ligação, variante. O endereço final é montado
 * no site, não aqui: assim o CMS não precisa de saber os caminhos das rotas,
 * que são traduzidos (`/pt/transferes/…` contra `/en/transfers/…`) e vivem em
 * `src/lib/i18n/route-segments.ts`.
 */
export const CallToAction: Block = {
    slug: "callToAction",
    labels: { singular: "Chamada para acção", plural: "Chamadas para acção" },
    imageAltText: "Botão de conversão",
    fields: [
        {
            name: "buttonText",
            type: "text",
            label: "Texto do botão",
            required: true,
            localized: true,
            admin: {
                description:
                    "Diga o que acontece ao carregar. «Reservar transfer para o Porto» converte mais do que «Saber mais».",
            },
        },
        {
            name: "subtext",
            type: "text",
            label: "Texto de apoio",
            localized: true,
            admin: {
                description:
                    "Linha pequena por baixo do botão, para tirar receio. Ex.: «Confirmação imediata · Cancelamento gratuito até 24h».",
            },
        },
        {
            name: "linkType",
            type: "select",
            label: "Para onde leva",
            required: true,
            defaultValue: "bookingForm",
            options: [
                { label: "Formulário de reserva (nesta mesma página)", value: "bookingForm" },
                { label: "Outro destino do site", value: "internal" },
                { label: "Endereço externo", value: "external" },
                { label: "WhatsApp", value: "whatsapp" },
            ],
        },
        {
            name: "internalDoc",
            type: "relationship",
            relationTo: "destinations",
            label: "Destino",
            admin: {
                condition: (_, irmaos) => irmaos?.linkType === "internal",
                description:
                    "Só existem destinos por agora. Para as páginas fixas — inicial, legais — use o campo de caminho abaixo.",
            },
        },
        {
            name: "internalPath",
            type: "text",
            label: "Ou um caminho do site",
            admin: {
                condition: (_, irmaos) => irmaos?.linkType === "internal",
                description:
                    "Sem o idioma à frente: escreva «legal/terms» e não «/pt/legal/terms». O idioma é acrescentado automaticamente. Ignorado se escolher um destino acima.",
            },
        },
        {
            name: "externalUrl",
            type: "text",
            label: "Endereço externo",
            admin: {
                condition: (_, irmaos) => irmaos?.linkType === "external",
                description: "Endereço completo, com https://. Abre em separador novo.",
            },
        },
        {
            name: "whatsappMessage",
            type: "text",
            label: "Mensagem pré-escrita",
            localized: true,
            admin: {
                condition: (_, irmaos) => irmaos?.linkType === "whatsapp",
                description:
                    "Aparece já escrita na conversa. Ex.: «Olá, queria um transfer do aeroporto para Guimarães». Deixando vazio, abre a conversa em branco.",
            },
        },
        {
            name: "customParams",
            type: "text",
            label: "Parâmetros no endereço",
            admin: {
                description:
                    "Acrescentado ao endereço final, para o formulário ou o analytics saberem de onde veio. Ex.: «service=porto-transfer». Sem o ponto de interrogação.",
            },
        },
        {
            type: "row",
            fields: [
                {
                    name: "variant",
                    type: "select",
                    label: "Estilo",
                    required: true,
                    defaultValue: "primary",
                    options: [
                        { label: "Principal (dourado)", value: "primary" },
                        { label: "Secundário (escuro)", value: "secondary" },
                        { label: "Contorno", value: "outline" },
                    ],
                    admin: { width: "50%" },
                },
                {
                    name: "alignment",
                    type: "select",
                    label: "Alinhamento",
                    required: true,
                    defaultValue: "center",
                    options: [
                        { label: "Esquerda", value: "left" },
                        { label: "Centro", value: "center" },
                        { label: "Direita", value: "right" },
                    ],
                    admin: { width: "50%" },
                },
            ],
        },
        {
            name: "trackingEvent",
            type: "text",
            label: "Nome do evento",
            admin: {
                description:
                    "Para contar os cliques. Ex.: «click_cta_porto». Use minúsculas e underscores, e o mesmo nome para o mesmo botão em páginas diferentes, senão os números não se somam.",
            },
        },
    ],
};

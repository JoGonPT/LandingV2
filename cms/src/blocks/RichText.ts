import type { Block } from "payload";

/**
 * Um bloco de texto rico.
 *
 * O corpo de um destino é uma lista de blocos, e este é o que carrega a prosa.
 * Existir como bloco — em vez de o corpo ser um único campo de texto — é o que
 * permite intercalar chamadas para acção a meio do conteúdo.
 *
 * O site recebe HTML, não Lexical: a conversão acontece no CMS, num hook da
 * coleção. Ver a nota em `src/collections/Destinations.ts`.
 */
export const RichText: Block = {
    slug: "richText",
    labels: { singular: "Texto", plural: "Blocos de texto" },
    imageAltText: "Bloco de texto",
    fields: [
        {
            name: "content",
            type: "richText",
            label: "Texto",
            localized: true,
            required: true,
        },
    ],
};

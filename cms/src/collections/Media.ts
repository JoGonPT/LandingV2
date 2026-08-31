import path from "node:path";
import { fileURLToPath } from "node:url";

import type { CollectionConfig } from "payload";

const AQUI = path.dirname(fileURLToPath(import.meta.url));

/** WebP a 80. É o compromisso habitual: perde-se o que ninguém vê, poupa-se metade. */
const WEBP = { format: "webp", options: { quality: 80 } } as const;

/**
 * Imagens do site.
 *
 * ## O que acontece quando alguém carrega uma fotografia
 *
 * O `sharp` converte o original para WebP e gera três larguras. Quem escreve
 * arrasta o ficheiro que tem — mesmo os 6 MB que saem do telemóvel — e não
 * precisa de saber o que é compressão. É esse o ponto: uma regra que depende de
 * alguém se lembrar de optimizar à mão é uma regra que se perde.
 *
 * ## Onde ficam os ficheiros
 *
 * Em `cms/media/`, no disco do servidor que aloja o CMS. Duas consequências que
 * não se podem esquecer:
 *
 * 1. **Não estão na base de dados.** O backup do Postgres não os apanha. Têm de
 *    entrar na rotina de cópias do alojamento, ou perdem-se sem aviso.
 * 2. **Exigem disco persistente.** Funciona no Webtuga ou no Cloudways. Não
 *    funcionaria em serverless, onde o disco desaparece entre pedidos.
 */
export const Media: CollectionConfig = {
    slug: "media",
    labels: { singular: "Imagem", plural: "Imagens" },
    admin: {
        group: "Conteúdo",
        useAsTitle: "alt",
        defaultColumns: ["alt", "filename", "updatedAt"],
        description: "Fotografias do site. São convertidas e redimensionadas ao carregar.",
    },
    upload: {
        staticDir: path.resolve(AQUI, "../../media"),
        // Só imagens. Um PDF ou um vídeo aqui dentro passaria pelo `sharp` e
        // falhava de forma pouco clara.
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
        // Permite escolher no painel que parte da imagem nunca deve ser cortada.
        // Sem isto, um recorte para cartão corta cabeças.
        focalPoint: true,
        // O original também é convertido: não se serve um JPEG de 6 MB a ninguém.
        formatOptions: WEBP,
        imageSizes: [
            { name: "miniatura", width: 400, formatOptions: WEBP },
            { name: "movel", width: 768, formatOptions: WEBP },
            { name: "destaque", width: 1600, formatOptions: WEBP },
        ],
    },
    fields: [
        {
            name: "alt",
            type: "text",
            label: "Texto alternativo",
            required: true,
            localized: true,
            admin: {
                description:
                    "Descreve a imagem para quem não a vê — leitores de ecrã e o Google. «Ponte D. Luís ao fim da tarde», não «foto1». É obrigatório de propósito.",
            },
        },
        {
            name: "credit",
            type: "text",
            label: "Crédito",
            admin: { description: "Autor ou origem, se a licença o exigir." },
        },
    ],
};

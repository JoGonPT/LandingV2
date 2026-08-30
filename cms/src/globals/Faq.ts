import type { GlobalConfig } from "payload";

/**
 * As perguntas frequentes.
 *
 * O array é `localized`, e não os campos lá dentro: assim cada idioma tem o seu
 * próprio conjunto de perguntas. Se um dia o inglês precisar de uma pergunta que
 * o português não tem — ou de as ter por outra ordem — não é preciso mudar nada.
 */
export const Faq: GlobalConfig = {
    slug: "faq",
    label: "FAQ",
    admin: {
        group: "Textos do site",
        description: "Título da secção e as perguntas frequentes.",
    },
    fields: [
        { name: "title", type: "text", label: "Título da secção", localized: true },
        {
            name: "items",
            type: "array",
            label: "Perguntas",
            localized: true,
            admin: { initCollapsed: true },
            fields: [
                { name: "question", type: "text", label: "Pergunta", required: true },
                { name: "answer", type: "textarea", label: "Resposta", required: true },
            ],
        },
    ],
};

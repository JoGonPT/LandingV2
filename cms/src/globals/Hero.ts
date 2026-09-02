import type { GlobalConfig } from "payload";

/**
 * O bloco de topo da página inicial — a primeira coisa que se lê no site.
 */
export const Hero: GlobalConfig = {
    slug: "hero",
    label: "Hero",
    admin: {
        group: "Textos do site",
        description: "O bloco de topo da página inicial.",
    },
    fields: [
        { name: "badge", type: "text", label: "Etiqueta", localized: true },
        { name: "title", type: "text", label: "Título", localized: true },
        { name: "subtitle", type: "textarea", label: "Subtítulo", localized: true },
        { name: "cta", type: "text", label: "Botão de acção", localized: true },
    ],
};

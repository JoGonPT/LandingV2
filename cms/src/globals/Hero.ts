import type { GlobalConfig } from "payload";

import { apenasSite, ninguemEscrevePorAPI } from "../access/consumidores";

/**
 * O bloco de topo da página inicial — a primeira coisa que se lê no site.
 */
export const Hero: GlobalConfig = {
    slug: "hero",
    /**
     * Estes globals espelham os dicionarios do site institucional. A chave da
     * aplicacao de reservas nao os le -- tem o seu proprio conteudo, e misturar
     * os dois seria repetir o erro de ter a mesma frase escrita em dois sitios.
     */
    access: {
        read: apenasSite,
        update: ninguemEscrevePorAPI,
    },
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

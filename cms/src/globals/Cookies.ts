import type { GlobalConfig } from "payload";

import { apenasSite, ninguemEscrevePorAPI } from "../access/consumidores";

/**
 * O banner de cookies. Quatro textos, e os dois botões que decidem o
 * consentimento — convém que digam exactamente o que fazem.
 */
export const Cookies: GlobalConfig = {
    slug: "cookies",
    /**
     * Estes globals espelham os dicionarios do site institucional. A chave da
     * aplicacao de reservas nao os le -- tem o seu proprio conteudo, e misturar
     * os dois seria repetir o erro de ter a mesma frase escrita em dois sitios.
     */
    access: {
        read: apenasSite,
        update: ninguemEscrevePorAPI,
    },
    label: "Banner de cookies",
    admin: {
        group: "Textos do site",
        description: "O aviso de cookies e os seus dois botões.",
    },
    fields: [
        { name: "text", type: "textarea", label: "Texto do aviso", localized: true },
        { name: "policy", type: "text", label: "Ligação para a política", localized: true },
        { name: "accept", type: "text", label: "Botão «Aceitar»", localized: true },
        { name: "reject", type: "text", label: "Botão «Rejeitar»", localized: true },
    ],
};

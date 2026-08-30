import type { GlobalConfig } from "payload";

/**
 * O banner de cookies. Quatro textos, e os dois botões que decidem o
 * consentimento — convém que digam exactamente o que fazem.
 */
export const Cookies: GlobalConfig = {
    slug: "cookies",
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

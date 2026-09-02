import type { GlobalConfig } from "payload";

/**
 * O rodapé. Onze rótulos, incluindo os títulos das colunas e o texto curto
 * sobre a empresa.
 */
export const Footer: GlobalConfig = {
    slug: "footer",
    label: "Rodapé",
    admin: {
        group: "Textos do site",
        description: "Títulos das colunas e ligações do rodapé.",
    },
    fields: [
        { name: "contacts", type: "text", label: "Contactos", localized: true },
        { name: "legal", type: "text", label: "Legal", localized: true },
        { name: "privacy", type: "text", label: "Privacidade", localized: true },
        { name: "terms", type: "text", label: "Termos", localized: true },
        { name: "cookies", type: "text", label: "Cookies", localized: true },
        { name: "about", type: "text", label: "Sobre", localized: true },
        { name: "aboutText", type: "textarea", label: "Texto do «Sobre»", localized: true },
        { name: "explore", type: "text", label: "Explorar", localized: true },
        { name: "airportTransfers", type: "text", label: "Transferes de aeroporto", localized: true },
        { name: "byTheHour", type: "text", label: "Ao serviço", localized: true },
        { name: "copyright", type: "text", label: "Direitos de autor", localized: true },
    ],
};

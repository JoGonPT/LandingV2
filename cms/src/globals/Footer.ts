import type { GlobalConfig } from "payload";

import { apenasSite, ninguemEscrevePorAPI } from "../access/consumidores";

/**
 * O rodapé. Onze rótulos, incluindo os títulos das colunas e o texto curto
 * sobre a empresa.
 */
export const Footer: GlobalConfig = {
    slug: "footer",
    /**
     * Estes globals espelham os dicionarios do site institucional. A chave da
     * aplicacao de reservas nao os le -- tem o seu proprio conteudo, e misturar
     * os dois seria repetir o erro de ter a mesma frase escrita em dois sitios.
     */
    access: {
        read: apenasSite,
        update: ninguemEscrevePorAPI,
    },
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

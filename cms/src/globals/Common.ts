import type { GlobalConfig } from "payload";

/**
 * Rótulos que aparecem em várias páginas — navegação, estados de carregamento,
 * o aviso de direitos de autor.
 *
 * Os nomes dos campos são deliberadamente iguais às chaves de
 * `src/dictionaries/pt.json`. Não é preciosismo: mantém a forma dos dados, para
 * que ligar o site ao CMS não obrigue a tocar num único componente.
 */
export const Common: GlobalConfig = {
    slug: "common",
    label: "Comuns",
    admin: {
        group: "Textos do site",
        description: "Rótulos partilhados por várias páginas.",
    },
    fields: [
        { name: "back", type: "text", label: "Voltar", localized: true },
        { name: "reserve", type: "text", label: "Reservar", localized: true },
        { name: "faq", type: "text", label: "FAQ", localized: true },
        { name: "privacy", type: "text", label: "Privacidade", localized: true },
        { name: "contact", type: "text", label: "Contacto", localized: true },
        { name: "loading", type: "text", label: "A carregar", localized: true },
        { name: "copyright", type: "text", label: "Direitos de autor", localized: true },
    ],
};

import type { Field, GlobalConfig } from "payload";

/**
 * Os três documentos legais: privacidade, termos e política de cookies.
 *
 * ## Porque isto é mais feio do que o resto
 *
 * As secções legais não têm todas a mesma forma. Nos dados reais aparecem sete
 * combinações diferentes de campos — `title+content`, `title+list`,
 * `title+content+list`, `title+content+subsections`, `title+content+list+footer`,
 * `title+content+list+afterList` e `title+content+subsections+afterList`.
 *
 * A tentação seria arrumar isto num campo de texto rico e acabar com o assunto.
 * Seria melhor de editar — e mudaria a forma dos dados, obrigando a reescrever
 * o renderizador em `src/app/[locale]/legal/privacy/page.tsx`, que hoje percorre
 * esta estrutura protegendo cada campo opcional. Como esta fase não toca no
 * site, o modelo segue os dados tal como eles são.
 *
 * Fica registado para quem vier a seguir: se editar texto legal passar a ser
 * frequente, o texto rico é a mudança certa a fazer — e o custo dela é o
 * renderizador, não os dados.
 *
 * ## Listas de texto
 *
 * `intro`, `list` e `subsections[].list` são arrays de strings. Um campo `array`
 * do Payload envolveria cada linha num objecto e daria `{texto: string}[]`, o
 * que quebraria a forma. Um `text` com `hasMany` guarda `string[]` directamente.
 */

/** Sub-secção numerada (ex.: «A. Execução Contratual», «4.2. Serviços Adicionais»). */
const subsecoes: Field = {
    name: "subsections",
    type: "array",
    label: "Sub-secções",
    admin: { initCollapsed: true },
    fields: [
        { name: "title", type: "text", label: "Título", required: true },
        { name: "list", type: "text", hasMany: true, label: "Pontos" },
        {
            name: "legalBasis",
            type: "text",
            label: "Base legal",
            admin: { description: "Usado na política de privacidade. Deixar vazio nos termos." },
        },
    ],
};

/**
 * A forma de uma secção. Todos os campos além do título são opcionais, porque
 * nos dados reais cada secção usa um subconjunto diferente.
 */
const seccoes = (label: string): Field => ({
    name: "sections",
    type: "array",
    label,
    admin: { initCollapsed: true },
    fields: [
        { name: "title", type: "text", label: "Título", required: true },
        { name: "content", type: "textarea", label: "Texto" },
        { name: "list", type: "text", hasMany: true, label: "Pontos" },
        subsecoes,
        { name: "afterList", type: "textarea", label: "Texto depois da lista" },
        { name: "footer", type: "textarea", label: "Nota final" },
    ],
});

export const Legal: GlobalConfig = {
    slug: "legal",
    label: "Documentos legais",
    admin: {
        group: "Textos do site",
        description: "Privacidade, termos e cookies. Alterar com cuidado — são documentos vinculativos.",
    },
    fields: [
        {
            name: "privacy",
            type: "group",
            label: "Política de Privacidade",
            localized: true,
            fields: [
                { name: "title", type: "text", label: "Título" },
                {
                    name: "updated",
                    type: "text",
                    label: "Data de actualização",
                    admin: { description: "Texto livre, como aparece na página. Ex.: «Última atualização: Maio de 2026»." },
                },
                {
                    name: "intro",
                    type: "text",
                    hasMany: true,
                    label: "Parágrafos introdutórios",
                    admin: {
                        description:
                            "Um parágrafo por linha. É um campo de linha única porque `hasMany` só existe em `text` — guardar como array de strings mantém a forma que a página já lê.",
                    },
                },
                seccoes("Secções"),
            ],
        },
        {
            name: "terms",
            type: "group",
            label: "Termos e Condições",
            localized: true,
            fields: [
                { name: "title", type: "text", label: "Título" },
                { name: "updated", type: "text", label: "Data de actualização" },
                {
                    name: "intro",
                    type: "text",
                    hasMany: true,
                    label: "Parágrafos introdutórios",
                    admin: {
                        description:
                            "Um parágrafo por linha. É um campo de linha única porque `hasMany` só existe em `text` — guardar como array de strings mantém a forma que a página já lê.",
                    },
                },
                {
                    name: "parts",
                    type: "array",
                    label: "Partes",
                    admin: {
                        initCollapsed: true,
                        description: "Os termos estão divididos em partes, cada uma com as suas secções.",
                    },
                    fields: [
                        { name: "title", type: "text", label: "Título da parte", required: true },
                        seccoes("Secções desta parte"),
                    ],
                },
            ],
        },
        {
            name: "cookies",
            type: "group",
            label: "Política de Cookies",
            localized: true,
            fields: [
                { name: "title", type: "text", label: "Título" },
                { name: "updated", type: "text", label: "Data de actualização" },
                {
                    name: "sections",
                    type: "array",
                    label: "Secções",
                    admin: { initCollapsed: true },
                    fields: [
                        { name: "title", type: "text", label: "Título", required: true },
                        { name: "content", type: "textarea", label: "Texto" },
                    ],
                },
            ],
        },
    ],
};

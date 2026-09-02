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
 * ## Listas de texto, e porque são de duas formas diferentes
 *
 * Nos dicionários, `intro` e `list` são ambos `string[]`. Aqui não são, e a
 * diferença não é arbitrária — foi medida.
 *
 * O `intro` usa `text` com `hasMany`, que guarda `string[]` directamente e
 * mantém a forma original. Funciona porque está ao nível do grupo.
 *
 * O `list` **não pode** usar `hasMany`, porque está dentro de arrays. Nessa
 * posição o Payload 3.88 grava bem e lê mal: os valores vão parar às posições
 * erradas do array, ou desaparecem. Verificado contra a base de dados — os
 * caminhos gravados (`privacy.sections.1.list`, com as suas cinco linhas) estão
 * correctos, e `findGlobal` devolve zero para eles enquanto inventa uma lista
 * para uma secção que não tem nenhuma.
 *
 * Por isso o `list` é um `array` com um campo `valor`. Custa a tradução
 * `string[] ⇄ [{valor}]` na fronteira — está no importador, e terá de estar no
 * adaptador que ligar o site. É o preço de uma leitura que funciona.
 */

/**
 * Os pontos de uma lista. Ver a nota sobre listas no topo do ficheiro: dentro de
 * um array isto não pode ser `text` com `hasMany`.
 */
const listaDeTextos = (name: string, label: string): Field => ({
    name,
    type: "array",
    label,
    admin: { initCollapsed: true },
    fields: [{ name: "valor", type: "textarea", label: "Texto", required: true }],
});

/**
 * Sub-secção numerada (ex.: «A. Execução Contratual», «4.2. Serviços Adicionais»).
 *
 * É uma função, e não uma constante partilhada, de propósito: o Payload muta as
 * configurações de campo quando as sanitiza, anotando-lhes o caminho e o pai.
 * Reutilizar o mesmo objecto em três sítios dava a todos o caminho do último a
 * ser processado.
 */
const subsecoes = (): Field => ({
    name: "subsections",
    type: "array",
    label: "Sub-secções",
    admin: { initCollapsed: true },
    fields: [
        { name: "title", type: "text", label: "Título", required: true },
        listaDeTextos("list", "Pontos"),
        {
            name: "legalBasis",
            type: "text",
            label: "Base legal",
            admin: { description: "Usado na política de privacidade. Deixar vazio nos termos." },
        },
    ],
});

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
        listaDeTextos("list", "Pontos"),
        subsecoes(),
        listaDeTextos("afterList", "Texto depois da lista"),
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

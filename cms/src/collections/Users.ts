import type { CollectionConfig } from "payload";

import { apenasPainel } from "../access/consumidores";

/**
 * Utilizadores do CMS.
 *
 * Nesta fase existe só para haver com quem entrar no painel. **Não tem relação
 * com nenhuma das autenticações do site** — nem com a password única do
 * `master-admin`, nem com o slug e segredo dos parceiros, nem com o Supabase
 * Auth dos motoristas. São sistemas separados, em bases de dados separadas
 * (schema `payload` contra schema `public`), e assim devem ficar até alguém
 * decidir o contrário com conhecimento de causa.
 *
 * O Payload trata do hash da password e das sessões.
 */
export const Users: CollectionConfig = {
    slug: "users",
    /**
     * `useAPIKey` acrescenta a cada utilizador uma chave para acesso máquina a
     * máquina. É assim que o site lê os destinos sem que o CMS tenha de abrir a
     * leitura a toda a gente.
     *
     * Consequência a saber: a chave pertence a um utilizador, e esse utilizador
     * é um utilizador do painel como os outros. O que serve o site é criado sem
     * password utilizável — não há forma de entrar com ele — mas existe na
     * lista, e apagá-lo por engano corta o conteúdo do site.
     */
    auth: { useAPIKey: true },
    /**
     * A leitura fica fechada a pessoas do painel.
     *
     * Esta e a colecao onde vivem as chaves de API. Com o comportamento por
     * omissao do Payload, uma chave podia ler as outras -- e a razao de haver
     * chaves separadas e poder revogar uma sem cortar a outra.
     */
    access: {
        read: apenasPainel,
        create: apenasPainel,
        update: apenasPainel,
        delete: apenasPainel,
    },
    admin: {
        useAsTitle: "email",
        defaultColumns: ["email", "name", "updatedAt"],
    },
    fields: [
        {
            name: "name",
            type: "text",
            label: "Nome",
        },
        {
            /**
             * Quem e este utilizador, para efeitos de acesso.
             *
             * Sem valor significa pessoa do painel -- e o que os utilizadores
             * antigos sao, e e por isso que esta alteracao nao parte nada do que
             * ja existe. Uma chave de maquina tem de ser marcada de proposito.
             */
            name: "consumer",
            type: "select",
            label: "Tipo de acesso",
            defaultValue: "painel",
            options: [
                { label: "Pessoa (painel)", value: "painel" },
                { label: "Chave do site institucional", value: "site" },
                { label: "Chave da aplicacao de reservas", value: "app" },
            ],
            admin: {
                position: "sidebar",
                description:
                    "As chaves de maquina nao entram no painel e leem apenas o que lhes diz respeito. Uma chave marcada como «site» nao le o conteudo da aplicacao, e vice-versa.",
            },
        },
    ],
};

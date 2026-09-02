import type { CollectionConfig } from "payload";

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
    ],
};

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
    auth: true,
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

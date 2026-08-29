import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { en } from "@payloadcms/translations/languages/en";
import { pt } from "@payloadcms/translations/languages/pt";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Users } from "./src/collections/Users";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Configuração do CMS da Way2Go.
 *
 * ## Porque isto vive numa aplicação separada
 *
 * O `@payloadcms/next` não suporta o Next 15.5 do site — aceita 15.2.9–15.4.x e
 * depois só 16.2.6+, e a versão do site cai no buraco entre os dois. Verificado
 * nas últimas seis versões estáveis: é a matriz de suporte, não um descuido.
 *
 * Como o CMS é um projeto npm independente, corre Next 16.3.3 sem que o site
 * tenha de mudar de versão. As rotas ficam nas omissões `/admin` e `/api`
 * porque, numa aplicação própria, não há as 45 rotas do site com que colidir.
 *
 * ## O schema
 *
 * `schemaName: "payload"` mantém as tabelas do CMS fora do `public`, onde vivem
 * as 41 tabelas do site — reservas, pagamentos, parceiros, credenciais. Duas
 * consequências que valem a pena registar:
 *
 * 1. **Isolamento por construção.** O PostgREST do Supabase só expõe os schemas
 *    que estão na sua configuração. Um schema fora dessa lista é inalcançável
 *    pela chave anónima sem depender de RLS.
 * 2. **A opção está marcada como experimental** na documentação do adaptador.
 *    Daí a regra: gerar a migração, ler o ficheiro, e confirmar que todos os
 *    objetos vão para `payload` antes de a correr.
 */
export default buildConfig({
    admin: {
        user: Users.slug,
    },
    collections: [Users],
    editor: lexicalEditor(),
    db: postgresAdapter({
        // Marcada como experimental no adaptador. Ver a nota acima.
        schemaName: "payload",
        pool: {
            connectionString: process.env.DATABASE_URL ?? "",
        },
    }),
    // Assina os tokens de sessão do painel. Sem valor por omissão de propósito:
    // um segredo previsível é pior do que um arranque que falha a dizer porquê.
    secret: process.env.PAYLOAD_SECRET ?? "",
    typescript: {
        outputFile: path.resolve(dirname, "src/payload-types.ts"),
    },
    // Painel em português, com inglês disponível — os dois idiomas que o site
    // já fala. Não confundir com a localização de conteúdo, que é outra coisa e
    // fica para uma fase posterior.
    i18n: {
        supportedLanguages: { pt, en },
        fallbackLanguage: "pt",
    },
    // O Payload usa o sharp para redimensionar imagens carregadas. Ainda não há
    // coleção de media, mas passá-lo agora evita a surpresa de o primeiro upload
    // falhar por uma dependência que já estava instalada e não estava ligada.
    sharp,
});

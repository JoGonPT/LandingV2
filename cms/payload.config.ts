import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { nodemailerAdapter } from "@payloadcms/email-nodemailer";
import { resendAdapter } from "@payloadcms/email-resend";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { en } from "@payloadcms/translations/languages/en";
import { pt } from "@payloadcms/translations/languages/pt";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Destinations } from "./src/collections/Destinations";
import { Media } from "./src/collections/Media";
import { Users } from "./src/collections/Users";
import { Booking } from "./src/globals/Booking";
import { Common } from "./src/globals/Common";
import { Cookies } from "./src/globals/Cookies";
import { Faq } from "./src/globals/Faq";
import { Footer } from "./src/globals/Footer";
import { Hero } from "./src/globals/Hero";
import { Legal } from "./src/globals/Legal";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const env = (nome: string) => process.env[nome]?.trim() || undefined;

/**
 * O endereço público do painel.
 *
 * Serve para as ligações absolutas nos emails de recuperação de password. Sem
 * ele, atrás do proxy da Vercel, saem endereços errados — e um link de
 * recuperação errado só se descobre quando alguém precisa dele a sério.
 *
 * O `VERCEL_URL` é a alternativa automática para as pré-visualizações, que têm
 * endereço diferente a cada deploy.
 */
const serverURL =
    env("PAYLOAD_PUBLIC_SERVER_URL") ??
    (env("VERCEL_URL") ? `https://${env("VERCEL_URL")}` : undefined);

/**
 * Envio de email.
 *
 * Sem isto, o Payload escreve os emails na consola e **a recuperação de
 * password deixa de funcionar** — irrelevante em desenvolvimento, e em
 * produção significa poder ficar fechado de fora sem forma de voltar a entrar.
 *
 * ## Porque há dois caminhos
 *
 * O Resend é o escolhido. Ao preparar isto descobriu-se que as variáveis SMTP
 * do site existem na Vercel há 98 dias **com os valores vazios**, e que não há
 * Resend nem SendGrid configurados: o site não consegue enviar email nenhum.
 * Não havia portanto credenciais para reaproveitar.
 *
 * O caminho SMTP fica escrito à mesma, e é usado se existir configuração. No
 * dia em que o email do site for corrigido com SMTP, o CMS aproveita sem
 * precisar de tocar em nada.
 *
 * Devolve `undefined` quando não há nem um nem outro, em vez de rebentar: um
 * painel que não arranca por não conseguir enviar email é pior do que um painel
 * sem recuperação de password. O aviso do Payload continua a aparecer, e é esse
 * o sinal de que falta configurar.
 */
function adaptadorDeEmail() {
    const remetente = env("EMAIL_FROM") ?? env("SMTP_FROM") ?? env("SMTP_USER");
    const nome = env("EMAIL_FROM_NAME") ?? env("SMTP_FROM_NAME") ?? "Way2Go CMS";

    const resend = env("RESEND_API_KEY");
    if (resend && remetente) {
        return resendAdapter({
            apiKey: resend,
            defaultFromAddress: remetente,
            defaultFromName: nome,
        });
    }

    const host = env("SMTP_HOST");
    const user = env("SMTP_USER");
    const pass = env("SMTP_PASS");
    if (!host || !user || !pass || !remetente) return undefined;

    const port = Number(env("SMTP_PORT") ?? 587);

    return nodemailerAdapter({
        defaultFromAddress: remetente,
        defaultFromName: nome,
        transportOptions: {
            host,
            port,
            // 465 é TLS implícito; tudo o resto negoceia STARTTLS.
            secure: port === 465,
            auth: { user, pass },
        },
    });
}

/**
 * Armazenamento das imagens no Supabase Storage, pelo protocolo S3.
 *
 * ## Porque não é o disco local
 *
 * Em Vercel não há disco: o ficheiro é escrito e desaparece entre pedidos, sem
 * dar erro. O disco local só voltará a ser opção quando isto correr no
 * Cloudways — e a vantagem de usar o Storage é precisamente não ter de migrar
 * nada nesse dia.
 *
 * ## Porque é condicional
 *
 * Sem as variáveis definidas, o Payload usa o disco local e o desenvolvimento
 * continua a funcionar como sempre funcionou. Ligar isto exige configurar,
 * nunca acontece por acidente.
 */
function armazenamento() {
    const bucket = env("S3_BUCKET");
    const endpoint = env("S3_ENDPOINT");
    const accessKeyId = env("S3_ACCESS_KEY_ID");
    const secretAccessKey = env("S3_SECRET_ACCESS_KEY");

    if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) return [];

    // O endereço público do Supabase deriva do endpoint S3:
    //   …/storage/v1/s3  →  …/storage/v1/object/public
    const baseriPublica =
        env("S3_PUBLIC_BASE_URL") ?? `${endpoint.replace(/\/s3\/?$/, "")}/object/public`;

    return [
        s3Storage({
            collections: {
                [Media.slug]: {
                    // O balde é público, e servir as imagens através do Payload
                    // significaria uma invocação da Vercel por cada fotografia,
                    // a transportar bytes que o CDN do Supabase entrega melhor e
                    // de graça. O controlo de acesso não se perde por isto: já
                    // não existia, porque o balde é público de propósito — é
                    // assim que o site as vai poder mostrar.
                    disablePayloadAccessControl: true,
                    // A chave é calculada (`[Media.slug]`), o que impede o
                    // TypeScript de inferir a assinatura a partir do plugin.
                    generateFileURL: ({ filename, prefix }: { filename: string; prefix?: string }) =>
                        [baseriPublica, bucket, prefix, filename].filter(Boolean).join("/"),
                },
            },
            bucket,
            config: {
                endpoint,
                region: env("S3_REGION") ?? "eu-west-1",
                credentials: { accessKeyId, secretAccessKey },
                // O Supabase serve por caminho (`/bucket/objecto`), não por
                // subdomínio do balde como a AWS.
                forcePathStyle: true,
            },
        }),
    ];
}

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
    collections: [Users, Destinations, Media],
    // Um global por secção do dicionário do site, com os nomes dos campos iguais
    // às chaves de `src/dictionaries/*.json`. A forma dos dados mantém-se, para
    // que ligar o site ao CMS não obrigue a mexer nos componentes.
    globals: [Common, Hero, Booking, Faq, Footer, Cookies, Legal],
    // Os dois idiomas que o site serve — ver `LOCALES` em `src/lib/site.ts` e o
    // matcher em `src/middleware.ts`. Não são os cinco da página "Em breve", que
    // é um componente à parte com traduções próprias e não passa por aqui.
    //
    // `fallback` faz o inglês por preencher cair no português em vez de mostrar
    // um vazio: num site que vende viagens, texto em falta é pior do que texto
    // no idioma errado.
    localization: {
        locales: [
            { code: "pt", label: "Português" },
            { code: "en", label: "English" },
        ],
        defaultLocale: "pt",
        fallback: true,
    },
    editor: lexicalEditor(),
    db: postgresAdapter({
        // Marcada como experimental no adaptador. Ver a nota acima.
        schemaName: "payload",
        // Em desenvolvimento o adaptador liga o "push" do Drizzle por omissão:
        // ao arrancar, compara o esquema com as coleções e altera a base de
        // dados sozinho, sem gerar ficheiro nenhum para rever. Como este
        // projeto passou a usar migrações, isso significaria duas fontes de
        // verdade — e a que ninguém vê ganharia. Desligado de propósito:
        // qualquer alteração ao esquema passa por `payload migrate:create`.
        push: false,
        pool: {
            connectionString: process.env.DATABASE_URL ?? "",
            // Em serverless cada invocação tem o seu pool. Sem tecto, dezenas de
            // instâncias em paralelo esgotam as ligações do Supabase e o painel
            // começa a falhar sob carga — que é quando menos convém.
            //
            // Nota para quem mexer na cadeia de ligação: tem de ser o *session
            // pooler* (5432). O de transacções (6543) não suporta prepared
            // statements, e o Drizzle depende deles.
            max: Number(env("DATABASE_POOL_MAX") ?? 4),
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
    // O Payload usa o sharp para redimensionar as imagens carregadas.
    sharp,
    serverURL,
    email: adaptadorDeEmail(),
    plugins: armazenamento(),
});

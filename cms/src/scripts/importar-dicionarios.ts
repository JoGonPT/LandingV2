import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPayload } from "payload";

import config from "../../payload.config";

/**
 * Traz os textos de `src/dictionaries/*.json` do site para os globals do CMS.
 *
 * Corre-se à mão, uma vez: `npm run importar` dentro de `cms/`.
 *
 * ## Porque lê os ficheiros do site directamente
 *
 * A alternativa seria copiar os JSON para dentro de `cms/`. Duas cópias do mesmo
 * texto divergem — é só uma questão de tempo — e a cópia desactualizada seria a
 * que ninguém olha. Isto é um script de execução única, corrido à mão, fora do
 * build; o `outputFileTracingRoot` continua fixado em `cms/` e nada disto entra
 * no bundle.
 *
 * ## Porque se recusa a correr duas vezes
 *
 * Depois da primeira importação, a verdade dos textos passa a estar no painel.
 * Correr isto outra vez escreveria por cima do que alguém editou, sem aviso e
 * sem forma de recuperar. Por isso pára se encontrar conteúdo. Para forçar —
 * numa base de dados nova, por exemplo — passa-se `--forcar`.
 */

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DICIONARIOS = path.resolve(AQUI, "../../../src/dictionaries");

/** As sete secções, e os globals que lhes correspondem. Os nomes são iguais. */
const SECCOES = ["common", "hero", "booking", "faq", "footer", "cookies", "legal"] as const;
const IDIOMAS = ["pt", "en"] as const;

type Seccao = (typeof SECCOES)[number];
type Idioma = (typeof IDIOMAS)[number];

function lerDicionario(idioma: Idioma): Record<Seccao, unknown> {
    const ficheiro = path.join(DICIONARIOS, `${idioma}.json`);
    return JSON.parse(readFileSync(ficheiro, "utf8"));
}

/**
 * Traduz as listas do `legal` da forma do dicionário para a do CMS.
 *
 * Nos ficheiros, `list` é `string[]`. No CMS é um `array` de `{valor}` — não por
 * gosto, mas porque `text` com `hasMany` dentro de um array grava bem e lê mal
 * no Payload 3.88. A nota completa está em `src/globals/Legal.ts`.
 *
 * O `intro` fica de fora de propósito: está ao nível do grupo, onde o `hasMany`
 * funciona, e por isso mantém a forma original.
 */
const LISTAS_DENTRO_DE_ARRAYS = new Set(["list", "afterList"]);

function paraFormaDoCms(valor: unknown): unknown {
    if (Array.isArray(valor)) return valor.map(paraFormaDoCms);
    if (!valor || typeof valor !== "object") return valor;

    const saida: Record<string, unknown> = {};
    for (const [chave, v] of Object.entries(valor)) {
        const traduzir =
            LISTAS_DENTRO_DE_ARRAYS.has(chave) && Array.isArray(v) && v.every((x) => typeof x === "string");
        saida[chave] = traduzir
            ? (v as string[]).map((texto) => ({ valor: texto }))
            : paraFormaDoCms(v);
    }
    return saida;
}

/**
 * Um global está vazio se nenhum dos seus campos tiver valor. O Payload devolve
 * sempre o documento, mesmo que nunca tenha sido gravado, por isso não basta
 * verificar se existe.
 */
function temConteudo(documento: Record<string, unknown>): boolean {
    const ignorar = new Set(["id", "createdAt", "updatedAt", "globalType", "_status"]);
    return Object.entries(documento).some(([chave, valor]) => {
        if (ignorar.has(chave)) return false;
        if (valor === null || valor === undefined) return false;
        if (Array.isArray(valor)) return valor.length > 0;
        if (typeof valor === "object") return temConteudo(valor as Record<string, unknown>);
        return String(valor).trim() !== "";
    });
}

async function principal() {
    // O `payload run` não repassa os argumentos ao script, por isso a variável
    // de ambiente é o caminho que funciona. O argumento fica aceite para quem
    // corra o ficheiro directamente.
    const forcar = process.argv.includes("--forcar") || process.env.IMPORTAR_FORCAR === "1";
    const payload = await getPayload({ config });

    const dicionarios = Object.fromEntries(
        IDIOMAS.map((idioma) => [idioma, lerDicionario(idioma)]),
    ) as Record<Idioma, Record<Seccao, unknown>>;

    // Primeiro confirma-se que não há nada a perder. Só depois se escreve seja o
    // que for: uma importação que falha a meio deixa metade dos globals com
    // texto e metade sem, e ninguém sabe qual é qual.
    const ocupados: string[] = [];
    for (const seccao of SECCOES) {
        for (const idioma of IDIOMAS) {
            const actual = await payload.findGlobal({ slug: seccao, locale: idioma, depth: 0 });
            // Os tipos gerados descrevem cada global à parte; aqui percorrem-se
            // todos, e a verificação é estrutural.
            if (temConteudo(actual as unknown as Record<string, unknown>)) {
                ocupados.push(`${seccao} (${idioma})`);
            }
        }
    }

    if (ocupados.length > 0 && !forcar) {
        console.error("Estes globals já têm conteúdo:");
        for (const o of ocupados) console.error(`  - ${o}`);
        console.error(
            "\nNada foi escrito. Importar agora apagaria o que lá está.\n" +
                "Se é mesmo isso que quer: IMPORTAR_FORCAR=1 npm run importar",
        );
        process.exitCode = 1;
        return;
    }

    for (const seccao of SECCOES) {
        for (const idioma of IDIOMAS) {
            await payload.updateGlobal({
                slug: seccao,
                locale: idioma,
                data: paraFormaDoCms(dicionarios[idioma][seccao]) as never,
            });
            console.log(`  ${seccao} (${idioma}) importado`);
        }
    }

    console.log(`\n${SECCOES.length} globals, ${IDIOMAS.length} idiomas. Feito.`);
}

await principal();
process.exit(0);

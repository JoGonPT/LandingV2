import "server-only";

/**
 * Leitura dos destinos no CMS.
 *
 * ## A regra que governa este ficheiro
 *
 * **Um CMS em baixo não pode partir o site.** Todas as funções aqui devolvem
 * `null` ou lista vazia em vez de lançar: rede fora, chave errada, CMS pausado,
 * resposta com forma inesperada — o resultado é sempre o mesmo, a página do
 * destino devolve 404 e as cinco páginas que já existiam continuam a servir.
 *
 * O site funcionou sem CMS nenhum até hoje. Não pode passar a depender dele
 * para se manter de pé.
 *
 * ## Porque a chave e não leitura aberta
 *
 * O CMS devolve 403 a quem não se autentique. Enquanto o site está fechado ao
 * público, isso evita que conteúdo por lançar fique legível a quem descubra o
 * endereço do painel. A chave vive só no ambiente do servidor e nunca chega ao
 * navegador — este ficheiro é `server-only`.
 */

/** Quanto tempo o site guarda a resposta antes de voltar a perguntar ao CMS. */
const REVALIDAR_SEGUNDOS = 300;

const TEMPO_LIMITE_MS = 8000;

export interface DestinoImagem {
    url: string;
    width: number;
    height: number;
    alt: string;
    credit?: string;
}

export interface DestinoPergunta {
    question: string;
    answer: string;
}

export interface Destino {
    slug: string;
    title: string;
    city?: string;
    subtitle?: string;
    summary?: string;
    bodyHtml: string;
    highlights: string[];
    faq: DestinoPergunta[];
    rota: {
        origem?: string;
        distanciaKm?: number;
        duracaoMin?: number;
        precoDesde?: number;
    };
    imagem?: DestinoImagem;
    seo: { title?: string; description?: string };
    actualizadoEm?: string;
}

function configuracao(): { base: string; chave: string } | null {
    const base = process.env.CMS_API_URL?.trim().replace(/\/+$/, "");
    const chave = process.env.CMS_API_KEY?.trim();
    if (!base || !chave) return null;
    return { base, chave };
}

/** Devolve `null` em qualquer falha. Nunca lança. */
async function pedir(caminho: string): Promise<unknown | null> {
    const cfg = configuracao();
    if (!cfg) {
        console.warn("[cms] CMS_API_URL ou CMS_API_KEY em falta; o site serve sem destinos.");
        return null;
    }

    const controlo = new AbortController();
    const temporizador = setTimeout(() => controlo.abort(), TEMPO_LIMITE_MS);

    try {
        const resposta = await fetch(`${cfg.base}${caminho}`, {
            headers: { Authorization: `users API-Key ${cfg.chave}` },
            signal: controlo.signal,
            next: { revalidate: REVALIDAR_SEGUNDOS },
        });
        if (!resposta.ok) {
            console.warn(`[cms] ${caminho} devolveu ${resposta.status}`);
            return null;
        }
        return await resposta.json();
    } catch (erro) {
        // Inclui o tempo limite: um CMS lento não pode segurar uma página do site.
        console.warn(`[cms] ${caminho} falhou:`, erro instanceof Error ? erro.message : erro);
        return null;
    } finally {
        clearTimeout(temporizador);
    }
}

const texto = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;

const numero = (v: unknown): number | undefined =>
    typeof v === "number" && Number.isFinite(v) ? v : undefined;

/** Estreita um valor desconhecido a objecto, para se poder navegar sem `any`. */
const objecto = (v: unknown): Record<string, unknown> | undefined =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;

const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * Converte a resposta do CMS na forma que as páginas usam.
 *
 * Devolve `null` se faltar o essencial — `slug` e `title`. Um destino sem
 * título não é uma página, é um registo a meio.
 */
function normalizar(bruto: unknown): Destino | null {
    const d = objecto(bruto);
    if (!d) return null;

    const slug = texto(d.slug);
    const title = texto(d.title);
    if (!slug || !title) return null;

    const rota = objecto(d.route) ?? {};
    const seo = objecto(d.seo) ?? {};

    const img = objecto(d.image);
    // Prefere-se o tamanho `destaque` (1600px): o original pode ter 8000px de
    // largura e vários megabytes, e ninguém precisa disso numa página.
    const destaque = objecto(objecto(img?.sizes)?.destaque);
    const escolhida = texto(destaque?.url) ? destaque : img;
    const urlImagem = texto(escolhida?.url);
    const alt = texto(img?.alt);

    return {
        slug,
        title,
        city: texto(d.city),
        subtitle: texto(d.subtitle),
        summary: texto(d.summary),
        bodyHtml: typeof d.bodyHtml === "string" ? d.bodyHtml : "",
        highlights: lista(d.highlights)
            .map((h) => texto(objecto(h)?.text))
            .filter((x): x is string => Boolean(x)),
        faq: lista(d.faq)
            .map((f) => {
                const p = objecto(f);
                return { question: texto(p?.question), answer: texto(p?.answer) };
            })
            .filter((f): f is DestinoPergunta => Boolean(f.question && f.answer)),
        rota: {
            origem: texto(rota.origin),
            distanciaKm: numero(rota.distanceKm),
            duracaoMin: numero(rota.durationMin),
            precoDesde: numero(rota.priceFrom),
        },
        // Sem texto alternativo não se mostra a imagem: um `alt` vazio é uma
        // falha de acessibilidade, e o campo é obrigatório no CMS de propósito.
        imagem:
            urlImagem && alt
                ? {
                      url: urlImagem,
                      width: numero(escolhida?.width) ?? 1600,
                      height: numero(escolhida?.height) ?? 900,
                      alt,
                      credit: texto(img?.credit),
                  }
                : undefined,
        seo: { title: texto(seo.title), description: texto(seo.description) },
        actualizadoEm: texto(d.updatedAt),
    };
}

/** Um destino publicado, pelo seu slug. `null` se não existir ou se o CMS falhar. */
export async function obterDestino(slug: string, locale: string): Promise<Destino | null> {
    const limpo = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]{1,80}$/.test(limpo)) return null;

    const json = await pedir(
        `/api/destinations?where[slug][equals]=${encodeURIComponent(limpo)}` +
            `&where[_status][equals]=published&locale=${encodeURIComponent(locale)}&depth=1&limit=1`,
    );
    const docs = (json as { docs?: unknown[] } | null)?.docs;
    if (!Array.isArray(docs) || docs.length === 0) return null;
    return normalizar(docs[0]);
}

/**
 * Os slugs de todos os destinos publicados.
 *
 * Usado pelo `generateStaticParams` e pelo mapa do site. Lista vazia em caso de
 * falha — o site constrói-se na mesma, apenas sem páginas de destino.
 */
export async function listarSlugsPublicados(): Promise<string[]> {
    const json = await pedir(
        "/api/destinations?where[_status][equals]=published&depth=0&limit=200&select[slug]=true",
    );
    const docs = (json as { docs?: unknown[] } | null)?.docs;
    if (!Array.isArray(docs)) return [];
    return docs
        .map((d) => texto((d as Record<string, unknown>)?.slug))
        .filter((s): s is string => Boolean(s));
}

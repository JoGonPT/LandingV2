import "server-only";

import { normalizarBlocos, type Bloco } from "@/lib/cms/blocks";

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
    /** O corpo, bloco a bloco: texto já em HTML e chamadas para acção. */
    blocos: Bloco[];
    highlights: string[];
    faq: DestinoPergunta[];
    rota: {
        origem?: string;
        distanciaKm?: number;
        duracaoMin?: number;
        precoDesde?: number;
    };
    aeroporto: { nome?: string; codigo?: string };
    imagem?: DestinoImagem;
    seo: { title?: string; description?: string };
    actualizadoEm?: string;
}

/**
 * O que um cartão da página inicial precisa — e mais nada.
 *
 * A listagem pede menos campos do que a página do destino: sem corpo, sem
 * perguntas, sem destaques. Numa página com dezenas de cartões, trazer o texto
 * todo de cada destino seria carregar quilobytes que ninguém vai ler.
 */
export interface DestinoResumo {
    slug: string;
    title: string;
    city: string;
    aeroporto: { nome?: string; codigo?: string };
    imagem?: DestinoImagem;
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
 * Escolhe o tamanho de imagem adequado ao sítio onde vai ser mostrada.
 *
 * O original pode ter 8000px de largura e vários megabytes — a fotografia do
 * Porto tem. Servir isso a alguém seria pior do que não ter imagem. Cai para o
 * original só se o tamanho pedido não existir, o que acontece em imagens
 * carregadas antes de o redimensionamento estar ligado.
 */
function escolherImagem(
    d: Record<string, unknown>,
    tamanho: "miniatura" | "movel" | "destaque",
): { url?: string; dados?: Record<string, unknown>; alt?: string } {
    const img = objecto(d.image);
    const pedido = objecto(objecto(img?.sizes)?.[tamanho]);
    const escolhida = texto(pedido?.url) ? pedido : img;
    return { url: texto(escolhida?.url), dados: escolhida, alt: texto(img?.alt) };
}

/** A forma de imagem que os componentes recebem, ou `undefined` se não servir. */
function montarImagem(
    url: string | undefined,
    dados: Record<string, unknown> | undefined,
    alt: string | undefined,
    credito: string | undefined,
    larguraOmissao: number,
    alturaOmissao: number,
): DestinoImagem | undefined {
    // Sem texto alternativo não se mostra a imagem: um `alt` vazio é uma falha
    // de acessibilidade, e o campo é obrigatório no CMS de propósito.
    if (!url || !alt) return undefined;
    return {
        url,
        width: numero(dados?.width) ?? larguraOmissao,
        height: numero(dados?.height) ?? alturaOmissao,
        alt,
        credit: credito,
    };
}

/**
 * Converte a resposta do CMS na forma que as páginas usam.
 *
 * Devolve `null` se faltar o essencial — `slug` e `title`. Um destino sem
 * título não é uma página, é um registo a meio.
 */
function normalizar(bruto: unknown, locale: string): Destino | null {
    const d = objecto(bruto);
    if (!d) return null;

    const slug = texto(d.slug);
    const title = texto(d.title);
    if (!slug || !title) return null;

    const rota = objecto(d.route) ?? {};
    const seo = objecto(d.seo) ?? {};

    const aeroporto = objecto(d.airport) ?? {};
    const { url: urlImagem, dados: escolhida, alt } = escolherImagem(d, "destaque");

    return {
        slug,
        title,
        city: texto(d.city),
        subtitle: texto(d.subtitle),
        summary: texto(d.summary),
        blocos: normalizarBlocos(d.body, locale),
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
        aeroporto: { nome: texto(aeroporto.name), codigo: texto(aeroporto.code) },
        imagem: montarImagem(
            urlImagem,
            escolhida,
            alt,
            texto(objecto(d.image)?.credit),
            1600,
            900,
        ),
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
    return normalizar(docs[0], locale);
}

/** Converte um documento no resumo que um cartão precisa. `null` se não servir. */
function normalizarResumo(bruto: unknown): DestinoResumo | null {
    const d = objecto(bruto);
    if (!d) return null;

    const slug = texto(d.slug);
    const title = texto(d.title);
    if (!slug || !title) return null;

    const aeroporto = objecto(d.airport) ?? {};
    // O cartão mostra o nome da cidade. Sem ele, usa-se o título — que é mais
    // comprido mas continua a dizer para onde se vai.
    const city = texto(d.city) ?? title;

    // O `movel` (768px) é a largura de um cartão. Pedir o `destaque` (1600px)
    // seria mandar quatro vezes mais bytes para um sítio onde não se vê.
    const { url, dados, alt } = escolherImagem(d, "movel");

    return {
        slug,
        title,
        city,
        aeroporto: { nome: texto(aeroporto.name), codigo: texto(aeroporto.code) },
        imagem: montarImagem(url, dados, alt, texto(objecto(d.image)?.credit), 768, 432),
    };
}

/**
 * Os destinos publicados, na ordem definida no painel.
 *
 * Alimenta a secção da página inicial. Lista vazia em qualquer falha — a
 * página inicial é a mais importante do site e não pode depender disto para
 * servir.
 */
export async function listarDestinos(locale: string): Promise<DestinoResumo[]> {
    const json = await pedir(
        `/api/destinations?where[_status][equals]=published&locale=${encodeURIComponent(locale)}` +
            "&depth=1&limit=100&sort=order",
    );
    const docs = (json as { docs?: unknown[] } | null)?.docs;
    if (!Array.isArray(docs)) return [];
    return docs
        .map(normalizarResumo)
        .filter((d): d is DestinoResumo => d !== null);
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

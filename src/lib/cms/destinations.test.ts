import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listarDestinos, listarSlugsPublicados, obterDestino } from "./destinations";

/**
 * Estes testes protegem uma regra e uma só: **um CMS em baixo não pode partir
 * o site**.
 *
 * O site funcionou sem CMS nenhum até agora. A partir do momento em que passa
 * a ler dele, cada modo de falha do CMS — rede fora, chave errada, projeto
 * pausado, resposta com forma inesperada — tem de terminar em `null` ou lista
 * vazia, nunca numa excepção que rebente a página.
 *
 * O Supabase esteve pausado a 21 de agosto e tudo o que dependia dele caiu. É
 * essa a experiência que estes testes existem para não repetir.
 */

const FETCH_ORIGINAL = globalThis.fetch;

const DESTINO_CRU = {
    slug: "porto",
    title: "Transfer do Aeroporto do Porto para a cidade",
    city: "Porto",
    subtitle: "Do terminal à porta do seu alojamento.",
    bodyHtml: "<h2>Do terminal ao centro</h2><p>Quinze quilómetros.</p>",
    highlights: [{ text: "Uma hora de espera gratuita" }, { text: "Wi-Fi e água" }],
    faq: [{ question: "Quanto demora?", answer: "Cerca de 25 minutos." }],
    route: { origin: "Aeroporto (OPO)", distanceKm: 15, durationMin: 25, priceFrom: 40 },
    airport: { name: "Aeroporto Francisco Sá Carneiro", code: "OPO" },
    image: {
        alt: "Vista do Porto",
        credit: "Alguém",
        url: "https://exemplo/Porto.webp",
        width: 8000,
        height: 3429,
        sizes: {
            movel: { url: "https://exemplo/Porto-768x329.webp", width: 768, height: 329 },
            destaque: { url: "https://exemplo/Porto-1600x686.webp", width: 1600, height: 686 },
        },
    },
    seo: { title: "Transfer Aeroporto do Porto", description: "Descrição." },
    updatedAt: "2026-09-01T10:00:00.000Z",
};

function responde(corpo: unknown, status = 200) {
    globalThis.fetch = vi.fn(
        async () =>
            new Response(JSON.stringify(corpo), {
                status,
                headers: { "content-type": "application/json" },
            }),
    ) as unknown as typeof fetch;
}

function rebenta(mensagem = "fetch failed") {
    globalThis.fetch = vi.fn(async () => {
        throw new Error(mensagem);
    }) as unknown as typeof fetch;
}

beforeEach(() => {
    vi.stubEnv("CMS_API_URL", "https://cms.exemplo");
    vi.stubEnv("CMS_API_KEY", "chave-de-teste");
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
    globalThis.fetch = FETCH_ORIGINAL;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("obterDestino", () => {
    it("converte a resposta do CMS na forma que as páginas usam", async () => {
        responde({ docs: [DESTINO_CRU] });
        const d = await obterDestino("porto", "pt");

        expect(d).not.toBeNull();
        expect(d!.slug).toBe("porto");
        expect(d!.bodyHtml).toContain("<h2>");
        expect(d!.highlights).toEqual(["Uma hora de espera gratuita", "Wi-Fi e água"]);
        expect(d!.faq).toHaveLength(1);
        expect(d!.rota.precoDesde).toBe(40);
        expect(d!.seo.title).toBe("Transfer Aeroporto do Porto");
    });

    it("prefere o tamanho `destaque` ao original", async () => {
        // O original tem 8000 píxeis e três megabytes. Servir isso numa página
        // seria pior do que não ter imagem nenhuma.
        responde({ docs: [DESTINO_CRU] });
        const d = await obterDestino("porto", "pt");
        expect(d!.imagem?.url).toBe("https://exemplo/Porto-1600x686.webp");
        expect(d!.imagem?.width).toBe(1600);
    });

    it("envia a chave no cabeçalho e pede só o que está publicado", async () => {
        responde({ docs: [DESTINO_CRU] });
        await obterDestino("porto", "pt");

        const [url, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(String(url)).toContain("where[_status][equals]=published");
        expect(String(url)).toContain("locale=pt");
        expect((init as RequestInit).headers).toMatchObject({
            Authorization: "users API-Key chave-de-teste",
        });
    });

    it("devolve null quando o CMS não responde", async () => {
        rebenta();
        await expect(obterDestino("porto", "pt")).resolves.toBeNull();
    });

    it("devolve null quando o CMS devolve 403", async () => {
        responde({ errors: [] }, 403);
        await expect(obterDestino("porto", "pt")).resolves.toBeNull();
    });

    it("devolve null quando o CMS devolve 500", async () => {
        responde({}, 500);
        await expect(obterDestino("porto", "pt")).resolves.toBeNull();
    });

    it("devolve null quando faltam as variáveis de ambiente", async () => {
        vi.stubEnv("CMS_API_KEY", "");
        rebenta("não devia ser chamado");
        await expect(obterDestino("porto", "pt")).resolves.toBeNull();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("devolve null quando o destino não existe", async () => {
        responde({ docs: [] });
        await expect(obterDestino("nao-existe", "pt")).resolves.toBeNull();
    });

    it("devolve null quando a resposta não tem a forma esperada", async () => {
        responde({ qualquer: "coisa" });
        await expect(obterDestino("porto", "pt")).resolves.toBeNull();
    });

    it("devolve null quando o documento vem sem título", async () => {
        responde({ docs: [{ slug: "porto" }] });
        await expect(obterDestino("porto", "pt")).resolves.toBeNull();
    });

    it("recusa slugs inválidos sem chegar a chamar o CMS", async () => {
        rebenta("não devia ser chamado");
        for (const mau of ["../etc/passwd", "porto?x=1", "PORTO maiusculo", "", "a".repeat(81)]) {
            await expect(obterDestino(mau, "pt")).resolves.toBeNull();
        }
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("aceita campos opcionais em falta", async () => {
        responde({ docs: [{ slug: "braga", title: "Transfer para Braga" }] });
        const d = await obterDestino("braga", "pt");
        expect(d!.title).toBe("Transfer para Braga");
        expect(d!.bodyHtml).toBe("");
        expect(d!.highlights).toEqual([]);
        expect(d!.faq).toEqual([]);
        expect(d!.imagem).toBeUndefined();
    });

    it("ignora perguntas incompletas em vez de as mostrar meias", async () => {
        responde({
            docs: [
                {
                    ...DESTINO_CRU,
                    faq: [{ question: "Sem resposta" }, { question: "Boa", answer: "Sim." }],
                },
            ],
        });
        const d = await obterDestino("porto", "pt");
        expect(d!.faq).toEqual([{ question: "Boa", answer: "Sim." }]);
    });
});

describe("listarDestinos", () => {
    it("devolve o que um cartão precisa, e não mais", async () => {
        responde({ docs: [DESTINO_CRU] });
        const [d] = await listarDestinos("pt");

        expect(d.slug).toBe("porto");
        expect(d.city).toBe("Porto");
        expect(d.aeroporto).toEqual({ nome: "Aeroporto Francisco Sá Carneiro", codigo: "OPO" });
        // O resumo não traz corpo, perguntas nem destaques: numa página com
        // dezenas de cartões seriam quilobytes que ninguém lê.
        expect(d).not.toHaveProperty("bodyHtml");
        expect(d).not.toHaveProperty("faq");
    });

    it("usa o tamanho de cartão, não o de página", async () => {
        responde({ docs: [DESTINO_CRU] });
        const [d] = await listarDestinos("pt");
        expect(d.imagem?.url).toBe("https://exemplo/Porto-768x329.webp");
        expect(d.imagem?.width).toBe(768);
    });

    it("pede os publicados por ordem", async () => {
        responde({ docs: [] });
        await listarDestinos("pt");
        const [url] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(String(url)).toContain("where[_status][equals]=published");
        expect(String(url)).toContain("sort=order");
    });

    it("usa o título quando não há nome de cidade", async () => {
        responde({ docs: [{ slug: "braga", title: "Transfer para Braga" }] });
        const [d] = await listarDestinos("pt");
        expect(d.city).toBe("Transfer para Braga");
    });

    it("aceita um destino sem fotografia", async () => {
        // O cartão renderiza só com texto; não é motivo para o esconder.
        responde({ docs: [{ slug: "braga", title: "Braga", city: "Braga" }] });
        const [d] = await listarDestinos("pt");
        expect(d.imagem).toBeUndefined();
        expect(d.city).toBe("Braga");
    });

    it("aceita um destino sem aeroporto preenchido", async () => {
        responde({ docs: [{ slug: "braga", title: "Braga", city: "Braga" }] });
        const [d] = await listarDestinos("pt");
        expect(d.aeroporto).toEqual({ nome: undefined, codigo: undefined });
    });

    it("ignora documentos sem título em vez de os mostrar meios", async () => {
        responde({ docs: [{ slug: "sem-titulo" }, DESTINO_CRU] });
        const r = await listarDestinos("pt");
        expect(r).toHaveLength(1);
        expect(r[0].slug).toBe("porto");
    });

    it("devolve lista vazia quando o CMS está em baixo — a página inicial tem de servir na mesma", async () => {
        rebenta();
        await expect(listarDestinos("pt")).resolves.toEqual([]);
    });

    it("devolve lista vazia com a chave errada", async () => {
        responde({ errors: [] }, 403);
        await expect(listarDestinos("pt")).resolves.toEqual([]);
    });
});

describe("listarSlugsPublicados", () => {
    it("devolve os slugs publicados", async () => {
        responde({ docs: [{ slug: "porto" }, { slug: "guimaraes" }] });
        await expect(listarSlugsPublicados()).resolves.toEqual(["porto", "guimaraes"]);
    });

    it("devolve lista vazia quando o CMS está em baixo — o site tem de construir na mesma", async () => {
        rebenta();
        await expect(listarSlugsPublicados()).resolves.toEqual([]);
    });

    it("devolve lista vazia quando a resposta não tem a forma esperada", async () => {
        responde({ docs: "isto não é uma lista" });
        await expect(listarSlugsPublicados()).resolves.toEqual([]);
    });
});

import { describe, expect, it } from "vitest";

import { caminhoDestino, segmentoDestino, traduzirCaminho } from "./route-segments";

/**
 * Estes testes existem por causa de um defeito real.
 *
 * O selector de idioma do `Navbar` trocava apenas o prefixo do caminho. Numa
 * página de destino isso produzia `/en/transferes/porto/` — endereço que
 * devolve 404 de propósito, porque a rota inglesa vive em `transfers`.
 *
 * Quem estivesse a ler a página do Porto em português e carregasse em EN ia
 * parar a uma página que não existe.
 */

describe("traduzirCaminho", () => {
    it("traduz o segmento dos destinos, não só o prefixo", () => {
        expect(traduzirCaminho("/pt/transferes/porto/", "en")).toBe("/en/transfers/porto/");
        expect(traduzirCaminho("/en/transfers/porto/", "pt")).toBe("/pt/transferes/porto/");
    });

    it("nunca produz uma das combinações que dão 404", () => {
        const proibidos = ["/en/transferes/", "/pt/transfers/"];
        for (const partida of ["/pt/transferes/porto/", "/en/transfers/porto/"]) {
            for (const destino of ["pt", "en"]) {
                const r = traduzirCaminho(partida, destino);
                for (const mau of proibidos) expect(r.startsWith(mau)).toBe(false);
            }
        }
    });

    it("deixa intactos os caminhos sem segmento traduzível", () => {
        expect(traduzirCaminho("/pt/legal/privacy/", "en")).toBe("/en/legal/privacy/");
        expect(traduzirCaminho("/pt/checkout/success/", "en")).toBe("/en/checkout/success/");
    });

    it("trata a raiz de cada idioma", () => {
        expect(traduzirCaminho("/pt/", "en")).toBe("/en/");
        expect(traduzirCaminho("/pt", "en")).toBe("/en");
    });

    it("preserva a barra final, que o site usa em todos os endereços", () => {
        // `trailingSlash: true` no next.config.ts. Perder a barra causaria um
        // redirecionamento 308 a cada troca de idioma.
        expect(traduzirCaminho("/pt/transferes/porto/", "en").endsWith("/")).toBe(true);
    });

    it("devolve o caminho como está quando não reconhece o idioma", () => {
        // Não há tradução segura a fazer, e inventar uma seria pior.
        expect(traduzirCaminho("/algo/qualquer/", "en")).toBe("/algo/qualquer/");
    });

    it("aguenta entradas degeneradas sem lançar", () => {
        expect(traduzirCaminho("", "en")).toBe("/en");
        expect(traduzirCaminho("/", "en")).toBe("/en");
    });

    it("traduz destinos com slugs compostos", () => {
        expect(traduzirCaminho("/pt/transferes/vila-nova-de-gaia/", "en")).toBe(
            "/en/transfers/vila-nova-de-gaia/",
        );
    });
});

describe("segmentoDestino e caminhoDestino", () => {
    it("dá o segmento de cada idioma", () => {
        expect(segmentoDestino("pt")).toBe("transferes");
        expect(segmentoDestino("en")).toBe("transfers");
        expect(segmentoDestino("fr")).toBeNull();
    });

    it("compõe o caminho relativo de um destino", () => {
        expect(caminhoDestino("pt", "porto")).toBe("transferes/porto");
        expect(caminhoDestino("en", "porto")).toBe("transfers/porto");
        expect(caminhoDestino("de", "porto")).toBeNull();
    });
});

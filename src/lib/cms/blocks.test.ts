import { describe, expect, it } from "vitest";

import { normalizarBlocos, type BlocoCta } from "./blocks";

/**
 * O que estes testes protegem: **nenhum botão leva a lado nenhum**.
 *
 * Um CTA com o destino mal montado é pior do que um CTA ausente — ocupa espaço,
 * promete uma acção e devolve 404. Por isso a normalização descarta os que não
 * consegue resolver, e estes testes exercitam cada forma de os partir.
 *
 * A construção do endereço vive no site, e não no CMS, porque os caminhos são
 * traduzidos: `/pt/transferes/…` contra `/en/transfers/…`.
 */

const cta = (extra: Record<string, unknown>) => ({
    blockType: "callToAction",
    buttonText: "Reservar",
    ...extra,
});

const primeiro = (blocos: ReturnType<typeof normalizarBlocos>) => blocos[0] as BlocoCta;

describe("blocos de texto", () => {
    it("passa o HTML já convertido pelo CMS", () => {
        const r = normalizarBlocos([{ blockType: "richText", html: "<p>Olá</p>" }], "pt");
        expect(r).toEqual([{ tipo: "texto", html: "<p>Olá</p>" }]);
    });

    it("descarta blocos de texto vazios em vez de deixar um buraco", () => {
        expect(normalizarBlocos([{ blockType: "richText", html: "" }], "pt")).toEqual([]);
        expect(normalizarBlocos([{ blockType: "richText" }], "pt")).toEqual([]);
    });
});

describe("endereço do botão", () => {
    it("aponta ao formulário de reserva por omissão", () => {
        const r = normalizarBlocos([cta({ linkType: "bookingForm" })], "pt");
        expect(primeiro(r).href).toBe("/pt/#booking");
        expect(primeiro(r).externo).toBe(false);
    });

    it("põe os parâmetros antes da âncora, senão perdem-se", () => {
        const r = normalizarBlocos(
            [cta({ linkType: "bookingForm", customParams: "service=porto-transfer" })],
            "pt",
        );
        expect(primeiro(r).href).toBe("/pt/?service=porto-transfer#booking");
    });

    it("traduz o segmento ao ligar a outro destino", () => {
        const bloco = cta({ linkType: "internal", internalDoc: { slug: "guimaraes" } });
        expect(primeiro(normalizarBlocos([bloco], "pt")).href).toBe("/pt/transferes/guimaraes/");
        expect(primeiro(normalizarBlocos([bloco], "en")).href).toBe("/en/transfers/guimaraes/");
    });

    it("aceita um caminho escrito à mão, com o idioma acrescentado", () => {
        const r = normalizarBlocos([cta({ linkType: "internal", internalPath: "legal/terms" })], "pt");
        expect(primeiro(r).href).toBe("/pt/legal/terms/");
    });

    it("marca endereços externos para abrirem noutro separador", () => {
        const r = normalizarBlocos(
            [cta({ linkType: "external", externalUrl: "https://exemplo.pt/pagina" })],
            "pt",
        );
        expect(primeiro(r).href).toBe("https://exemplo.pt/pagina");
        expect(primeiro(r).externo).toBe(true);
    });

    it("monta o WhatsApp com a mensagem codificada", () => {
        const r = normalizarBlocos(
            [cta({ linkType: "whatsapp", whatsappMessage: "Olá, queria um transfer" })],
            "pt",
        );
        expect(primeiro(r).href).toBe(
            "https://wa.me/351913281953?text=Ol%C3%A1%2C%20queria%20um%20transfer",
        );
        expect(primeiro(r).externo).toBe(true);
    });
});

describe("botões que não devem aparecer", () => {
    it("descarta um botão sem texto", () => {
        expect(normalizarBlocos([{ blockType: "callToAction", linkType: "bookingForm" }], "pt")).toEqual([]);
    });

    it("descarta um interno sem destino nem caminho", () => {
        expect(normalizarBlocos([cta({ linkType: "internal" })], "pt")).toEqual([]);
    });

    it("descarta um externo sem endereço, ou com um que não é endereço", () => {
        expect(normalizarBlocos([cta({ linkType: "external" })], "pt")).toEqual([]);
        // Sem esta verificação, `javascript:` num campo de conteúdo virava um
        // link executável.
        expect(
            normalizarBlocos([cta({ linkType: "external", externalUrl: "javascript:alert(1)" })], "pt"),
        ).toEqual([]);
    });

    it("descarta um destino cujo idioma não tem segmento", () => {
        const bloco = cta({ linkType: "internal", internalDoc: { slug: "porto" } });
        expect(normalizarBlocos([bloco], "de")).toEqual([]);
    });
});

describe("estilo e robustez", () => {
    it("cai nos valores por omissão quando o estilo vem inválido", () => {
        const r = normalizarBlocos(
            [cta({ linkType: "bookingForm", variant: "inventado", alignment: "diagonal" })],
            "pt",
        );
        expect(primeiro(r).variante).toBe("primary");
        expect(primeiro(r).alinhamento).toBe("center");
    });

    it("respeita o estilo escolhido no painel", () => {
        const r = normalizarBlocos(
            [cta({ linkType: "bookingForm", variant: "outline", alignment: "left" })],
            "pt",
        );
        expect(primeiro(r).variante).toBe("outline");
        expect(primeiro(r).alinhamento).toBe("left");
    });

    it("mantém a ordem em que os blocos foram escritos", () => {
        const r = normalizarBlocos(
            [
                { blockType: "richText", html: "<p>um</p>" },
                cta({ linkType: "bookingForm" }),
                { blockType: "richText", html: "<p>dois</p>" },
            ],
            "pt",
        );
        expect(r.map((b) => b.tipo)).toEqual(["texto", "cta", "texto"]);
    });

    it("ignora entradas degeneradas sem lançar", () => {
        expect(normalizarBlocos(null, "pt")).toEqual([]);
        expect(normalizarBlocos("isto não é uma lista", "pt")).toEqual([]);
        expect(normalizarBlocos([null, undefined, 42, { blockType: "desconhecido" }], "pt")).toEqual([]);
    });
});

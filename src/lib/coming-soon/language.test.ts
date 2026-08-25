import { describe, expect, it } from "vitest";

import { COMING_SOON_LANGUAGES, detectComingSoonLanguage } from "./language";

/**
 * O ecrã de "Em breve" é, enquanto o portão estiver ligado, a **única** página
 * que um visitante consegue alcançar. Se esta função lançar, ninguém vê nada —
 * daí a insistência nos cabeçalhos estranhos.
 */

describe("idiomas suportados", () => {
    it("cada um é reconhecido quando pedido sozinho", () => {
        for (const l of COMING_SOON_LANGUAGES) {
            expect(detectComingSoonLanguage(l), l).toBe(l);
        }
    });

    it("aceita variantes regionais", () => {
        expect(detectComingSoonLanguage("pt-BR")).toBe("pt");
        expect(detectComingSoonLanguage("en-US")).toBe("en");
        expect(detectComingSoonLanguage("es-AR")).toBe("es");
        expect(detectComingSoonLanguage("de-AT")).toBe("de");
        expect(detectComingSoonLanguage("fr-CA")).toBe("fr");
    });

    it("respeita a ordem de preferência do browser", () => {
        expect(detectComingSoonLanguage("de-DE,de;q=0.9,en;q=0.8")).toBe("de");
        expect(detectComingSoonLanguage("en-GB,en;q=0.9,fr;q=0.8")).toBe("en");
    });

    it("salta os que não suportamos e fica pelo primeiro que sirva", () => {
        // Chega de Amesterdão com francês em segundo: francês, não inglês.
        expect(detectComingSoonLanguage("nl-NL,nl;q=0.9,fr;q=0.8")).toBe("fr");
    });
});

describe("fora dos cinco, inglês", () => {
    it("um idioma que não servimos cai em inglês", () => {
        for (const h of ["nl-NL", "it-IT", "pl-PL", "zh-CN", "ja", "ar"]) {
            expect(detectComingSoonLanguage(h), h).toBe("en");
        }
    });

    it("é inglês e não português — a omissão serve mais gente", () => {
        expect(detectComingSoonLanguage("nl-NL,nl;q=0.9")).not.toBe("pt");
    });
});

describe("nunca lança", () => {
    it("aguenta ausência, vazio e espaços", () => {
        for (const h of [null, undefined, "", "   "]) {
            expect(detectComingSoonLanguage(h)).toBe("en");
        }
    });

    it('aguenta o "*" que os bots enviam', () => {
        // O Negotiator devolve ["*"] quando não há preferência declarada, e "*"
        // não é um idioma válido — passava direto para o matchLocale e rebentava.
        expect(detectComingSoonLanguage("*")).toBe("en");
    });

    it("aguenta cabeçalhos malformados", () => {
        for (const h of ["q=", ";;;", "pt;q=abc", "-----", "en;;q=0.9,"]) {
            expect(() => detectComingSoonLanguage(h), h).not.toThrow();
            expect(COMING_SOON_LANGUAGES).toContain(detectComingSoonLanguage(h));
        }
    });
});

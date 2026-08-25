import { describe, expect, it } from "vitest";

import { SETTINGS, confirmationMatches, getOption } from "./registry";

/**
 * A frase escrita à mão é o único travão entre um clique distraído e desligar
 * a cobrança de cartões em produção. Estes testes fixam o que conta como igual.
 */

describe("confirmationMatches", () => {
    const FRASE = "DESLIGAR PAGAMENTO STRIPE";

    it("aceita a frase exata", () => {
        expect(confirmationMatches(FRASE, FRASE)).toBe(true);
    });

    it("tolera espaços nas pontas e a dobrar — é ruído de escrita", () => {
        expect(confirmationMatches(FRASE, "  DESLIGAR PAGAMENTO STRIPE  ")).toBe(true);
        expect(confirmationMatches(FRASE, "DESLIGAR  PAGAMENTO   STRIPE")).toBe(true);
    });

    it("recusa maiúsculas trocadas — a frase está à vista", () => {
        expect(confirmationMatches(FRASE, "desligar pagamento stripe")).toBe(false);
        expect(confirmationMatches(FRASE, "Desligar Pagamento Stripe")).toBe(false);
    });

    it("recusa frases parecidas, truncadas ou com palavras a mais", () => {
        for (const tentativa of [
            "DESLIGAR PAGAMENTO",
            "DESLIGAR PAGAMENTO STRIPE JA",
            "DESLIGAR O PAGAMENTO STRIPE",
            "CONFIRMAR",
            "",
        ]) {
            expect(confirmationMatches(FRASE, tentativa)).toBe(false);
        }
    });
});

describe("registo de definições", () => {
    it("cada chave é única", () => {
        const chaves = SETTINGS.map((s) => s.key);
        expect(new Set(chaves).size).toBe(chaves.length);
    });

    it("a omissão de cada definição é um dos valores permitidos", () => {
        for (const s of SETTINGS) {
            expect(getOption(s.key, s.fallback), `omissão inválida em ${s.key}`).not.toBeNull();
        }
    });

    it("a omissão é sempre o estado seguro", () => {
        // Se a base de dados e o ambiente falharem os dois, o site não pode
        // acordar a cobrar cartões nem a emitir facturas reais.
        expect(getOption("payments.stripe_automatic", "off")).not.toBeNull();
        expect(SETTINGS.find((s) => s.key === "payments.stripe_automatic")?.fallback).toBe("off");
        expect(SETTINGS.find((s) => s.key === "invoicing.vendus_live")?.fallback).toBe("mock");
        expect(SETTINGS.find((s) => s.key === "site.coming_soon")?.fallback).toBe("off");
    });

    it("todo o estado perigoso exige frase escrita", () => {
        const perigosos = [
            ["payments.stripe_automatic", "on"],
            ["payments.stripe_automatic", "off"],
            ["invoicing.vendus_live", "live"],
            ["site.coming_soon", "on"],
            ["booking.ui_mode", "funnel"],
        ] as const;

        for (const [key, value] of perigosos) {
            expect(getOption(key, value)?.confirmation, `${key}=${value} sem frase`).toBeTruthy();
        }
    });

    it("cada opção explica a consequência antes de ser escolhida", () => {
        for (const s of SETTINGS) {
            for (const o of s.options) {
                expect(o.consequence.length, `${s.key}=${o.value}`).toBeGreaterThan(20);
            }
        }
    });
});

import { describe, expect, it } from "vitest";

import { resolveBookingUiMode } from "./ui-mode";

/**
 * O funil só liga com o valor exato `funnel`.
 *
 * A variável `NEXT_PUBLIC_BOOKING_UI_MODE` já existia configurada na Vercel,
 * órfã de um formulário removido em maio, e podia ter lá um valor antigo
 * (`way2go`, `transfercrm`). Se qualquer valor ligasse o funil, o próximo deploy
 * trocaria a página de entrada do negócio sem ninguém ter pedido.
 */
describe("resolveBookingUiMode", () => {
    it("liga o funil com o valor exato", () => {
        expect(resolveBookingUiMode("funnel")).toBe("funnel");
    });

    it("tolera espaços e maiúsculas", () => {
        for (const v of ["  funnel  ", "Funnel", "FUNNEL"]) {
            expect(resolveBookingUiMode(v)).toBe("funnel");
        }
    });

    it("os valores antigos não ligam o funil", () => {
        for (const v of ["way2go", "transfercrm"]) {
            expect(resolveBookingUiMode(v)).toBe("quote");
        }
    });

    it("por omissão fica no formulário de orçamento", () => {
        for (const v of [undefined, "", "   ", "1", "true"]) {
            expect(resolveBookingUiMode(v)).toBe("quote");
        }
    });
});

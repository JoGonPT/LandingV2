import { describe, expect, it } from "vitest";

import { buildBookingPayloadFromBookingRequestDto, parseBookingRequestDto } from "./book-public";
import { buildBookingPayloadFromQuoteRequest, parseQuoteRequestDto, validateQuoteBookingPayload } from "./quote-public";
import { mapBookingPayloadToQuoteRequest } from "@/lib/transfercrm/booking-mappers";
import { validateBookingPayload } from "@/lib/transfercrm/validation";

/**
 * O caminho do dinheiro, **com o validador pelo meio**.
 *
 * Duas correções anteriores — no caminho da cotação e no da reserva — não
 * corrigiram nada, e passaram nos testes na mesma. A razão é que os testes
 * ligavam o construtor do payload diretamente ao mapeador, e na execução real
 * há um `validateBookingPayload` entre os dois que **reconstrói o objeto campo
 * a campo**. O que não estivesse na lista desaparecia em silêncio.
 *
 * Estes testes percorrem a sequência completa, na ordem em que as rotas a
 * percorrem. Se alguém acrescentar um campo ao payload e esquecer o validador,
 * é aqui que se descobre — e não em produção, num preço errado.
 */

const ROTA = {
    pickup: "Aeroporto Francisco Sá Carneiro (OPO)",
    dropoff: "Lisboa, Portugal",
    datetime: "2026-09-15 10:00",
    passengers: 2,
    vehicleType: "sedan",
};

const CONTACTO = { name: "Ana Silva", email: "ana@exemplo.pt", phone: "+351900000000" };

describe("cotação: construir → validar → mapear", () => {
    it("o código da classe sobrevive ao validador", () => {
        const parsed = parseQuoteRequestDto({ ...ROTA, vehicleClassCode: "van_executive" });
        if (!parsed.ok) throw new Error(parsed.message);

        const validated = validateQuoteBookingPayload(buildBookingPayloadFromQuoteRequest(parsed.data));
        if (!validated.ok) throw new Error(validated.message);

        // É este o passo que faltava cobrir.
        expect(validated.data.vehicleClassCode).toBe("van_executive");
        expect(mapBookingPayloadToQuoteRequest(validated.data).vehicle_class_code).toBe("van_executive");
    });
});

describe("reserva: construir → validar → mapear", () => {
    it("o código da classe sobrevive ao validador", () => {
        const parsed = parseBookingRequestDto({ ...ROTA, vehicleClassCode: "van_executive", customer: CONTACTO });
        if (!parsed.ok) throw new Error(parsed.message);

        const validated = validateBookingPayload(buildBookingPayloadFromBookingRequestDto(parsed.data));
        if (!validated.ok) throw new Error(validated.message);

        expect(validated.data.vehicleClassCode).toBe("van_executive");
        expect(mapBookingPayloadToQuoteRequest(validated.data).vehicle_class_code).toBe("van_executive");
    });
});

describe("os dois caminhos continuam a concordar depois de validados", () => {
    it("mesma classe, mesmo vehicle_class_code", () => {
        const cot = parseQuoteRequestDto({ ...ROTA, vehicleClassCode: "comfort" });
        const res = parseBookingRequestDto({ ...ROTA, vehicleClassCode: "comfort", customer: CONTACTO });
        if (!cot.ok) throw new Error(cot.message);
        if (!res.ok) throw new Error(res.message);

        const vCot = validateQuoteBookingPayload(buildBookingPayloadFromQuoteRequest(cot.data));
        const vRes = validateBookingPayload(buildBookingPayloadFromBookingRequestDto(res.data));
        if (!vCot.ok) throw new Error(vCot.message);
        if (!vRes.ok) throw new Error(vRes.message);

        // Divergirem significa cobrar um preço diferente do que foi mostrado.
        expect(mapBookingPayloadToQuoteRequest(vCot.data).vehicle_class_code).toBe(
            mapBookingPayloadToQuoteRequest(vRes.data).vehicle_class_code,
        );
    });

    it("sem classe, nenhum dos caminhos a inventa", () => {
        const cot = parseQuoteRequestDto(ROTA);
        if (!cot.ok) throw new Error(cot.message);
        const v = validateQuoteBookingPayload(buildBookingPayloadFromQuoteRequest(cot.data));
        if (!v.ok) throw new Error(v.message);

        expect(mapBookingPayloadToQuoteRequest(v.data).vehicle_class_code).toBeUndefined();
    });
});

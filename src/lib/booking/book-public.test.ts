import { describe, expect, it } from "vitest";

import { buildBookingPayloadFromBookingRequestDto, parseBookingRequestDto } from "./book-public";
import { mapBookingPayloadToQuoteRequest } from "@/lib/transfercrm/booking-mappers";

/**
 * O caminho do dinheiro: do que o cliente escolhe até ao pedido de cotação que
 * determina quanto é cobrado.
 *
 * Se o `vehicleClassCode` se perder aqui, o CRM aplica a tarifa mínima e o
 * cliente é **cobrado menos do que viu** — uma Van Premium de 79,97 € passaria
 * a 45 €. Não dá erro em lado nenhum: o preço sai simplesmente errado.
 */

const DTO_VALIDO = {
    pickup: "Aeroporto Francisco Sá Carneiro, Porto",
    dropoff: "Maia, Portugal",
    datetime: "2026-09-15 10:00",
    passengers: 2,
    vehicleType: "sedan",
    customer: { name: "Ana Silva", email: "ana@exemplo.pt", phone: "+351900000000" },
};

describe("o código da classe sobrevive até à cotação", () => {
    it("é aceite no pedido", () => {
        const parsed = parseBookingRequestDto({ ...DTO_VALIDO, vehicleClassCode: "premium-van" });
        expect(parsed.ok).toBe(true);
        if (parsed.ok) expect(parsed.data.vehicleClassCode).toBe("premium-van");
    });

    it("chega ao payload da reserva", () => {
        const parsed = parseBookingRequestDto({ ...DTO_VALIDO, vehicleClassCode: "premium-van" });
        if (!parsed.ok) throw new Error(parsed.message);

        const payload = buildBookingPayloadFromBookingRequestDto(parsed.data);
        expect(payload.vehicleClassCode).toBe("premium-van");
    });

    it("chega ao pedido enviado ao CRM — é isto que decide o preço", () => {
        const parsed = parseBookingRequestDto({ ...DTO_VALIDO, vehicleClassCode: "premium-van" });
        if (!parsed.ok) throw new Error(parsed.message);

        const request = mapBookingPayloadToQuoteRequest(
            buildBookingPayloadFromBookingRequestDto(parsed.data),
        );

        expect(request.vehicle_class_code).toBe("premium-van");
    });

    it("sem código, o pedido não o inventa", () => {
        const parsed = parseBookingRequestDto(DTO_VALIDO);
        if (!parsed.ok) throw new Error(parsed.message);

        const request = mapBookingPayloadToQuoteRequest(
            buildBookingPayloadFromBookingRequestDto(parsed.data),
        );

        expect(request.vehicle_class_code).toBeUndefined();
        expect(request.vehicle_type).toBe("sedan");
    });

    it("ignora um código vazio ou só com espaços", () => {
        for (const valor of ["", "   "]) {
            const parsed = parseBookingRequestDto({ ...DTO_VALIDO, vehicleClassCode: valor });
            if (!parsed.ok) throw new Error(parsed.message);
            expect(parsed.data.vehicleClassCode).toBeUndefined();
        }
    });
});

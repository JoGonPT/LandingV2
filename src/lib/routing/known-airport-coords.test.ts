import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * As coordenadas dos aeroportos entram no cálculo da distância, e a distância
 * entra no preço — o CRM exige `distance_km` e não a calcula.
 *
 * O ficheiro fixa cada aeroporto em **dois sítios**: na tabela
 * `KNOWN_PLACE_COORDS` e nos ramos de `knownPlaceCoords`. Foi essa duplicação
 * que deixou a coordenada errada do OPO sobreviver a uma primeira correção.
 * Este teste não valida a geografia; garante apenas que as duas cópias
 * concordam e que a coordenada rejeitada não regressa.
 */

const fonte = readFileSync(
    join(process.cwd(), "src/lib/routing/estimate-route-distance-km.ts"),
    "utf8",
);

/** `aeroway=apron` — placa de estacionamento de aeronaves, do lado ar. */
const APRON_REJEITADA = /41\.2421\s*,\s*lon:\s*-8\.6781|lat:\s*41\.2421/;

describe("coordenadas fixas dos aeroportos", () => {
    it("o OPO está declarado exatamente duas vezes e as duas concordam", () => {
        const encontradas = [...fonte.matchAll(/lat:\s*(41\.2\d+)\s*,\s*lon:\s*(-8\.6\d+)/g)]
            .map((m) => `${m[1]},${m[2]}`)
            .filter((c) => c.startsWith("41.23") || c.startsWith("41.24"));

        expect(encontradas).toHaveLength(2);
        expect(new Set(encontradas).size).toBe(1);
    });

    it("a coordenada da placa de estacionamento não regressa", () => {
        // Só deve sobreviver na nota que explica porque foi rejeitada.
        const emCodigo = fonte
            .split("\n")
            .filter((l) => !l.trimStart().startsWith("//"))
            .join("\n");

        expect(APRON_REJEITADA.test(emCodigo)).toBe(false);
    });
});

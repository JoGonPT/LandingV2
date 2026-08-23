import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    __resetSettingsCache,
    getSetting,
    getSettingsSnapshot,
    invalidateSettingsCache,
    readEnvValue,
} from "./resolve";

/**
 * O resolvedor decide o que o site faz. Estes testes protegem três coisas:
 *
 * 1. a ordem base de dados → ambiente → omissão;
 * 2. que uma base de dados em baixo **nunca** inverte um estado nem lança —
 *    o Supabase esteve pausado a 21 ago 2026 e tudo o que dependia dele caiu;
 * 3. que a tradução das variáveis está certa, incluindo a que está invertida.
 */

const ORIGINAL_FETCH = globalThis.fetch;

function mockDb(rows: Array<{ key: string; value: string }>) {
    globalThis.fetch = vi.fn(async () =>
        new Response(JSON.stringify(rows.map((r) => ({ ...r, updated_at: "", updated_by_label: null }))), {
            status: 200,
            headers: { "content-type": "application/json" },
        }),
    ) as unknown as typeof fetch;
}

function mockDbDown() {
    globalThis.fetch = vi.fn(async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
}

beforeEach(() => {
    __resetSettingsCache();
    vi.stubEnv("SUPABASE_URL", "https://projeto.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "chave-de-servico");
});

afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("precedência", () => {
    it("a base de dados ganha ao ambiente", async () => {
        vi.stubEnv("MANUAL_PAYMENT_MODE", "1"); // ambiente diz: Stripe desligado
        mockDb([{ key: "payments.stripe_automatic", value: "on" }]);

        await expect(getSetting("payments.stripe_automatic")).resolves.toBe("on");
    });

    it("sem linha na base de dados, vale o ambiente", async () => {
        vi.stubEnv("MANUAL_PAYMENT_MODE", "0");
        mockDb([]);

        await expect(getSetting("payments.stripe_automatic")).resolves.toBe("on");
    });

    it("sem base de dados e sem ambiente, vale a omissão segura", async () => {
        mockDb([]);
        await expect(getSetting("payments.stripe_automatic")).resolves.toBe("off");
        await expect(getSetting("invoicing.vendus_live")).resolves.toBe("mock");
        await expect(getSetting("site.coming_soon")).resolves.toBe("off");
    });

    it("um valor inválido na base de dados é ignorado, não aceite", async () => {
        vi.stubEnv("MANUAL_PAYMENT_MODE", "0");
        mockDb([{ key: "payments.stripe_automatic", value: "talvez" }]);

        await expect(getSetting("payments.stripe_automatic")).resolves.toBe("on");
    });
});

describe("base de dados em baixo", () => {
    it("não lança", async () => {
        mockDbDown();
        await expect(getSetting("payments.stripe_automatic")).resolves.toBeTypeOf("string");
    });

    it("mantém o último valor conhecido em vez de inverter o estado", async () => {
        mockDb([{ key: "payments.stripe_automatic", value: "on" }]);
        await expect(getSetting("payments.stripe_automatic")).resolves.toBe("on");

        mockDbDown();
        invalidateSettingsCache();

        // O perigo real: cair para "off" desligava a cobrança sozinho.
        await expect(getSetting("payments.stripe_automatic")).resolves.toBe("on");
    });

    it("assinala o estado degradado para o painel o poder mostrar", async () => {
        mockDbDown();
        const snapshot = await getSettingsSnapshot();

        expect(snapshot.degraded).toBe(true);
        expect(snapshot.degradedReason).toBeTruthy();
    });

    it("sem Supabase configurado não conta como degradado", async () => {
        vi.stubEnv("SUPABASE_URL", "");
        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
        __resetSettingsCache();

        const snapshot = await getSettingsSnapshot();
        expect(snapshot.degraded).toBe(false);
    });
});

describe("cache", () => {
    it("não vai à base de dados a cada leitura", async () => {
        mockDb([{ key: "site.coming_soon", value: "on" }]);

        await getSetting("site.coming_soon");
        await getSetting("site.coming_soon");
        await getSetting("payments.stripe_automatic");

        // Importa porque isto é lido no middleware, a cada pedido.
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("invalidar força uma leitura nova", async () => {
        mockDb([{ key: "site.coming_soon", value: "off" }]);
        await getSetting("site.coming_soon");

        mockDb([{ key: "site.coming_soon", value: "on" }]);
        invalidateSettingsCache();

        await expect(getSetting("site.coming_soon")).resolves.toBe("on");
    });
});

describe("tradução das variáveis de ambiente", () => {
    it("MANUAL_PAYMENT_MODE está invertida e a tradução respeita isso", () => {
        vi.stubEnv("MANUAL_PAYMENT_MODE", "1");
        expect(readEnvValue("payments.stripe_automatic")).toBe("off");

        vi.stubEnv("MANUAL_PAYMENT_MODE", "0");
        expect(readEnvValue("payments.stripe_automatic")).toBe("on");
    });

    it("VENDUS_MODE só é real com PRODUCTION", () => {
        vi.stubEnv("VENDUS_MODE", "PRODUCTION");
        expect(readEnvValue("invoicing.vendus_live")).toBe("live");

        for (const v of ["MOCK", "mock", "qualquer-coisa"]) {
            vi.stubEnv("VENDUS_MODE", v);
            expect(readEnvValue("invoicing.vendus_live")).toBe("mock");
        }
    });

    it("BOOKING_UI_MODE só liga o funil com o valor exato", () => {
        vi.stubEnv("BOOKING_UI_MODE", "funnel");
        expect(readEnvValue("booking.ui_mode")).toBe("funnel");

        for (const v of ["way2go", "transfercrm", "1"]) {
            vi.stubEnv("BOOKING_UI_MODE", v);
            expect(readEnvValue("booking.ui_mode")).toBe("quote");
        }
    });

    it("variável não definida devolve null, para a omissão poder valer", () => {
        expect(readEnvValue("site.coming_soon")).toBeNull();
    });
});

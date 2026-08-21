import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetRateLimitState } from "@/lib/rate-limit";

/**
 * Testes ao único funil de captação de leads do site.
 *
 * Cada bloco fixa um comportamento cuja falha custa dinheiro: um lead perdido
 * aqui não deixa rasto nenhum. Vários destes casos já estiveram partidos.
 *
 * `nodemailer` é substituído por um duplo — não se enviam emails reais.
 */

const sendMail = vi.fn();

vi.mock("nodemailer", () => ({
    default: { createTransport: () => ({ sendMail }) },
}));

const { POST } = await import("./route");

const VALID = {
    pickup: "Aeroporto do Porto",
    dropoff: "Maia",
    dateTime: "2026-09-01T10:30",
    passageiros: 2,
    bagagem: 2,
    cadeiraBebe: 0,
    cadeiraCrianca: 0,
    assentoBooster: 0,
    veiculo: "berlina",
    veiculoLabel: "Berlina Executiva",
    name: "Ana Silva",
    email: "ana@exemplo.pt",
    phone: "+351900000000",
    idioma: "pt" as const,
};

let ipCounter = 0;

/** Cada pedido leva um IP novo, para o rate limit não contaminar os testes. */
function post(body: unknown, ip?: string) {
    return POST(
        new Request("https://www.way2go.pt/api/send-budget", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-forwarded-for": ip ?? `10.0.0.${++ipCounter % 250}`,
            },
            body: JSON.stringify(body),
        }),
    );
}

beforeEach(() => {
    __resetRateLimitState();
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: "id", accepted: ["x"], rejected: [] });

    vi.stubEnv("DISCORD_WEBHOOK_URL", "https://discord.test/webhook");
    vi.stubEnv("SMTP_HOST", "smtp.test");
    vi.stubEnv("SMTP_USER", "no-reply@way2go.pt");
    vi.stubEnv("SMTP_PASS", "segredo");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("validação", () => {
    it("aceita um pedido bem formado", async () => {
        expect((await post(VALID)).status).toBe(200);
    });

    it("recusa corpo em falta", async () => {
        expect((await post({})).status).toBe(400);
    });

    it("recusa email inválido", async () => {
        expect((await post({ ...VALID, email: "nao-e-email" })).status).toBe(400);
    });

    it("recusa strings acima do limite em vez de rebentar a jusante", async () => {
        // Sem `.max()`, um `observations` longo fazia o Discord devolver 400,
        // a rota devolver 500 e **o lead perder-se**.
        const res = await post({ ...VALID, observations: "a".repeat(2000) });
        expect(res.status).toBe(400);
    });
});

describe("honeypot", () => {
    it("descarta em silêncio quando o campo oculto vem preenchido", async () => {
        const res = await post({ ...VALID, website: "http://spam.example" });

        // Responde 200 de propósito: negar abertamente ensinaria o bot a contornar.
        expect(res.status).toBe(200);
        expect(sendMail).not.toHaveBeenCalled();
        expect(fetch).not.toHaveBeenCalled();
    });

    it("não interfere quando vem vazio", async () => {
        expect((await post({ ...VALID, website: "" })).status).toBe(200);
        expect(sendMail).toHaveBeenCalled();
    });
});

describe("rate limit", () => {
    it("bloqueia o 6.º pedido do mesmo IP", async () => {
        const ip = "203.0.113.7";
        for (let i = 0; i < 5; i++) {
            expect((await post(VALID, ip)).status).toBe(200);
        }

        const blocked = await post(VALID, ip);
        expect(blocked.status).toBe(429);
        expect(blocked.headers.get("Retry-After")).toBeTruthy();
    });

    it("não afeta outros IPs", async () => {
        const ip = "203.0.113.8";
        for (let i = 0; i < 6; i++) await post(VALID, ip);

        expect((await post(VALID, "203.0.113.9")).status).toBe(200);
    });
});

describe("resiliência dos canais de notificação", () => {
    it("o lead sobrevive à falha do Discord, desde que o email siga", async () => {
        // Antes uma falha do Discord devolvia 500 e o lead perdia-se, mesmo com
        // o email entregue. O Discord é notificação; o email é o registo.
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("discord em baixo")));

        expect((await post(VALID)).status).toBe(200);
        expect(sendMail).toHaveBeenCalled();
    });

    it("o lead sobrevive à falha do SMTP, desde que o Discord receba", async () => {
        sendMail.mockRejectedValue(new Error("smtp em baixo"));
        expect((await post(VALID)).status).toBe(200);
    });

    it("falha apenas quando nenhum canal funciona", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("discord em baixo")));
        sendMail.mockRejectedValue(new Error("smtp em baixo"));

        expect((await post(VALID)).status).toBe(500);
    });
});

describe("idioma do email ao cliente", () => {
    const clientEmail = () => sendMail.mock.calls[0][0] as { subject: string; html: string };

    it("PT quando o formulário é submetido em português", async () => {
        await post({ ...VALID, idioma: "pt" });
        expect(clientEmail().subject).toContain("Recebemos o seu pedido");
        expect(clientEmail().html).toContain('lang="pt"');
    });

    it("EN quando o formulário é submetido em inglês", async () => {
        // O `idioma` era ignorado: o email saía sempre em português.
        await post({ ...VALID, idioma: "en" });
        expect(clientEmail().subject).toContain("We received your quote request");
        expect(clientEmail().html).toContain('lang="en"');
        expect(clientEmail().html).not.toContain("Obrigado pelo seu contacto");
    });
});

describe("escape de HTML no email ao cliente", () => {
    it("neutraliza marcação vinda dos campos do formulário", async () => {
        // Estes campos eram interpolados sem escapar, ao contrário do email
        // interno — um valor malicioso injetava HTML no email do cliente.
        await post({ ...VALID, pickup: '<img src=x onerror="alert(1)">' });

        const html = (sendMail.mock.calls[0][0] as { html: string }).html;
        expect(html).not.toContain("<img src=x");
        expect(html).toContain("&lt;img");
    });
});

describe("formatação de data no email ao cliente", () => {
    const html = () => (sendMail.mock.calls[0][0] as { html: string }).html;

    it("PT usa DD/MM/YYYY e 'às'", async () => {
        await post({ ...VALID, dateTime: "2026-09-01T10:30", idioma: "pt" });
        expect(html()).toContain("01/09/2026 às 10:30");
    });

    it("EN usa ISO e 'at' — o 'às' português não deve escapar", async () => {
        await post({ ...VALID, dateTime: "2026-09-01T10:30", idioma: "en" });
        expect(html()).toContain("2026-09-01 at 10:30");
        expect(html()).not.toContain("às");
    });

    it("data malformada devolve o original, não 'undefined/undefined'", async () => {
        // Antes destruturava o `split` sem validar e o cliente recebia lixo.
        await post({ ...VALID, dateTime: "lixo" });
        expect(html()).not.toContain("undefined");
    });
});

describe("escapeHtml", () => {
    it("escapa também a plica", async () => {
        await post({ ...VALID, name: "O'Brien" });
        const html = (sendMail.mock.calls[0][0] as { html: string }).html;

        expect(html).toContain("&#39;");
        expect(html).not.toContain("O'Brien");
    });
});

describe("preço e classe escolhida", () => {
    const email = () => sendMail.mock.calls[0][0] as { html: string };
    const discord = () =>
        JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);

    it("aceita o pedido sem preço — o CRM pode não ter conseguido cotar", async () => {
        expect((await post(VALID)).status).toBe(200);
    });

    it("regista o preço que o cliente viu, no email e no Discord", async () => {
        await post({
            ...VALID,
            vehicleClassCode: "premium-van",
            precoEstimado: 79.97,
            moeda: "EUR",
        });

        // Sem isto, quem responde ao lead não sabe que valor foi mostrado e
        // arrisca cotar outro.
        expect(email().html).toContain("79,97");
        const campos = discord().embeds[0].fields as { name: string; value: string }[];
        const preco = campos.find((f) => f.name.includes("Preço Mostrado"));
        expect(preco?.value).toContain("79,97");
        expect(preco?.value).toContain("premium-van");
    });

    it("recusa um preço negativo", async () => {
        const res = await post({ ...VALID, precoEstimado: -10 });
        expect(res.status).toBe(400);
    });
});

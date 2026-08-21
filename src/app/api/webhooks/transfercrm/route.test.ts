import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Recetor de webhooks do TransferCRM.
 *
 * A regra que estes testes protegem: **uma entrega assinada nunca deve devolver
 * 500**. O evento já foi recebido e verificado; rejeitá-lo faz o CRM reenviar
 * o mesmo evento indefinidamente, sem que a repetição resolva nada.
 *
 * Aconteceu em produção: o registo do evento chama o cliente do CRM, que lança
 * quando a configuração falta, e não havia nada a apanhar isso.
 */

const recordStatusEvent = vi.fn();

vi.mock("@/modules/booking-engine/booking-engine.service", () => ({
    getBookingEngineService: () => ({ recordStatusEvent }),
}));

const { POST } = await import("./route");

const SEGREDO = "segredo-de-teste-com-mais-de-16-caracteres";

function entrega(corpo: unknown, opcoes?: { eventId?: string; segredo?: string }) {
    const body = JSON.stringify(corpo);
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = createHmac("sha256", opcoes?.segredo ?? SEGREDO)
        .update(`${ts}.${body}`)
        .digest("hex");

    return POST(
        new Request("https://www.way2go.pt/api/webhooks/transfercrm/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "X-Webhook-Timestamp": ts,
                "X-Webhook-Signature": sig,
                "X-Webhook-Event": String((corpo as { event?: string }).event ?? ""),
                ...(opcoes?.eventId ? { "X-Webhook-Event-Id": opcoes.eventId } : {}),
            },
            body,
        }),
    );
}

const EVENTO = {
    event: "order.status_changed",
    data: { booking_id: 4321, status: "confirmed" },
};

beforeEach(() => {
    recordStatusEvent.mockReset();
    recordStatusEvent.mockResolvedValue(undefined);
    vi.stubEnv("TRANSFERCRM_WEBHOOK_SECRET", SEGREDO);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("verificação de assinatura", () => {
    it("aceita uma entrega bem assinada", async () => {
        const res = await entrega(EVENTO, { eventId: "evt_ok_1" });
        expect(res.status).toBe(200);
        expect(recordStatusEvent).toHaveBeenCalledOnce();
    });

    it("recusa uma assinatura de outro segredo", async () => {
        const res = await entrega(EVENTO, { eventId: "evt_mau", segredo: "outro-segredo-com-16-chars" });
        expect(res.status).toBe(401);
        expect(recordStatusEvent).not.toHaveBeenCalled();
    });

    it("responde 202 quando o segredo não está configurado", async () => {
        vi.stubEnv("TRANSFERCRM_WEBHOOK_SECRET", "");
        const res = await entrega(EVENTO, { eventId: "evt_sem_segredo" });

        // 202 e não 401: distingue "mal configurado" de "assinatura inválida",
        // que é o que permitiu diagnosticar o problema em produção.
        expect(res.status).toBe(202);
    });
});

describe("regressão: uma entrega assinada nunca devolve 500", () => {
    it("o evento é aceite mesmo quando o registo interno falha", async () => {
        recordStatusEvent.mockRejectedValue(new Error("TransferCRM config missing."));

        const res = await entrega(EVENTO, { eventId: "evt_falha_registo" });

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({ ok: true });
    });
});

describe("deduplicação", () => {
    it("o mesmo event_id só é processado uma vez", async () => {
        const primeiro = await entrega(EVENTO, { eventId: "evt_repetido" });
        const segundo = await entrega(EVENTO, { eventId: "evt_repetido" });

        expect(primeiro.status).toBe(200);
        expect(segundo.status).toBe(200);
        await expect(segundo.json()).resolves.toMatchObject({ duplicate: true });

        // O CRM reenvia com o mesmo id; processar duas vezes duplicaria o
        // histórico de estados da reserva.
        expect(recordStatusEvent).toHaveBeenCalledOnce();
    });

    it("eventos distintos são ambos processados", async () => {
        await entrega(EVENTO, { eventId: "evt_a" });
        await entrega(EVENTO, { eventId: "evt_b" });
        expect(recordStatusEvent).toHaveBeenCalledTimes(2);
    });
});

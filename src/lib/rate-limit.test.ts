import { afterEach, describe, expect, it, vi } from "vitest";

import { __resetRateLimitState, clientKey, rateLimit } from "./rate-limit";

afterEach(() => {
    __resetRateLimitState();
    vi.useRealTimers();
});

describe("rateLimit", () => {
    it("permite até ao limite e bloqueia a partir daí", () => {
        for (let i = 1; i <= 3; i++) {
            expect(rateLimit("a", 3, 60_000).allowed).toBe(true);
        }
        expect(rateLimit("a", 3, 60_000).allowed).toBe(false);
    });

    it("conta cada chave separadamente", () => {
        expect(rateLimit("a", 1, 60_000).allowed).toBe(true);
        expect(rateLimit("a", 1, 60_000).allowed).toBe(false);
        expect(rateLimit("b", 1, 60_000).allowed).toBe(true);
    });

    it("decrementa o contador de pedidos restantes", () => {
        expect(rateLimit("a", 3, 60_000).remaining).toBe(2);
        expect(rateLimit("a", 3, 60_000).remaining).toBe(1);
        expect(rateLimit("a", 3, 60_000).remaining).toBe(0);
    });

    it("reabre a janela depois de expirar", () => {
        vi.useFakeTimers();
        expect(rateLimit("a", 1, 60_000).allowed).toBe(true);
        expect(rateLimit("a", 1, 60_000).allowed).toBe(false);

        vi.advanceTimersByTime(60_001);
        expect(rateLimit("a", 1, 60_000).allowed).toBe(true);
    });

    it("devolve um Retry-After utilizável quando bloqueia", () => {
        vi.useFakeTimers();
        rateLimit("a", 1, 60_000);
        const blocked = rateLimit("a", 1, 60_000);

        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
        expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    });
});

describe("clientKey", () => {
    const req = (headers: Record<string, string>) => new Request("https://x.pt", { headers });

    it("usa o primeiro IP de x-forwarded-for", () => {
        expect(clientKey(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    });

    it("recorre a x-real-ip", () => {
        expect(clientKey(req({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    });

    it("degrada para uma chave partilhada sem cabeçalhos de proxy", () => {
        // Preferível a devolver uma chave única por pedido, que desligaria o limite.
        expect(clientKey(req({}))).toBe("desconhecido");
    });
});

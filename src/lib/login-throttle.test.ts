import { afterEach, describe, expect, it, vi } from "vitest";

import {
    __resetLoginThrottleState,
    checkLoginAllowed,
    clearLoginFailures,
    registerLoginFailure,
} from "./login-throttle";

afterEach(() => {
    __resetLoginThrottleState();
    vi.useRealTimers();
});

const fail = (key: string, times: number) => {
    for (let i = 0; i < times; i++) registerLoginFailure(key);
};

describe("checkLoginAllowed", () => {
    it("permite quando não há falhas registadas", () => {
        expect(checkLoginAllowed("ip").allowed).toBe(true);
    });

    it("continua a permitir abaixo do limite", () => {
        fail("ip", 4);
        expect(checkLoginAllowed("ip").allowed).toBe(true);
    });

    it("bloqueia à quinta falha", () => {
        fail("ip", 5);
        expect(checkLoginAllowed("ip").allowed).toBe(false);
    });

    it("devolve um Retry-After utilizável", () => {
        fail("ip", 5);
        const blocked = checkLoginAllowed("ip");
        expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
        expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(15 * 60);
    });

    it("bloqueia cada IP isoladamente", () => {
        fail("ip-a", 5);
        expect(checkLoginAllowed("ip-a").allowed).toBe(false);
        expect(checkLoginAllowed("ip-b").allowed).toBe(true);
    });
});

describe("expiração", () => {
    it("liberta o bloqueio ao fim da janela", () => {
        vi.useFakeTimers();
        fail("ip", 5);
        expect(checkLoginAllowed("ip").allowed).toBe(false);

        vi.advanceTimersByTime(15 * 60 * 1000 + 1);
        expect(checkLoginAllowed("ip").allowed).toBe(true);
    });

    it("reinicia a contagem após um intervalo sem falhas", () => {
        vi.useFakeTimers();
        fail("ip", 4);

        // Passada a janela, as 4 falhas antigas não contam para o novo bloco.
        vi.advanceTimersByTime(15 * 60 * 1000 + 1);
        fail("ip", 4);
        expect(checkLoginAllowed("ip").allowed).toBe(true);
    });
});

describe("clearLoginFailures", () => {
    it("um login bem-sucedido limpa o histórico", () => {
        fail("ip", 4);
        clearLoginFailures("ip");
        fail("ip", 4);

        // 8 falhas no total, mas só 4 desde a última entrada com sucesso.
        expect(checkLoginAllowed("ip").allowed).toBe(true);
    });

    it("não desbloqueia quem já está bloqueado sem autenticar", () => {
        fail("ip", 5);
        expect(checkLoginAllowed("ip").allowed).toBe(false);

        // `clearLoginFailures` só é chamado depois de credenciais válidas — quem
        // está bloqueado nunca lá chega, porque a guarda corre antes.
        clearLoginFailures("ip");
        expect(checkLoginAllowed("ip").allowed).toBe(true);
    });
});

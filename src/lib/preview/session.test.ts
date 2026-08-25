import { afterEach, describe, expect, it, vi } from "vitest";

import { __resetSettingsCache } from "@/lib/site-settings/resolve";

import {
    getPreviewSessionSecret,
    isComingSoonEnabled,
    signPreviewSession,
    verifyPreviewSession,
} from "./session";

const SEGREDO = "um-segredo-com-mais-de-16-caracteres";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
});

describe("assinatura da sessão", () => {
    it("aceita um token que assinou", async () => {
        expect(await verifyPreviewSession(SEGREDO, await signPreviewSession(SEGREDO, 3600))).toBe(true);
    });

    it("recusa um token assinado com outro segredo", async () => {
        const token = await signPreviewSession("outro-segredo-com-16-caracteres", 3600);
        expect(await verifyPreviewSession(SEGREDO, token)).toBe(false);
    });

    it("recusa um token adulterado", async () => {
        const token = await signPreviewSession(SEGREDO, 3600);
        const [payload, sig] = token.split(".");
        // Payload alterado, assinatura antiga: é o ataque óbvio contra este desenho.
        const forjado = `${Buffer.from('{"role":"preview","exp":9999999999,"v":1}').toString("base64url")}.${sig}`;
        expect(forjado).not.toBe(token);
        expect(await verifyPreviewSession(SEGREDO, forjado)).toBe(false);
        expect(payload).toBeTruthy();
    });

    it("recusa lixo e vazio", async () => {
        for (const t of [undefined, "", "sem-separador", "a.b", "....."]) {
            expect(await verifyPreviewSession(SEGREDO, t)).toBe(false);
        }
    });

    it("recusa um token expirado", async () => {
        const token = await signPreviewSession(SEGREDO, 60);
        expect(await verifyPreviewSession(SEGREDO, token)).toBe(true);

        // Relógio adiantado depois de assinar: o Web Crypto não se dá bem com
        // timers falsos, por isso mexe-se no `Date.now` em vez do temporizador.
        const agora = Date.now;
        Date.now = () => agora() + 61_000;
        try {
            expect(await verifyPreviewSession(SEGREDO, token)).toBe(false);
        } finally {
            Date.now = agora;
        }
    });
});

describe("segredo", () => {
    it("recusa segredos curtos — um segredo fraco não protege nada", () => {
        vi.stubEnv("SITE_PREVIEW_SESSION_SECRET", "curto");
        vi.stubEnv("W2G_MASTER_ADMIN_SESSION_SECRET", "");
        vi.stubEnv("PARTNER_SESSION_SECRET", "");
        expect(() => getPreviewSessionSecret()).toThrow();
    });

    it("aceita um segredo com comprimento suficiente", () => {
        vi.stubEnv("SITE_PREVIEW_SESSION_SECRET", SEGREDO);
        expect(getPreviewSessionSecret()).toBe(SEGREDO);
    });
});

describe("interruptor do portão", () => {
    /**
     * O portão passou a vir do painel de administração. Sem base de dados
     * configurada — que é o caso aqui — o resolvedor recorre a
     * `SITE_COMING_SOON`, e este teste continua a valer para essa via.
     */
    it("sem base de dados, só está ativo com SITE_COMING_SOON=1", async () => {
        for (const [valor, esperado] of [
            ["1", true],
            ["0", false],
            ["true", false],
            ["", false],
        ] as const) {
            vi.stubEnv("SITE_COMING_SOON", valor);
            __resetSettingsCache();
            await expect(isComingSoonEnabled(), `valor=${valor}`).resolves.toBe(esperado);
        }
    });

    it("por omissão o site fica aberto", async () => {
        vi.stubEnv("SITE_COMING_SOON", "");
        __resetSettingsCache();

        // Um erro de configuração nunca pode fechar o site sozinho.
        await expect(isComingSoonEnabled()).resolves.toBe(false);
    });
});

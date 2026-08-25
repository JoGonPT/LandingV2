import { describe, expect, it } from "vitest";

import {
    GENERATED_PASSWORD_LENGTH,
    checkPasswordStrength,
    generateStrongPassword,
    hashPassword,
    verifyPassword,
} from "./password";

/**
 * A password de administração abre o painel que desliga a cobrança de cartões.
 * O que estes testes protegem é sobretudo uma coisa: **a password em claro
 * nunca aparece no que é guardado.**
 */

describe("gerador", () => {
    it("tem o comprimento pedido", () => {
        expect(generateStrongPassword()).toHaveLength(GENERATED_PASSWORD_LENGTH);
        expect(generateStrongPassword(40)).toHaveLength(40);
    });

    it("não repete", () => {
        const amostras = new Set(Array.from({ length: 200 }, () => generateStrongPassword()));
        expect(amostras.size).toBe(200);
    });

    it("evita caracteres que se confundem à leitura", () => {
        // Vai ser lida de um ecrã e escrita à mão. `O`/`0` e `l`/`1`/`I` custam
        // tentativas falhadas e a suspeita de que o sistema está avariado.
        const juntas = Array.from({ length: 100 }, () => generateStrongPassword()).join("");
        for (const ambiguo of ["O", "0", "l", "1", "I"]) {
            expect(juntas, `contém ${ambiguo}`).not.toContain(ambiguo);
        }
    });

    it("o que gera passa sempre as exigências de força", () => {
        // 3000 amostras, não 50. O defeito que este teste apanhou aparecia em
        // cerca de meio por cento das passwords — com 50 falhava uma vez em
        // cada quatro execuções, o que se lê como teste instável e não como
        // defeito. Com esta amostragem, ou está certo ou falha sempre.
        for (let i = 0; i < 3000; i++) {
            const p = generateStrongPassword();
            const r = checkPasswordStrength(p);
            expect(r.ok, `${p} → ${r.problems.join(" ")}`).toBe(true);
        }
    });

    it("nunca gera três caracteres iguais seguidos", () => {
        for (let i = 0; i < 3000; i++) {
            expect(/(.){2,}/.test(generateStrongPassword())).toBe(false);
        }
    });
});

describe("hash e verificação", () => {
    it("aceita a password correta", async () => {
        const password = generateStrongPassword();
        const stored = await hashPassword(password);

        await expect(verifyPassword(password, stored)).resolves.toBe(true);
    });

    it("recusa a errada", async () => {
        const stored = await hashPassword("uma-password-qualquer-Aa1!");

        await expect(verifyPassword("outra-password-Aa1!", stored)).resolves.toBe(false);
        await expect(verifyPassword("", stored)).resolves.toBe(false);
    });

    it("a password em claro não aparece no que é guardado", async () => {
        const password = "Segredo-Muito-Especifico-99!";
        const stored = await hashPassword(password);

        const serializado = JSON.stringify(stored);
        expect(serializado).not.toContain(password);
        expect(serializado).not.toContain("Segredo");
    });

    it("a mesma password dá hashes diferentes — o sal é aleatório", async () => {
        const a = await hashPassword("mesma-password-Aa1!");
        const b = await hashPassword("mesma-password-Aa1!");

        expect(a.salt).not.toBe(b.salt);
        expect(a.hash).not.toBe(b.hash);
        // E mesmo assim as duas verificam.
        await expect(verifyPassword("mesma-password-Aa1!", a)).resolves.toBe(true);
        await expect(verifyPassword("mesma-password-Aa1!", b)).resolves.toBe(true);
    });

    it("não rebenta com um registo corrompido", async () => {
        await expect(verifyPassword("x", { hash: "não-é-hex", salt: "" })).resolves.toBe(false);
        await expect(verifyPassword("x", { hash: "", salt: "abc" })).resolves.toBe(false);
    });
});

describe("exigências de força", () => {
    it("recusa as previsíveis", () => {
        for (const fraca of ["way2go2026", "Way2Go!2026admin", "password123!A", "AAAAaaaa1111!!!!"]) {
            expect(checkPasswordStrength(fraca).ok, fraca).toBe(false);
        }
    });

    it("explica o que falta em vez de dizer só que não serve", () => {
        const r = checkPasswordStrength("curta");
        expect(r.ok).toBe(false);
        expect(r.problems.length).toBeGreaterThan(1);
        expect(r.problems.every((p) => p.length > 10)).toBe(true);
    });

    it("aceita uma escolhida à mão que cumpra tudo", () => {
        expect(checkPasswordStrength("Trovoada-Serena-47#kx").ok).toBe(true);
    });
});

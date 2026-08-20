import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Testes ao `config.matcher` do middleware.
 *
 * Três bugs distintos já nasceram deste padrão, todos da mesma causa: uma
 * exclusão mal delimitada ou em falta, silenciosa em produção.
 *
 *  1. `api` sem delimitador apanhava `/apitest`, `/apifoo`, `/api-docs`
 *  2. `robots.txt`, `sitemap.xml`, `icon` e `opengraph-image` em falta
 *  3. `service-worker.js` na lista, quando o ficheiro é `driver-sw.js`
 *
 * O padrão é lido do código-fonte em vez de copiado para aqui — uma cópia
 * podia dessincronizar-se e o teste passaria a validar o padrão errado.
 */

function loadMatcherPattern(): string {
    const source = readFileSync(join(process.cwd(), "src/middleware.ts"), "utf8");

    const block = source.match(/matcher:\s*\[([\s\S]*?)\]/);
    if (!block) throw new Error("Não encontrei `matcher: [...]` em src/middleware.ts");

    // Os comentários dentro do bloco citam caminhos entre aspas ("api", …), que
    // seriam apanhados como se fossem o padrão. Removê-los primeiro.
    const withoutComments = block[1].replace(/\/\/[^\n]*/g, "");

    const literals = withoutComments.match(/"(?:[^"\\]|\\.)*"/g);
    if (!literals?.length) throw new Error("Não encontrei nenhuma string em `matcher`");
    if (literals.length > 1) {
        throw new Error(
            `O matcher passou a ter ${literals.length} padrões; este teste assume um só.`,
        );
    }

    // JSON.parse resolve os escapes (`\\.` no código → `\.` no valor).
    return JSON.parse(literals[0]) as string;
}

const matches = (() => {
    const re = new RegExp(`^${loadMatcherPattern()}$`);
    return (pathname: string) => re.test(pathname);
})();

describe("matcher do middleware", () => {
    describe("processa páginas", () => {
        it.each([
            "/",
            "/pt/",
            "/en/",
            "/pt/legal/terms/",
            "/pt/legal/privacy/",
            "/partner/",
            "/partner/book/",
            "/internal/admin/",
            "/drivers-pwa/login/",
            "/qualquercoisa/",
        ])("%s", (pathname) => {
            expect(matches(pathname)).toBe(true);
        });
    });

    describe("ignora rotas de API", () => {
        it.each(["/api", "/api/send-budget", "/api/send-budget/", "/api/webhooks/stripe"])(
            "%s",
            (pathname) => {
                expect(matches(pathname)).toBe(false);
            },
        );
    });

    describe("regressão: caminhos iniciados por 'api' não são rotas de API", () => {
        // Estes chegaram a saltar o middleware por completo.
        it.each(["/apitest/", "/apifoo/", "/api-docs/", "/apple/"])("%s", (pathname) => {
            expect(matches(pathname)).toBe(true);
        });
    });

    describe("regressão: rotas de metadata têm de ser servidas diretamente", () => {
        // Estas eram redirecionadas para /pt/... e devolviam 404.
        it.each([
            "/robots.txt",
            "/sitemap.xml",
            "/icon",
            "/pt/opengraph-image",
            "/en/opengraph-image",
        ])("%s", (pathname) => {
            expect(matches(pathname)).toBe(false);
        });
    });

    describe("regressão: o service worker dos motoristas tem de ser alcançável", () => {
        it("/driver-sw.js", () => {
            expect(matches("/driver-sw.js")).toBe(false);
        });
    });

    describe("ignora internos do Next e ficheiros estáticos", () => {
        it.each([
            "/_next/static/chunks/main.js",
            "/_next/image",
            "/favicon.ico",
            "/hero-chauffeur.webp",
            "/algo.png",
            "/fonte.woff2",
        ])("%s", (pathname) => {
            expect(matches(pathname)).toBe(false);
        });
    });
});

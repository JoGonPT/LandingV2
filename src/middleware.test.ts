import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "./middleware";

/**
 * Testes de comportamento do middleware.
 *
 * Este é o ficheiro com mais correções urgentes no histórico do repositório
 * (`e6b7919`, `14ddc54`, `7bfdab4`) e não tinha um único teste. Cada bloco
 * abaixo fixa um comportamento que já esteve partido em produção.
 *
 * Corre sem Supabase configurado de propósito: `applySupabaseSessionToResponse`
 * faz early-return quando as variáveis não existem, pelo que o encaminhamento
 * é exercitado isoladamente.
 */

function request(path: string, init?: { headers?: Record<string, string>; host?: string }) {
    const host = init?.host ?? "www.way2go.pt";
    return new NextRequest(`https://${host}${path}`, {
        headers: { host, ...(init?.headers ?? {}) },
    });
}

/** Next devolve o destino da reescrita neste cabeçalho interno. */
const rewriteTarget = (res: Response) => {
    const value = res.headers.get("x-middleware-rewrite");
    return value ? new URL(value).pathname : null;
};

const locationPath = (res: Response) => {
    const value = res.headers.get("location");
    return value ? new URL(value).pathname : null;
};

describe("negociação de idioma", () => {
    it("reescreve a raiz para o locale por defeito", async () => {
        const res = await middleware(request("/"));
        expect(rewriteTarget(res)).toBe("/pt");
        expect(res.status).toBe(200); // rewrite, não redirect — o URL não muda
    });

    it("reescreve a raiz para EN quando o browser o pede", async () => {
        const res = await middleware(request("/", { headers: { "accept-language": "en-GB,en;q=0.9" } }));
        expect(rewriteTarget(res)).toBe("/en");
    });

    it("redireciona caminhos sem locale", async () => {
        const res = await middleware(request("/legal/privacy/"));
        expect(res.status).toBe(307);
        expect(locationPath(res)).toBe("/pt/legal/privacy/");
    });

    it("deixa passar caminhos que já trazem locale", async () => {
        for (const path of ["/pt/", "/en/", "/pt/legal/terms/"]) {
            const res = await middleware(request(path));
            expect(locationPath(res), path).toBeNull();
            expect(rewriteTarget(res), path).toBeNull();
        }
    });
});

describe("regressão: pedidos sem Accept-Language (commit e6b7919)", () => {
    // Bots, crawlers e serviços de verificação não enviam o cabeçalho. O
    // Negotiator devolvia ["*"], que não é um locale válido e rebentava o
    // `matchLocale` — o middleware caía e o site respondia 500.
    it("não rebenta sem cabeçalho e assume PT", async () => {
        const res = await middleware(request("/"));
        expect(rewriteTarget(res)).toBe("/pt");
    });

    it("não rebenta com Accept-Language: *", async () => {
        const res = await middleware(request("/", { headers: { "accept-language": "*" } }));
        expect(rewriteTarget(res)).toBe("/pt");
    });

    it("não rebenta com um Accept-Language sem correspondência", async () => {
        const res = await middleware(request("/", { headers: { "accept-language": "xx-YY" } }));
        expect(rewriteTarget(res)).toBe("/pt");
    });
});

describe("regressão: a raiz é reescrita, não redirecionada (commit 14ddc54)", () => {
    // Um 308 de `/` para `/pt` fazia o domínio raiz saltar visivelmente para o
    // caminho com locale. A reescrita serve o conteúdo mantendo o URL.
    it("`/` não devolve redirect", async () => {
        const res = await middleware(request("/"));
        expect(res.status).not.toBe(307);
        expect(res.status).not.toBe(308);
        expect(locationPath(res)).toBeNull();
    });
});

describe("secções não localizadas", () => {
    it("deixa passar sem tocar", async () => {
        for (const path of ["/partner/", "/internal/admin/", "/master-admin/finance/"]) {
            const res = await middleware(request(path));
            expect(locationPath(res), path).toBeNull();
            expect(rewriteTarget(res), path).toBeNull();
        }
    });

    it("remove prefixos de locale postos por engano", async () => {
        const res = await middleware(request("/pt/partner/book/"));
        expect(res.status).toBe(308);
        expect(locationPath(res)).toBe("/partner/book/");
    });
});

describe("subdomínio dos motoristas", () => {
    it("reescreve o host drivers.* para /drivers-pwa", async () => {
        const res = await middleware(request("/login/", { host: "drivers.way2go.pt" }));
        expect(rewriteTarget(res)).toBe("/drivers-pwa/login/");
    });

    it("reescreve também a raiz desse host", async () => {
        // Sem barra final: o `NextURL` normaliza-a ao atribuir o pathname.
        // Confirmado contra o servidor a correr — `drivers.way2go.pt/` serve a
        // PWA (307 para `/drivers-pwa/login/` quando não há sessão, depois 200).
        const res = await middleware(request("/", { host: "drivers.way2go.pt" }));
        expect(rewriteTarget(res)).toBe("/drivers-pwa");
    });
});

describe("cabeçalho de locale para o layout raiz", () => {
    // Sem isto o `<html lang>` era sempre `pt`, inclusive em `/en`.
    const requestLocale = (res: Response) =>
        res.headers.get("x-middleware-request-x-w2g-locale");

    it("propaga PT", async () => {
        expect(requestLocale(await middleware(request("/pt/")))).toBe("pt");
    });

    it("propaga EN", async () => {
        expect(requestLocale(await middleware(request("/en/legal/terms/")))).toBe("en");
    });

    it("propaga o locale negociado na reescrita da raiz", async () => {
        const res = await middleware(
            request("/", { headers: { "accept-language": "en-GB,en;q=0.9" } }),
        );
        expect(requestLocale(res)).toBe("en");
    });
});

describe("ecrã de Em breve", () => {
    // Regressão: `/em-breve` caía na lógica de idioma, era reescrito para
    // `/pt/em-breve`, e esse caminho voltava a ser trancado — um ciclo.
    it("é servido tal e qual, sem prefixo de idioma", async () => {
        for (const path of ["/em-breve", "/em-breve/"]) {
            const res = await middleware(request(path));
            expect(locationPath(res), path).toBeNull();
            expect(rewriteTarget(res), path).toBeNull();
        }
    });

    it("sem o portão ligado, o site público é servido normalmente", async () => {
        // `SITE_COMING_SOON` não está definido nestes testes.
        const res = await middleware(request("/pt/"));
        expect(rewriteTarget(res)).toBeNull();
        expect(locationPath(res)).toBeNull();
    });
});

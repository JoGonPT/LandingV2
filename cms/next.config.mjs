/**
 * Configuração do CMS.
 *
 * Deliberadamente mínima e separada da do site. O `next.config.ts` da raiz tem
 * CSP, cabeçalhos de segurança e regras de cache pensados para o site público —
 * nada disso se aplica a um painel de administração, e copiá-los para aqui só
 * criaria duas cópias a divergir.
 *
 * `.mjs` e não `.ts` porque o `withPayload` é aplicado por cima e a documentação
 * do Payload pede ESM.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { withPayload } from "@payloadcms/next/withPayload";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  /**
   * Fixa a raiz do workspace nesta pasta.
   *
   * Sem isto, o Next sobe a árvore à procura de um lockfile, encontra o do site
   * (e outro fora do repositório), e passa a tratar o projeto do site como parte
   * deste build — chegou a tentar compilar o `middleware.ts` da raiz e falhou a
   * resolver `@/lib/preview/session`, que é código do site.
   *
   * O CMS tem de ser cego para o site. É essa a razão de ser desta arquitetura.
   */
  turbopack: {
    root: dirname,
  },
  outputFileTracingRoot: dirname,
};

export default withPayload(nextConfig);

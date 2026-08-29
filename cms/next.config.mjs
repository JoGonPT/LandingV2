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
/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
};

export default nextConfig;

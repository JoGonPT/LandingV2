import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * `'unsafe-inline'` em `script-src` continua presente — o Next injeta scripts
 * inline (hidratação, RSC payload) e o JSON-LD é inline. Removê-lo exige CSP
 * baseada em nonce, o que obriga a gerar um nonce por pedido no middleware e a
 * mover a política para lá, porque `next.config.ts` só emite cabeçalhos
 * estáticos. É trabalho com risco real de partir o Stripe e a hidratação, e
 * fica registado como item próprio em docs/TODO.md em vez de ser feito de
 * passagem.
 *
 * `https://wp.way2go.pt` foi removido do `connect-src`: era o backend WordPress
 * já desativado.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' blob: https://js.stripe.com https://m.stripe.network https://transfercrm.com https://*.transfercrm.com",
  "script-src-elem 'self' 'unsafe-inline' blob: https://js.stripe.com https://m.stripe.network https://transfercrm.com https://*.transfercrm.com",
  "worker-src 'self' blob:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://m.stripe.network https://www.google.com https://maps.google.com https://transfercrm.com https://*.transfercrm.com",
  "child-src 'self' blob: https://js.stripe.com https://hooks.stripe.com https://m.stripe.network https://www.google.com https://maps.google.com https://transfercrm.com https://*.transfercrm.com",
  "connect-src 'self' https://api.stripe.com https://m.stripe.network https://transfercrm.com https://*.transfercrm.com https://*.supabase.co",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Impede que o site seja embebido noutro — equivale a X-Frame-Options: DENY,
  // mas é a diretiva que os browsers modernos respeitam.
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Cabeçalhos de segurança que faltavam por completo.
 *
 * Na Vercel alguns destes vinham por omissão da plataforma; num servidor Node
 * próprio (Cloudways) **não vêm** — passam a ser responsabilidade da app.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Impede o browser de adivinhar o tipo de conteúdo e executar como script
  // algo servido como imagem ou texto.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Não vaza o caminho completo para sites externos, mas mantém a origem —
  // preserva a atribuição de tráfego no analytics.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O site não usa nenhuma destas APIs; negá-las limita o estrago de um script
  // de terceiros comprometido.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  // HSTS com 2 anos. `preload` fica **de fora** de propósito: é praticamente
  // irreversível e exige submissão manual à lista dos browsers. Acrescentar só
  // com decisão explícita.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  /** Otimização ativa: o `sharp` está nas dependências, necessário em self-hosted (Cloudways). */
  images: {
    formats: ["image/avif", "image/webp"],
  },
  trailingSlash: true,
  /** Evita 308 de `/api/...` → `/api/.../` (Stripe e outros clientes POST podem não seguir redirect ou invalidar o corpo). */
  skipTrailingSlashRedirect: true,
  /** Não anunciar a stack. */
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Assets com hash no nome: o conteúdo nunca muda para um dado URL.
        // Sem CDN à frente (Cloudways é origem única), este cabeçalho é o que
        // impede o browser de voltar a pedir o mesmo bundle a cada visita.
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Sem regra para `/_next/image`: o otimizador define o seu próprio
      // `Cache-Control` (medido: `public, max-age=86400, must-revalidate`) e
      // ignora o que se puser aqui. Uma regra inerte só enganaria quem a lesse.
      // Para afinar, usar `images.minimumCacheTTL` em vez de cabeçalhos.
      {
        // Ficheiros de `public/`: o nome não tem hash, por isso não podem ser
        // `immutable`. Um dia de cache com revalidação em segundo plano.
        source: "/(.*)\\.(webp|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        // O service worker tem de ser sempre revalidado, senão os motoristas
        // ficam presos a uma versão antiga.
        source: "/driver-sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
      },
      {
        // Respostas de API nunca são cacheadas por intermediários.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;

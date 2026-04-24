import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' blob: https://js.stripe.com https://m.stripe.network https://transfercrm.com https://*.transfercrm.com",
  "script-src-elem 'self' 'unsafe-inline' blob: https://js.stripe.com https://m.stripe.network https://transfercrm.com https://*.transfercrm.com",
  "worker-src 'self' blob:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://m.stripe.network https://www.google.com https://maps.google.com https://transfercrm.com https://*.transfercrm.com",
  "child-src 'self' blob: https://js.stripe.com https://hooks.stripe.com https://m.stripe.network https://www.google.com https://maps.google.com https://transfercrm.com https://*.transfercrm.com",
  "connect-src 'self' https://api.stripe.com https://m.stripe.network https://transfercrm.com https://*.transfercrm.com",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: { unoptimized: true },
  trailingSlash: true,
  /** Evita 308 de `/api/...` → `/api/.../` (Stripe e outros clientes POST podem não seguir redirect ou invalidar o corpo). */
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;

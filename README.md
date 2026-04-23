# Way2Go Landing (V2)

Monorepo **Next.js 15** (App Router) com **React 19** e **TypeScript**: marketing multilíngue (PT/EN), reservas com integração **TransferCRM** e **Stripe**, portal **parceiro B2B**, **PWA de motoristas** com **Supabase Auth**, áreas **admin** e webhooks.

## Pré-requisitos

- **Node.js 20+** (ver `engines` em [package.json](package.json))
- npm

## Instalação e scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run lint     # ESLint, max-warnings=0
npm run test     # Vitest (unitários em src/lib)
```

## Arquitetura BFF: nativo Next.js vs Nest

| Área | Implementação |
|------|----------------|
| **Pagamentos (B2C Stripe)** | **Nativo** — `POST /api/payments/create-intent`, `GET /api/payments/checkout-status` (e aliases `/api/checkout/intent`, `/api/checkout/status`). Lógica em [`src/lib/payments/payments-app-service.ts`](src/lib/payments/payments-app-service.ts). |
| **Webhook Stripe** | **Nativo** — `POST /api/webhooks/stripe` (sem proxy Nest). |
| **Faturação (Vendus)** | **Nativo** — `POST /api/faturamento/issue`, `POST /api/faturamento/issue-for-booking` (admin); variáveis `VENDUS_*` em [`.env.example`](.env.example). |
| **Cotação / book público** | **Proxy Nest** — rotas como `POST /api/public/quote`, `POST /api/booking/quote`, `POST /api/public/book` reencaminham para o HTTP do projeto [nestjs-api](nestjs-api). |
| **Portal parceiro** | **Proxy Nest** — `POST /api/partner/quote`, `POST /api/partner/book-account`, etc. |

**`NEST_API_BASE_URL`:** em local, tipicamente `http://127.0.0.1:3001`. Em produção, a URL **HTTPS** do serviço Nest. Se o Nest estiver **no mesmo deploy / atrás do mesmo domínio público** que o Next, podes definir esta variável com o **próprio domínio canónico** do site (ex. `https://www.way2go.pt`), para o BFF chamar o upstream com TLS válido. O **PWA motorista** continua a exigir `NEST_API_BASE_URL` **explícita** (não usar só fallback de mesmo site); ver [`src/lib/nest-api-base-url.ts`](src/lib/nest-api-base-url.ts).

### Correr o Nest localmente (cotação / parceiro / drivers)

`POST /api/public/quote` e `POST /api/booking/quote` no Next são **proxies** para [nestjs-api](nestjs-api) (`POST /api/public/quote`), onde corre a cadeia esperada pelo CRM.

```bash
cd nestjs-api
npm install
npm run start:dev   # porta NEST_QUOTE_PORT ou 3001; lê o .env da raiz do repo
npm run build       # typecheck (tsc --noEmit); em produção usa-se normalmente tsx ou imagem com o mesmo comando que start:dev
```

## Variáveis de ambiente

Copiar [.env.example](.env.example) para `.env` e preencher. Grupos principais:

| Área | Variáveis (resumo) |
|------|---------------------|
| TransferCRM | `TRANSFERCRM_BASE_URL`, `TRANSFERCRM_BEARER_TOKEN`, `TRANSFERCRM_WEBHOOK_SECRET`, … |
| Stripe (checkout nativo) | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Moradas | `PLACES_PROVIDER`, `PLACES_COUNTRIES`, `GOOGLE_MAPS_API_KEY` (se Google) |
| Nest (proxy: quote/book/partner/drivers) | `NEST_API_BASE_URL` (HTTPS em prod.; pode ser o domínio do site se o Nest estiver no mesmo hostname); opcional `NEXT_PUBLIC_SITE_URL` / fallback Vercel; `NEST_PROXY_TIMEOUT_MS`. `NEST_QUOTE_PORT` só para correr `nestjs-api` em local |
| Faturação | `VENDUS_MODE`, `VENDUS_API_KEY`, `VENDUS_BASE_URL` (opcional) |
| Motoristas (PWA) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; opcional `DRIVER_TRANSFERCRM_ID` como fallback CRM; `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` para leituras servidor (ex.: atribuições) |
| Parceiro | `PARTNER_SESSION_SECRET`, `PARTNERS_JSON` ou `PARTNER_BOOKING_*` |
| Admin | `W2G_MASTER_ADMIN_PASSWORD`, segredos de sessão conforme `.env.example` |

## Deploy (Vercel)

Guia passo a passo: [docs/vercel-deploy.md](docs/vercel-deploy.md) — inclui fluxo **projeto Vercel já existente** (Git, env, redeploy, domínio, webhooks) e criação de projeto novo. Validar build: `npm run build`.

## Arquitetura de rotas (App Router)

| Caminho | Descrição |
|---------|-----------|
| `/[locale]` | Landing (pt, en), formulário de reserva, FAQ, legais |
| `/partner/*` | Portal parceiro: reserva, dashboard, checkout |
| `/drivers-pwa/*` | PWA motoristas (login, agenda, detalhe de reserva) |
| `/internal/admin/*` | Admin interno Way2Go |
| `/master-admin/*` | Master admin (ex.: finanças) |
| `/api/*` | Route Handlers (REST): booking, checkout, partner, drivers, webhooks, places, … |

O **middleware** ([src/middleware.ts](src/middleware.ts)) aplica locale PT/EN, rewrite do host `drivers.*` → `/drivers-pwa/*`, e refresh de sessão Supabase nas rotas do PWA motorista.

## APIs (resumo)

- **Reserva / cotação:** `api/booking/*`, `api/places/autocomplete` (parte do fluxo **proxy Nest** para quote/book público)
- **Checkout / pagamentos (nativo):** `api/payments/*`, `api/checkout/*`, `api/webhooks/stripe`
- **Faturação (nativo, admin):** `api/faturamento/*`
- **Parceiro:** `api/partner/auth`, `session`, `quote`, `book-account`, `bookings`, `credit`, `checkout/*`, … (**proxy Nest** onde aplicável)
- **Motoristas:** `api/drivers/auth/login`, `logout`, `session`; `api/drivers/bookings*`, `api/driver/my-jobs` (**proxy Nest**)
- **TransferCRM:** `api/webhooks/transfercrm`
- **Admin:** `api/internal/admin/*`, `api/master-admin/finance`

## Biblioteca (`src/lib`)

- `lib/transfercrm` — cliente B2B, validação, mapeamentos, webhook
- `lib/payments` — create-intent, checkout-status, webhook Stripe (B2C)
- `lib/checkout` — Stripe / fluxo de checkout (parceiro e helpers partilhados)
- `lib/partner` — sessão parceiro, crédito (ficheiro ou Supabase)
- `lib/drivers` — scope CRM por pedido, autorização de bookings, estado
- `lib/supabase` — cliente servidor SSR (`createSupabaseServerClient`, refresh no middleware)

## Base de dados (Supabase)

Migrações SQL em [supabase/migrations](supabase/migrations). O CLI espera [supabase/config.toml](supabase/config.toml) (gerado com `npx supabase init`).

### Alinhar repositório com o projecto hosted

1. Instalar/usar CLI: `npx supabase login`
2. Associar o projecto: `npx supabase link --project-ref <PROJECT_REF>` (ref no URL do dashboard)
3. Aplicar migrações locais ao remoto: `npx supabase db push`
4. Ou importar estado remoto para o repo: `npx supabase db pull` (gera/actualiza migrações conforme o remoto)

**Nota:** Se aplicares DDL pelo **Supabase MCP** (`apply_migration`), o nome/versão registado no remoto pode não coincidir com o prefixo do ficheiro em `supabase/migrations/`. Mantém um único fluxo (CLI ou MCP) para o histórico não divergir.

**Políticas `profiles`:** Em bases que já tinham políticas amplas (ex. `profiles_own_select_update`), a política `profiles_select_own` da migração `profiles_transfercrm_driver_id_rls` pode ser redundante; não a removes em migrações automáticas sem confirmar que não é a única política de `SELECT` na tua instância.

## Segurança

- **CSP** global em [next.config.ts](next.config.ts) (Stripe, iframes Google Maps, etc.)
- Segredos de serviço (`SUPABASE_SERVICE_ROLE_KEY`, tokens TransferCRM) apenas no servidor / env de deploy

## Testes

```bash
npm run test
```

Ficheiros `*.test.ts` principalmente em `src/lib/transfercrm`, `checkout`, `partner`.

## Deploy

Compatível com **Vercel** ou qualquer host Node que sirva `next start`. Variáveis de ambiente devem espelhar `.env.example` por ambiente (Preview/Production).

## Licença e contacto

Propriedade Way2Go / Transfer Profissional — ajustar conforme o contrato interno.

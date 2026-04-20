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

## API Nest (cotação pública)

`POST /api/public/quote` e `POST /api/booking/quote` no Next são **proxies** para o serviço em [nestjs-api](nestjs-api) (`POST /api/public/quote`), onde corre a validação e `postQuoteForBooking` (TransferCRM + distância).

```bash
cd nestjs-api
npm install
npm run start:dev   # porta NEST_QUOTE_PORT ou 3001; lê o .env da raiz do repo
npm run build       # typecheck (tsc --noEmit); em produção usa-se normalmente tsx ou imagem com o mesmo comando que start:dev
```

No `.env` da raiz: `NEST_API_BASE_URL=http://127.0.0.1:3001` (ou URL do deploy do Nest em produção).

## Variáveis de ambiente

Copiar [.env.example](.env.example) para `.env` e preencher. Grupos principais:

| Área | Variáveis (resumo) |
|------|---------------------|
| TransferCRM | `TRANSFERCRM_BASE_URL`, `TRANSFERCRM_BEARER_TOKEN`, `TRANSFERCRM_WEBHOOK_SECRET`, … |
| Stripe | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Moradas | `PLACES_PROVIDER`, `PLACES_COUNTRIES`, `GOOGLE_MAPS_API_KEY` (se Google) |
| Cotação (proxy) | `NEST_API_BASE_URL`, opcional `NEST_QUOTE_PORT` (só Nest) |
| Motoristas (PWA) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; opcional `DRIVER_TRANSFERCRM_ID` como fallback CRM; `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` para leituras servidor (ex.: atribuições) |
| Parceiro | `PARTNER_SESSION_SECRET`, `PARTNERS_JSON` ou `PARTNER_BOOKING_*` |
| Admin | `W2G_MASTER_ADMIN_PASSWORD`, segredos de sessão conforme `.env.example` |

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

- **Reserva / checkout:** `POST/GET` em `api/booking/*`, `api/checkout/*`, `api/places/autocomplete`
- **Parceiro:** `api/partner/auth`, `session`, `quote`, `book-account`, `bookings`, `credit`, `checkout/*`, …
- **Motoristas:** `api/drivers/auth/login`, `logout`, `session`; `api/drivers/bookings*`, `api/driver/my-jobs`
- **TransferCRM:** `api/webhooks/transfercrm`
- **Admin:** `api/internal/admin/*`, `api/master-admin/finance`

## Biblioteca (`src/lib`)

- `lib/transfercrm` — cliente B2B, validação, mapeamentos, webhook
- `lib/checkout` — Stripe / fluxo de checkout
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

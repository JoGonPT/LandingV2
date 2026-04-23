# Deploy na Vercel

O repositório inclui [`vercel.json`](../vercel.json) com `framework: nextjs`. O build local `npm run build` deve passar antes de confiar no deploy.

## Projeto Vercel já existente

Se o projeto **já está criado** e ligado ao Git:

1. **Settings → Git**: confirma o repositório e a branch de produção (ex. `main`). Cada `git push` nessa branch gera um novo deployment.
2. **Settings → Environment Variables**: garante todas as chaves de produção (sem `localhost`); vê a secção 2 abaixo. Depois de alterar secrets, faz **Deployments → … → Redeploy** no último deployment (ou um commit vazio) para o runtime as aplicar.
3. **Settings → Domains**: domínio personalizado e, se usares PWA motoristas, o subdomínio `drivers.*` no **mesmo** projeto (secção 3).
4. Atualiza **webhooks** TransferCRM/Stripe para o URL **https** final (secção 4).
5. **Deployments**: se um build falhar, abre o log; corrige env ou código e redeploy.

## 1. Criar o projeto (só se ainda não existir)

1. [vercel.com](https://vercel.com) → **Add New → Project** → importar este repositório Git.
2. **Framework**: Next.js (automático). **Root Directory**: raiz do repo.
3. **Build Command**: `npm run build` (default). **Install**: `npm install`.
4. Fazer o primeiro deploy (pode falhar até as variáveis estarem completas; corrige no passo seguinte e **Redeploy**).

## 2. Variáveis de ambiente (Production)

Em **Project → Settings → Environment Variables**, adiciona as chaves necessárias. Usa [`.env.example`](../.env.example) como lista completa; valores reais vêm do teu `.env` local (não commitado).

Marca **Production** (e **Preview** se quiseres staging com chaves de teste). Após alterações, **Deployments → … → Redeploy**.

### Arquitetura (resumo)

- **Pagamentos (Stripe B2C) e faturação (Vendus)** são tratados **nativamente** nas Next.js API Routes (`/api/payments/*`, `/api/webhooks/stripe`, `/api/faturamento/*`). Não dependem do Nest para esse fluxo.
- **Cotações públicas, `book` público e portal parceiro** continuam a usar o **proxy** da app Next para o serviço HTTP em `nestjs-api/` (`NEST_API_BASE_URL`).
- **Monólito no mesmo domínio:** em Vercel, para o BFF conseguir chamar o Nest atrás do **mesmo** hostname público, define `NEST_API_BASE_URL` com o **próprio domínio canónico do site** (ex. `https://www.way2go.pt`), **sem** barra final. Garante também `NEXT_PUBLIC_SITE_URL` com o mesmo origin para o fallback em `getNestApiBaseUrl()` quando `NEST_API_BASE_URL` estiver vazio. O PWA motorista (`/api/drivers/*`) continua a precisar de `NEST_API_BASE_URL` **explícita** apontando para onde o Nest responde (ver `src/lib/nest-api-base-url.ts`).

### Obrigatório corrigir para produção

| Variável | Nota |
|----------|------|
| `NEST_API_BASE_URL` | URL **HTTPS** do Nest. Em **monólito** no mesmo domínio, usa o origin do site (ex. `https://www.way2go.pt`). **Nunca** `http://127.0.0.1:3001` em produção. Se estiver vazio, o servidor usa `NEXT_PUBLIC_SITE_URL` como fallback; cotações/partner **precisam** do processo Nest a responder nesse host. |
| `NEXT_PUBLIC_SITE_URL` | Origin canónico (ex. `https://www.way2go.pt`); usado no servidor como fallback da base do proxy e exposto ao cliente onde necessário. |
| `TRANSFERCRM_BASE_URL` | URL real do tenant TransferCRM. |
| `TRANSFERCRM_API_KEY` ou `TRANSFERCRM_BEARER_TOKEN` | Conforme `TRANSFERCRM_AUTH_MODE`. |
| `TRANSFERCRM_WEBHOOK_SECRET` | Igual ao configurado no TransferCRM para o teu endpoint. |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Checkout nativo no Next; webhook em `/api/webhooks/stripe`. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase (cliente / PWA). |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | **Só servidor**; nunca expor no browser. |
| `PARTNER_SESSION_SECRET` | Mínimo 16 caracteres. |
| Parceiros B2B | `PARTNER_BOOKING_*` ou `PARTNERS_JSON`, **ou** linhas em `public.partners` alinhadas com o token (ver `.env.example`). |

Opcional: `W2G_MASTER_ADMIN_*`, `DRIVER_SESSION_SECRET`, `BOOKING_ENGINE_MODE`, Vendus, etc., conforme usares essas funcionalidades em produção.

## 3. Domínio

**Settings → Domains**: adiciona o domínio (ex. `www.teudominio.pt`) e configura os registos DNS indicados pela Vercel.

Para o PWA em subdomínio tipo `drivers.teudominio.pt`, aponta o hostname para o **mesmo** projeto Vercel; o [middleware](../src/middleware.ts) faz rewrite para `/drivers-pwa/*`.

## 4. Webhooks (HTTPS)

Substitui `YOUR_DOMAIN` pelo domínio de produção (sem barra final):

| Serviço | URL do webhook |
|---------|----------------|
| **TransferCRM** | `https://YOUR_DOMAIN/api/webhooks/transfercrm` |
| **Stripe** | `https://YOUR_DOMAIN/api/webhooks/stripe` |

Configura estes URLs nos painéis TransferCRM e Stripe e usa o mesmo segredo que em `TRANSFERCRM_WEBHOOK_SECRET` / `STRIPE_WEBHOOK_SECRET` (conforme o teu fluxo de verificação).

## 5. Pós-deploy

- Testar `/`, `/pt`, `/partner/book`, e rotas críticas de API.
- Se o **browser** bloquear chamadas a domínios externos, rever `connect-src` em [`next.config.ts`](../next.config.ts) (CSP).

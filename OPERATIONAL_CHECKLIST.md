# Operational & integration audit — Production readiness

**Escopo:** Proxies em [`src/lib/booking/quote-nest-proxy.ts`](src/lib/booking/quote-nest-proxy.ts), [`src/lib/drivers/driver-nest-proxy.ts`](src/lib/drivers/driver-nest-proxy.ts), helpers em [`src/lib/http/nest-proxy-extra-headers.ts`](src/lib/http/nest-proxy-extra-headers.ts) / [`src/lib/http/client-ip-forward-headers.ts`](src/lib/http/client-ip-forward-headers.ts), route handlers Next em `src/app/api/**`, e serviços **nativos** em [`src/lib/payments/payments-app-service.ts`](src/lib/payments/payments-app-service.ts) + [`src/app/api/payments/*`](src/app/api/payments) / [`src/app/api/faturamento/*`](src/app/api/faturamento).

**Data da revisão:** 2026-04-23 (código no repositório).

**Documentação relacionada:** [docs/MANUAL_DO_SISTEMA.md](docs/MANUAL_DO_SISTEMA.md) (visão + índice de acessos/credenciais), [docs/vercel-deploy.md](docs/vercel-deploy.md), [`.env.example`](.env.example).

---

## Arquitetura: nativo Next.js vs proxy Nest

| Fluxo | Onde corre | Notas |
|-------|------------|--------|
| **Pagamentos (B2C Stripe)** | **Nativo Next.js** | `POST /api/payments/create-intent`, `GET /api/payments/checkout-status`; aliases `POST /api/checkout/intent`, `GET /api/checkout/status`. Implementação: [`payments-app-service.ts`](src/lib/payments/payments-app-service.ts). |
| **Webhook Stripe** | **Nativo Next.js** | `POST /api/webhooks/stripe` — verificação com `STRIPE_WEBHOOK_SECRET`; **não** passa pelo Nest. |
| **Faturação (Vendus)** | **Nativo Next.js** | `POST /api/faturamento/issue`, `POST /api/faturamento/issue-for-booking` (sessão master admin); provedor [`vendus.provider.ts`](src/modules/booking-engine/providers/fiscal/vendus.provider.ts), tipos em [`fiscal.service.ts`](src/modules/booking-engine/services/fiscal.service.ts). |
| **Cotação / reserva pública** | **Proxy Nest** | Ex.: `POST /api/public/quote`, `POST /api/booking/quote`, `POST /api/public/book` → upstream Nest (`/api/public/quote`, `/api/public/book`). |
| **Portal parceiro (quote / book-account)** | **Proxy Nest** | Cookies de sessão repassados; ver §1. |
| **PWA motoristas (`/api/drivers/*`)** | **Proxy Nest** | Exige **`NEST_API_BASE_URL` explícita** (mesmo host 1:1 causaria recursão; ver [`nest-api-base-url.ts`](src/lib/nest-api-base-url.ts) / `getDriverNestApiBaseUrl`). |

**`NEST_API_BASE_URL`:** URL **HTTPS** do serviço HTTP do Nest (sem barra final). Se o Nest estiver **no mesmo deploy / mesmo domínio público** que o Next (reverse proxy ou segundo processo atrás do mesmo hostname), define esta variável com **o próprio domínio canónico** do site (ex. `https://www.way2go.pt`), para o BFF fazer `fetch` ao upstream com certificado TLS válido. Em desenvolvimento local típico mantém-se `http://127.0.0.1:3001`. Em alternativa, em produção na Vercel, podes omitir `NEST_API_BASE_URL` e usar `NEXT_PUBLIC_SITE_URL` / `VERCEL_URL` como fallback **só** para rotas cujo path de destino no upstream **não** coincide com o path do pedido (o código recusa proxy recursivo mesmo origin + mesmo path).

---

## 1. Integridade dos headers e sessão

| Critério | Estado | Notas |
|----------|--------|--------|
| **`w2g_partner_sess` repassado ao Nest** | **Ready** | `proxyPartnerPostToNest` envia o header `Cookie` completo (`request.headers.get("cookie")`) no `fetch` para `/api/partner/quote` e `/api/partner/book-account`. |
| **Sessão Supabase (driver PWA) repassada** | **Ready** | `proxyDriverApiToNest` repassa `Cookie` e `Authorization` na íntegra. |
| **`Content-Type: application/json` (POST com corpo)** | **Ready (com ressalva)** | Rotas públicas e partner definem `Content-Type: application/json` ou reutilizam o header; o corpo é `request.text()` repassado sem re-serialização que altere o payload. |
| **`X-Forwarded-For` / IP real do cliente → Nest** | **Ready (quando o pedido ao Next traz headers)** | `nestUpstreamHeaders` usa [`pickNestProxyForwardHeaders`](src/lib/http/nest-proxy-extra-headers.ts), que inclui [`pickClientIpForwardHeadersFromWebRequest`](src/lib/http/client-ip-forward-headers.ts) (`x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`). Em **Vercel/produção** o pedido ao Next costuma incluir `X-Forwarded-For`. Em **dev local** direto a `localhost` pode **não** haver cadeia de proxy — o CRM continua a ver o IP do processo Nest/Next se nada for enviado. |
| **`Idempotency-Key` → Nest (fluxos proxificados)** | **Ready (se o browser enviar)** | O mesmo `pickNestProxyForwardHeaders` repassa `Idempotency-Key` quando o cliente envia o header `idempotency-key` (ver §2). |
| **Truncagem de cookies** | **Ready (código)** | Nenhum slice/limit no proxy. Infra (CDN / limite de header) é responsabilidade de deploy. |

**Resumo §1:** Cookies e repasse de IP/idempotência no BFF estão implementados. Validar em **staging** que o Nest/CRM recebe o IP esperado através da cadeia Vercel → Next → Nest.

---

## 2. Validação de idempotência

| Critério | Estado | Notas |
|----------|--------|--------|
| **Header `Idempotency-Key` browser → Next → Nest** | **Parcial — Ready no proxy** | [`pickIdempotencyKeyForNestProxy`](src/lib/http/nest-proxy-extra-headers.ts) lê `idempotency-key` do `Request` e envia `Idempotency-Key` ao Nest nos `fetch` que usam `pickNestProxyForwardHeaders` (público, partner). **Create-intent** nativo: o header é lido em [`create-intent/route.ts`](src/app/api/payments/create-intent/route.ts) e repassado ao Stripe SDK. **O frontend tem de enviar** o header onde for relevante. |
| **Mecanismos server-side** | **Ready / parcial** | **B2C Stripe:** `payment_intent` + metadata + webhook; espelho `public_bookings` com coluna `idempotency_key` (migrações Supabase). **Partner conta:** RPC de crédito + `external_reference` B2B + rollback se CRM falhar. **B2C book:** `external_reference` / regras no Nest — idempotência forte depende ainda do CRM face ao mesmo `external_reference`. |

**Resumo §2:** O BFF **não bloqueia** idempotência HTTP; confirma que os clientes e o Nest alinham o uso da chave. Manter mitigações server-side (Stripe, crédito, `idempotency_key` em BD).

---

## 3. Sincronização de estados (race conditions) — `PATCH …/travel-status`

| Questão | Resposta |
|---------|----------|
| **Se o TransferCRM demorar a responder, o Supabase é atualizado na mesma?** | **Não.** Ordem típica: CRM primeiro, depois `public_bookings.driver_travel_status`. Timeout/falha no CRM → sem update Supabase nesse pedido. |
| **Webhook `postDriverStatusWebhook` falha: retry ou log persistente?** | **Log em runtime.** Sem fila de retry nem tabela de falhas dedicada no fluxo revisto. |
| **Supabase falha após CRM OK** | CRM já atualizado; risco de resposta `200` ao cliente com espelho Supabase desatualizado (tratar como requisito de produto se for inaceitável). |

**Resumo §3:** Modelo **CRM-first**; sem transação única CRM+Supabase+webhook. Melhorias opcionais: outbox/retry do webhook, erro explícito se sync Supabase for obrigatório.

---

## 4. Auditoria de segurança (secret keys e raw body)

| Critério | Estado | Notas |
|----------|--------|--------|
| **`STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` no browser** | **Ready** | Só `process.env` em rotas/libs **server**; cliente usa `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` onde aplicável. |
| **`TRANSFERCRM_WEBHOOK_SECRET`** | **Ready** | Uso em `src/app/api/webhooks/transfercrm/route.ts` (servidor). |
| **Stripe webhook: integridade do corpo** | **Ready (Next nativo)** | [`webhooks/stripe/route.ts`](src/app/api/webhooks/stripe/route.ts) usa `request.text()` e `stripe.webhooks.constructEvent` em [`payments-app-service.ts`](src/lib/payments/payments-app-service.ts). |
| **TransferCRM webhook (Next direto)** | **Ready** | Corpo bruto para HMAC. |

**Resumo §4:** Sem segredos sensíveis no bundle cliente revisto; webhooks com raw body corretos.

---

## 5. Mapeamento de erros (Nest → browser)

| Critério | Estado | Notas |
|----------|--------|--------|
| **Preservação do status HTTP** | **Ready** | Proxies devolvem `new NextResponse(text, { status: upstream.status })`. |
| **Corpo de erro** | **Ready** | Texto bruto do upstream preservado. |
| **Erros de proxy** | **Esperado** | `NEST_API_BASE_URL` ausente ou rede: `PROXY_CONFIG` / `PROXY_UPSTREAM` sem mascarar 402/422 do upstream. |

**Resumo §5:** **Ready** para erros de negócio nos fluxos proxificados.

---

## 6. Deploy e ambiente (Vercel)

| Critério | Estado | Notas |
|----------|--------|--------|
| **`NEST_API_BASE_URL` em produção** | **Obrigatório para proxy Nest** | URL **HTTPS** do upstream Nest (pode ser o **mesmo domínio canónico** do site se o Nest estiver servido atrás desse hostname). Nunca `http://127.0.0.1:3001` na Vercel para tráfego real. **Pagamentos/Stripe/Vendus** não dependem desta variável. **Motoristas:** `NEST_API_BASE_URL` tem de estar definida explicitamente (ver secção “Arquitetura” acima). |
| **Variáveis alinhadas a `.env.example`** | **Checklist manual** | Copiar para **Project → Settings → Environment Variables**; **Redeploy** após alterar secrets. |
| **Domínio + PWA `drivers.*`** | **Checklist manual** | Mesmo projeto Vercel; DNS conforme [vercel-deploy.md](docs/vercel-deploy.md). |
| **Webhooks externos** | **Checklist manual** | `https://<domínio>/api/webhooks/transfercrm` e `/api/webhooks/stripe` com segredos iguais ao env. |
| **`npm run build` local** | **Recomendado** | Validar antes de merge para `main` ligada à Vercel. |

**Resumo §6:** Deploy depende de configuração no painel Vercel + DNS + webhooks; o repo inclui guia em `docs/vercel-deploy.md`.

---

## 7. Portal parceiro B2B (`/partner/*`)

| Critério | Estado | Notas |
|----------|--------|--------|
| **Fonte de lista de parceiros** | **Ready** | [`getAllPartners`](src/lib/partner/config.ts): primeiro `public.partners` (com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`); se a lista REST vier **vazia**, **fallback** para `PARTNERS_JSON` / `PARTNER_BOOKING_*`. |
| **`PARTNER_SESSION_SECRET`** | **Obrigatório** | Mínimo 16 caracteres; cookie assinado após `POST /api/partner/auth`. |
| **Parceiro na BD vs env** | **Operação** | Token em `public.partners.token` deve coincidir com o segredo usado no portal para esse `slug` (ou usar só env em dev). |

**Resumo §7:** Comportamento documentado em [MANUAL_DO_SISTEMA §4](docs/MANUAL_DO_SISTEMA.md); validar env em Preview/Production.

---

## 8. CSP e chamadas no browser

| Critério | Estado | Notas |
|----------|--------|--------|
| **`connect-src` em [`next.config.ts`](next.config.ts)** | **Risco se houver `fetch` no cliente** | Inclui Stripe e `self`; chamadas **server-side** ao TransferCRM/Supabase **não** passam por CSP. Se um componente cliente falar com domínios extra, pode ser preciso alargar `connect-src`. |

**Resumo §8:** Testar em produção os fluxos que usam `fetch` no browser após deploy.

---

## Itens transversais (route handlers)

- Login driver/partner no Next (cookies `Set-Cookie`) sem proxy Nest — coerente.
- **`GET /api/payments/checkout-status`:** implementação **nativa** Next; query `payment_intent=pi_…`; lê estado em Supabase (`stripe_checkout_sessions` via store em env).
- **Manutenção:** novos proxies Nest devem reutilizar [`pickNestProxyForwardHeaders`](src/lib/http/nest-proxy-extra-headers.ts) para manter IP + idempotência consistentes.

---

## Veredito global

| Área | Veredito |
|------|----------|
| 1. Headers / sessão / IP / Idempotency-Key no BFF | **Ready (com ressalva dev local sem X-Forwarded-For)** |
| 2. Idempotência | **Parcial** — proxy pronto; cliente + Nest devem usar a chave onde aplicável; mitigações server-side mantidas |
| 3. Travel-status / race + webhook | **Condicional** — CRM-first; sem retry persistente de webhook |
| 4. Segredos / raw body | **Ready** |
| 5. Erros HTTP | **Ready** |
| 6. Vercel / env / webhooks | **Checklist operacional** (painel + DNS) |
| 7. Portal parceiro | **Ready** (lógica env + Supabase + fallback) |
| 8. CSP browser | **Rever após deploy** se houver `fetch` a domínios novos |

**Production-ready geral:** **Sim, com ressalvas** — validar §6–§8 em staging/produção; §2–§3 conforme requisitos de produto; §1 em tráfego real atrás da Vercel.

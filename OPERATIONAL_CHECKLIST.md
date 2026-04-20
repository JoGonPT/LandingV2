# Operational & integration audit — Production readiness

**Escopo:** Proxies em `src/lib/booking/quote-nest-proxy.ts`, `src/lib/drivers/driver-nest-proxy.ts`, e route handlers Next que delegam para Nest (`src/app/api/**`).  
**Data da revisão:** 2026-04-18 (código no repositório).

---

## 1. Integridade dos headers e sessão

| Critério | Estado | Notas |
|----------|--------|--------|
| **`w2g_partner_sess` repassado ao Nest** | **Ready** | `proxyPartnerPostToNest` envia o header `Cookie` completo (`request.headers.get("cookie")`) no `fetch` para `/api/partner/quote` e `/api/partner/book-account`. Não há truncagem no código. |
| **Sessão Supabase (driver PWA) repassada** | **Ready** | `proxyDriverApiToNest` repassa `Cookie` e `Authorization` na íntegra. Adequado para cookies `sb-*` da Supabase SSR. |
| **`Content-Type: application/json` (POST com corpo)** | **Ready (com ressalva)** | Rotas públicas (`proxyPublicPostToNest`, partner, driver com corpo) definem `Content-Type: application/json` ou reutilizam o header do pedido. O corpo é repassado como texto lido uma vez (`request.text()`), sem re-serialização JSON que altere o payload. |
| **`X-Forwarded-For` / IP real do cliente → Nest → TransferCRM** | **Gap** | Os proxies **não** encaminham `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip` nem `forwarded`. O Nest chama o TransferCRM a partir do servidor; o CRM vê o IP de saída do host Nest/Next, não o do browser. Se a geolocalização/antifraude do CRM depender do IP do cliente, é necessário **propagar estes headers** no `fetch` para o Nest e, se o CRM o suportar, enviar IP explícito no contrato da API (o cliente HTTP atual em `transferCrmFetch` não adiciona estes headers). |
| **Truncagem de cookies** | **Ready (código)** | Nenhum slice/limit no proxy. Em produção, limites de tamanho de headers podem existir no **load balancer / CDN** (configuração infra, não aplicada no repo). |

**Resumo §1:** Sessões partner e driver estão corretamente repassadas. Para IP/geo no CRM, tratar como **melhoria obrigatória** se for requisito de negócio.

---

## 2. Validação de idempotência

| Critério | Estado | Notas |
|----------|--------|--------|
| **Header `Idempotency-Key` (ou equivalente) gerado no frontend e propagado até ao Nest** | **Gap / N/A no código atual** | Não existe referência a `Idempotency-Key` ou campo explícito de idempotência no DTO público (`BookingRequestDto`), nem nos proxies (headers extra). O partner `book-account` também não propaga chave de idempotência HTTP. |
| **Mecanismos existentes que reduzem duplicados** | **Parcial — Ready ao nível servidor** | **B2C Stripe:** `payment_intent` + metadata + webhook com inserção idempotente em `public_bookings` (409 / PI único). **Partner conta:** consumo atómico de crédito (RPC) + `external_reference` B2B (`resolveB2BExternalReference`) + rollback de crédito se o CRM falhar. **B2C book (Nest):** `external_reference` derivado do payload (`createExternalReference` / regras em `booking-mappers.ts`) — idempotência **depende do comportamento do CRM** face ao mesmo `external_reference`, não de uma chave enviada pelo browser. |

**Resumo §2:** Não há confirmação de “idempotency-key do frontend até ao Nest” porque **essa chave não está implementada**. A estratégia atual é **server-side** (Stripe, crédito, referências). Para “double-click” no mesmo POST público, avaliar **Idempotency-Key** no cliente + repasse nos proxies + suporte no Nest, ou documentar dependência exclusiva do CRM/`external_reference`.

---

## 3. Sincronização de estados (race conditions) — `PATCH …/travel-status`

| Questão | Resposta |
|---------|----------|
| **Se o TransferCRM demorar a responder, o Supabase é atualizado na mesma?** | **Não.** Em `DriversService.updateTravelStatus` a ordem é: `getBooking` → `patchBooking` (CRM) → **só depois** `publicStore.patchByCrmBookingId` (`driver_travel_status`). Se o `patchBooking` pendurar ou falhar por timeout, **não há** atualização em `public_bookings` nesse pedido. |
| **Webhook `postDriverStatusWebhook` falha: retry ou log persistente?** | **Log em runtime apenas.** Falha do webhook: `Logger.error` + resposta JSON com `warning` (“Updated in TransferCRM but central webhook failed.”). **Não há** fila de retry, dead-letter nem tabela de auditoria para falhas do webhook no código revisto. |
| **Supabase falha após CRM OK** | O CRM já foi atualizado; o erro do `patchByCrmBookingId` é **apenas** `log.warn` — o cliente pode receber `200 { ok: true }` **sem** o `public_bookings` alinhado (inconsistência eventual). |

**Resumo §3:** Comportamento **coerente com “CRM como fonte de verdade”** para o estado da viagem, mas **sem** garantia transacional CRM+Supabase+webhook. Para produção exigente: outbox/retry para webhook, ou PATCH Supabase com compensação documentada, ou resposta de erro se o sync Supabase for obrigatório.

---

## 4. Auditoria de segurança (secret keys e raw body)

| Critério | Estado | Notas |
|----------|--------|--------|
| **`STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` no browser** | **Ready** | Aparecem só em `process.env` em módulos **server** (API routes, libs usadas por Nest via path alias, stores Supabase server-side). Componentes cliente (`BookingForm`, `PartnerBookingClient`) usam apenas `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (esperado). |
| **`TRANSFERCRM_API_SECRET` / webhooks** | **Ready** | `TRANSFERCRM_WEBHOOK_SECRET` só em `src/app/api/webhooks/transfercrm/route.ts` (servidor). |
| **Stripe webhook: integridade do corpo** | **Ready (cadeia Next → Nest)** | Next: `proxyStripeWebhookToNest` usa `await request.text()` e reenvia o mesmo `body` no `fetch`. Nest: `NestFactory.create(..., { rawBody: true })` e `StripeWebhookController` usa `req.rawBody` (`Buffer`) para `constructEvent`. Isto é o padrão correto para **não** invalidar a assinatura. **Nota:** o endpoint final que valida a assinatura é o **Nest**; o Next é BFF — o corpo não deve ser alterado (não é). |
| **TransferCRM webhook (Next direto)** | **Ready** | `POST` em `webhooks/transfercrm` usa `request.text()` como corpo bruto para verificação HMAC — adequado. **Não** passa pelo Nest. |

**Resumo §4:** Nenhuma chave sensível identificada em código **browser** no âmbito revisto. Webhook Stripe está alinhado com raw body no Nest.

---

## 5. Mapeamento de erros (Nest → browser)

| Critério | Estado | Notas |
|----------|--------|--------|
| **Preservação do status HTTP** | **Ready** | Proxies devolvem `new NextResponse(text, { status: upstream.status })` (quote-nest-proxy: público, partner, stripe; driver-nest-proxy). Respostas **402** (crédito), **422** (validação CRM), **401**, **503**, etc. propagam o código do Nest. |
| **Corpo de erro** | **Ready** | O corpo é o texto bruto do upstream — mantém o JSON do Nest (ex.: `INSUFFICIENT_CREDIT`, `CRM_VALIDATION_ERROR`, mensagens driver `{ error }`). |
| **Erros de proxy (502/503)** | **Esperado** | Falhas de rede ou `NEST_API_BASE_URL` ausente devolvem respostas geradas no Next com códigos próprios (`PROXY_CONFIG`, `PROXY_UPSTREAM`) — não mascaram um 402/422 como 500. |

**Resumo §5:** **Ready** para não colapsar erros de negócio num 500 genérico nos fluxos proxificados.

---

## Itens transversais (route handlers)

- **Login / sessão driver e partner** que continuam no Next (cookies `Set-Cookie`) não precisam de proxy Nest — coerente.
- **`GET /api/payments/checkout-status`:** não reencaminha cookies; o fluxo usa `payment_intent` na query — aceitável se o Nest não exigir sessão para esse GET.
- **Recomendação:** extrair um helper comum `buildNestProxyHeaders(request, { forwardClientIp?: boolean })` para **IP +** consistência entre `quote-nest-proxy` e `driver-nest-proxy`.

---

## Veredito global

| Área | Veredito |
|------|----------|
| 1. Headers / sessão | **Condicional** — cookies OK; **falta** forward de IP cliente se o CRM precisar. |
| 2. Idempotência | **Gap documentado** — sem chave explícita do frontend; mitigações server-side existem. |
| 3. Travel-status / race + webhook | **Condicional** — CRM-first; sem retry persistente para webhook; Supabase pode ficar desatualizado sem falhar o pedido. |
| 4. Segredos / raw body | **Ready** |
| 5. Erros HTTP | **Ready** |

**Production-ready geral:** **Sim, com ressalvas** — endereçar §1 (IP) e §2/§3 conforme requisitos de produto; o restante está alinhado com boas práticas para o desenho atual (BFF Next + Nest).

# Manual do Fundador — Way2Go Engine

Este manual descreve a visão operacional da plataforma. Para **lista completa de variáveis de ambiente**, usa sempre [`.env.example`](../.env.example) como referência. Para **deploy na Vercel**, vê [vercel-deploy.md](vercel-deploy.md).

## Índice do documento

1. [A visão geral](#1-a-visão-geral-o-que-é-a-way2go-agora)
2. [O cérebro (NestJS e Next.js)](#2-o-cérebro-nestjs-e-nextjs)
3. [O arquivo e memória (Supabase)](#3-o-arquivo-e-memória-supabase)
4. [O portal B2B (parceiros)](#4-o-portal-b2b-parceiros)
5. [O ciclo de vida de uma reserva](#5-o-ciclo-de-vida-de-uma-reserva-passo-a-passo)
6. [A independência fiscal (faturação)](#6-a-independência-fiscal-faturação)
7. [Painéis de controlo (admin)](#7-painéis-de-controlo-admin)
8. [Deploy, domínios e webhooks](#8-deploy-domínios-e-webhooks)
9. [Índice de acessos (URLs)](#indice-acessos-urls)
10. [Credenciais e variáveis (referência)](#credenciais-e-variaveis-referencia)
11. [Conclusão](#conclusao)

---

## 1. A Visão Geral (O que é a Way2Go agora)

A Way2Go já não é apenas um site que envia pedidos para outro sistema e espera resposta.  
Hoje, a Way2Go funciona como um **cérebro próprio de operação**.

Imagine uma empresa de transporte com:
- um **escritório central** que decide tudo,
- vários **fornecedores externos** que podem ajudar,
- e uma **equipa interna** pronta para assumir o trabalho.

É exatamente isso que existe agora:
- o sistema pode usar o **TransferCRM** (motor externo),
- ou o **Motor Nativo Way2Go** (motor interno),
- e pode alternar entre ambos sem que o cliente final perceba essa troca.

Resultado: mais controlo, mais independência e menos risco de ficar “preso” a um único fornecedor.

---

## 2. O Cérebro (NestJS e Next.js)

O **NestJS** (`nestjs-api/` no monorepo) continua a ser o **upstream** para **cotações**, **`book` público** e **portal parceiro**: o Next reencaminha estes pedidos via proxy (`NEST_API_BASE_URL`), por exemplo `POST /api/public/quote`, `POST /api/booking/quote`, `POST /api/public/book`, `POST /api/partner/quote`, `POST /api/partner/book-account`.

O **Next.js** na raiz é a **montra, BFF e parte da lógica de negócio**:

- **Nativo no Next (sem proxy Nest):** pagamentos Stripe B2C (`/api/payments/*`, aliases `/api/checkout/*`), webhook Stripe (`/api/webhooks/stripe`), faturação Vendus (`/api/faturamento/*`).
- **Proxy para o Nest:** cotações, reserva pública e fluxos parceiro que ainda vivem em `nestjs-api/`.

**Deploy em monólito (mesmo domínio):** na Vercel, configura `NEST_API_BASE_URL` com o **próprio domínio canónico** (ex. `https://www.way2go.pt`) para o servidor Next fazer `fetch` ao Nest no mesmo host com TLS válido. Define também `NEXT_PUBLIC_SITE_URL` com esse origin — é usado no **servidor** como fallback em `getNestApiBaseUrl()` quando `NEST_API_BASE_URL` não está definida (nunca `http://127.0.0.1:3001` em produção pública). O módulo `nest-api-base-url` é **só servidor**; em componentes cliente usa diretamente `process.env.NEXT_PUBLIC_SITE_URL` se precisares do URL do site no browser.

**PWA motoristas:** o proxy `/api/drivers/*` usa apenas `NEST_API_BASE_URL` explícita (sem fallback ao site) para evitar pedidos recursivos ao mesmo path nesta app.

### Arquitetura Hexagonal, explicada de forma simples

Pense numa **ficha universal** de eletricidade:
- de um lado, tem sempre a mesma tomada;
- do outro lado, pode ligar diferentes aparelhos.

Na Way2Go:
- a “tomada” chama-se **interface comum** (`IBookingProvider`);
- os “aparelhos” são os motores de reservas (TransferCRM, Motor Nativo, e futuros motores).

Isto permite trocar de motor sem reconstruir o sistema inteiro.

### Shadow Mode (comparação em segredo)

No Shadow Mode, o sistema faz duas contas:
1. calcula o preço no motor principal (ex.: CRM),
2. calcula em paralelo no motor nativo (em segundo plano).

Ao cliente é mostrado apenas o preço oficial.  
Mas internamente, a Way2Go compara resultados para perceber:
- se o motor nativo está alinhado,
- onde há diferenças,
- quando está pronto para assumir mais tráfego.

É “batota no bom sentido”: aprendemos sem arriscar a operação.

---

## 3. O Arquivo e Memória (Supabase)

Se o backend é o escritório, o Supabase é o **arquivo central com memória histórica**.

### O que guardamos “em casa”

1. **Lista de motoristas e viaturas**
   - quem está ativo,
   - que tipo de viatura tem,
   - onde está (geolocalização).

2. **Rate Cards (preços por quilómetro)**
   - preço base por classe de viatura,
   - preço por km,
   - tarifa mínima.

3. **Histórico completo de cada reserva (Timeline)**
   - quando foi criada,
   - mudanças de estado (confirmada, atribuída, concluída, etc.),
   - eventos de motorista e webhooks.

4. **Registo de parceiros B2B** (`public.partners`) quando usas Supabase no servidor — alinhado com o portal parceiro e créditos.

Os motoristas acedem ao **PWA** com **Supabase Auth** (utilizadores criados no dashboard Supabase e `public.profiles` com `role = DRIVER`, etc.; ver migrações em `supabase/migrations/`).

Este arquivo dá rastreabilidade total: sabemos sempre o que aconteceu e quando.

---

## 4. O Portal B2B (parceiros)

A Way2Go consegue abrir “balcões de atendimento” para hotéis e agências sem desenvolvimento manual para cada caso.

Pense em **franchising digital**:
- cada parceiro recebe o seu espaço,
- com regras comerciais próprias,
- mas todos ligados ao mesmo cérebro central.

### Onde vivem os parceiros

1. **Supabase** — tabela `public.partners` (slug, `token`, nome, `is_active`, comissões, crédito), quando `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão definidos no runtime do Next.
2. **Variáveis de ambiente** — `PARTNERS_JSON` (vários) ou o trio `PARTNER_BOOKING_SLUG` + `PARTNER_BOOKING_SECRET` + `PARTNER_BOOKING_DISPLAY_NAME` (um parceiro simples).

Se a consulta ao Supabase devolver **lista vazia**, a aplicação faz **fallback** para as variáveis de ambiente (ver `src/lib/partner/config.ts`). Assim, em desenvolvimento ou em bases ainda vazias, o portal não fica bloqueado se o `.env` tiver parceiros definidos.

### Gestão operacional

- Criar/editar parceiros e crédito: **Admin interno** (`/internal/admin/`) e APIs `api/internal/admin/partners*`.
- Sessão do parceiro no portal: cookie assinado com `PARTNER_SESSION_SECRET`; autenticação por slug + segredo partilhado (`POST /api/partner/auth`).

Se **não** existir nenhum parceiro válido em nenhuma das fontes, `/partner/book` mostra que o portal B2B não tem parceiros configurados.

---

## 5. O Ciclo de Vida de uma Reserva (Passo a Passo)

### Passo 1 — Pedido de preço

O cliente pede orçamento (formulário na landing).  
O Next pode proxyar para o Nest; o sistema valida dados, rota e distância.

### Passo 2 — Cálculo e decisão de motor

O backend Nest decide qual motor usar (CRM, Nativo, ou ambos em sombra), conforme modo configurado.

### Passo 3 — Criação da reserva

A reserva é criada no motor escolhido.  
Ao mesmo tempo, pode ficar guardada no arquivo interno (espelho) para controlo operacional, consoante fluxo e migrações.

### Passo 4 — Atribuição de motorista

No motor nativo, o sistema procura motorista compatível e disponível, priorizando proximidade.

### Passo 5 — Acompanhamento em tempo real

Mudanças de estado (driver, webhook, sistema) entram na timeline da reserva.

### Passo 6 — Conclusão do serviço

Quando a reserva chega a **COMPLETED**, o sistema desencadeia automaticamente a emissão de fatura.

---

## 6. A Independência Fiscal (Faturação)

A faturação foi desenhada para não depender de processos manuais.

Quando o serviço termina:
1. o sistema deteta estado **COMPLETED**,
2. prepara dados da fatura (cliente, trajeto, valor),
3. envia para o provedor fiscal (Vendus).

Com isto, a Way2Go garante:
- consistência legal,
- redução de falhas humanas,
- rapidez na comunicação fiscal.

Em ambiente de simulação, existe modo **MOCK**, que testa o fluxo sem gastar créditos de API.

---

## 7. Painéis de controlo (Admin)

Existem **duas entradas de UI** que partilham a mesma **password** de ambiente (`W2G_MASTER_ADMIN_PASSWORD`) e o endpoint `POST /api/internal/admin/login`:

| Entrada | URL após login | Foco |
|---------|----------------|------|
| **Admin interno** | `/internal/admin/login` → `/internal/admin/` | Parceiros, crédito, reset de uso, etc. |
| **Master admin (finanças)** | `/master-admin/login` → `/master-admin/finance/` | Vista financeira agregada |

Na prática, consegues:

1. **Gerir parceiros** — criar e editar, comissão, ativar/desativar (Supabase + APIs).
2. **Ajustar regras comerciais** — limites de crédito, condições B2B.
3. **Acompanhar desempenho dos motores** — comparação CRM vs nativo, sombra, failover.
4. **Tomar decisões de crescimento** — tráfego nativo vs CRM de forma controlada.

APIs relacionadas: `api/internal/admin/*`, `api/master-admin/finance`, `api/admin/engine-audit` (conforme implementação atual).

---

## 8. Deploy, domínios e webhooks

- Guia passo a passo: [vercel-deploy.md](vercel-deploy.md) (projeto Vercel já existente ou novo, variáveis, redeploy, DNS, **monólito** com `NEST_API_BASE_URL` = domínio do site quando aplicável).
- Webhooks: TransferCRM `https://<domínio>/api/webhooks/transfercrm`; Stripe `https://<domínio>/api/webhooks/stripe` (processado **no Next**, não via Nest).

---

<a id="indice-acessos-urls"></a>

## Índice de acessos (URLs)

Substitui `<domínio>` pelo host de produção ou `http://localhost:3000` em desenvolvimento.

| Área | Caminho | Descrição |
|------|---------|-----------|
| Site público (PT/EN) | `/pt`, `/en` | Landing, reserva, FAQ, páginas legais sob `/[locale]/…` |
| Portal parceiro (lista) | `/partner/book` | Lista de parceiros ou redirecionamento se existir apenas um |
| Portal parceiro (slug) | `/partner/<slug>/book/`, `/partner/<slug>/dashboard/` | Reserva B2B e histórico/crédito do parceiro |
| Admin interno | `/internal/admin/login` → `/internal/admin/` | Parceiros, crédito, APIs `api/internal/admin/*` |
| Master admin (finanças) | `/master-admin/login` → `/master-admin/finance/` | Vista financeira; mesma password que o admin interno |
| PWA motoristas | `/drivers-pwa/login`, `/drivers-pwa/…` | Em produção, o host `drivers.<domínio>` pode apontar para o mesmo projeto; o middleware faz rewrite para `/drivers-pwa/*` |
| Webhooks (configurar nos painéis externos) | `https://<domínio>/api/webhooks/transfercrm`, `https://<domínio>/api/webhooks/stripe` | HTTPS obrigatório em produção |

---

<a id="credenciais-e-variaveis-referencia"></a>

## Credenciais e variáveis (referência)

**Nunca** coloques passwords ou chaves reais neste manual. Define-as no `.env` local (não commitado) ou em **Vercel → Environment Variables**.

| Categoria | Variáveis principais | Notas |
|-----------|---------------------|--------|
| TransferCRM | `TRANSFERCRM_BASE_URL`, `TRANSFERCRM_AUTH_MODE`, `TRANSFERCRM_API_KEY` ou `TRANSFERCRM_BEARER_TOKEN`, `TRANSFERCRM_WEBHOOK_SECRET`, `TRANSFERCRM_TIMEOUT_MS` | Chaves obtidas no painel TransferCRM; o segredo do webhook deve coincidir com o configurado no CRM |
| Stripe | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout nativo no Next; webhook em `/api/webhooks/stripe` |
| Moradas | `PLACES_PROVIDER`, `PLACES_COUNTRIES`, `GOOGLE_MAPS_API_KEY` (se Google) | Autocomplete |
| Nest (proxy: cotação, book público, parceiro) | `NEST_API_BASE_URL` | URL HTTPS do `nestjs-api/`; em monólito pode ser o próprio domínio (ex. `https://www.way2go.pt`). Fallback no servidor: `NEXT_PUBLIC_SITE_URL` |
| Site canónico | `NEXT_PUBLIC_SITE_URL` | Usado no cliente e como fallback da base do proxy no servidor |
| Supabase (browser + servidor) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Auth do PWA motorista, tabela `partners`, espelhos de reservas, etc. A **service role** só no servidor |
| Motoristas (fallback CRM) | `DRIVER_TRANSFERCRM_ID`, opcional `DRIVER_BOOKING_REF_TOKEN`, `DRIVER_STATUS_WEBHOOK_URL`, `DRIVER_STATUS_WEBHOOK_SECRET` | Quando o perfil Supabase não tem `transfercrm_driver_id` |
| Portal parceiro | `PARTNER_SESSION_SECRET` (mín. 16 caracteres); parceiros: `PARTNERS_JSON` **ou** `PARTNER_BOOKING_SLUG` + `PARTNER_BOOKING_SECRET` + `PARTNER_BOOKING_DISPLAY_NAME` (+ `PARTNER_BOOKING_KIND`) | Com Supabase configurado, a lista vem primeiro de `public.partners` (ativos); se vier vazia, a app faz **fallback** para env |
| Crédito parceiro | `PARTNER_DEFAULT_CREDIT_LIMIT_EUR`, `PARTNER_CREDIT_FILE` | Ficheiro local só quando não houver persistência Supabase para crédito |
| Admin (UI) | `W2G_MASTER_ADMIN_PASSWORD`, `W2G_MASTER_ADMIN_SESSION_SECRET` (ou fallback para `PARTNER_SESSION_SECRET`), `W2G_MASTER_ADMIN_SESSION_MAX_AGE_SEC` | Login em `/internal/admin` e `/master-admin` via `POST /api/internal/admin/login` |
| Motor de reservas | `BOOKING_ENGINE_MODE`, `BOOKING_ENGINE_NATIVE_RATIO` | `STRICT_CRM`, `SHADOW_MODE`, `LOAD_BALANCE`, `STRICT_NATIVE` |
| Fiscal (Vendus) | `VENDUS_MODE`, `VENDUS_API_KEY`, `VENDUS_BASE_URL` | Modo `MOCK` para testes; APIs admin `POST /api/faturamento/*` |

Seed opcional de parceiro demo na base (SQL Editor Supabase): [`../supabase/seed_b2b_partner.sql`](../supabase/seed_b2b_partner.sql).

---

<a id="conclusao"></a>

## Conclusão

A Way2Go passou de “website que encaminha pedidos” para uma **plataforma operacional inteligente**.

Isto dá três vantagens estratégicas:
- **controlo** (dados e decisões dentro de casa),
- **resiliência** (vários motores, menos risco),
- **escala** (parceiros, despacho e faturação com base sólida).

Em linguagem de fundador: a empresa deixou de ter apenas montra e passou a ter **fábrica própria**.

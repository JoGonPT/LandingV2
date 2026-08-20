# Relatório de Diagnóstico e Viabilidade — Migração de Stack Way2Go

**Data:** 19 de agosto de 2026 · **Commit:** `e6b7919` · **Papel:** Principal Software Architect
**Pergunta:** aproveitar este repositório como base da nova arquitetura, ou começar limpo?

---

## Nota preliminar — três dos quatro objetivos já estão construídos

Antes do veredicto, é preciso corrigir a premissa do briefing, porque muda a natureza da decisão.

O briefing pede para avaliar a viabilidade de migrar para uma arquitetura que **este repositório já é**:

| Objetivo do briefing | Estado real |
|---|---|
| 1. Substituir o WordPress por Next.js + TypeScript + Tailwind | ✅ **Já feito.** O repo é Next.js 15 App Router + React 19 + TS 5 strict + Tailwind 3 |
| 2. Manter o TransferCRM via API/Webhooks em Next.js API Routes (BFF) | ✅ **Já feito.** 1 327 linhas em `src/lib/transfercrm/` + 44 rotas BFF + webhook com assinatura HMAC verificada |
| 3. Alojar em Cloudways (Node.js/PM2) | ⚠️ **Único ponto genuinamente novo.** Hoje o deploy é Vercel |
| 4. Isolar a camada do CRM para poder substituí-lo depois | ✅ **Já feito, e melhor do que o pedido.** Ports & adapters completos, com um segundo provider já escrito |

A pergunta real não é *"vale a pena migrar para esta arquitetura?"*. É **"o que falta para levar esta arquitetura, que já existe, para o Cloudways?"** — e essa é uma pergunta muito mais barata.

### Quanto WordPress resta, em concreto

Fiz um varrimento por `wordpress|wp-json|wp-admin|wp_|.php` em todo o repositório. O acoplamento residual é de **três ficheiros, nenhum deles em execução**:

- `src/components/QuickQuoteForm.wp-endpoint.php` — endpoint WP REST órfão dentro da pasta de componentes React. Não é executado por nada; é um ficheiro PHP a viver num projeto Node.
- `next.config.ts:10` — a CSP ainda permite `connect-src https://wp.way2go.pt`, o backend já desativado.
- `public/.htaccess` — regras Apache de uma era de site estático, que ainda redirecionam para `www.vruum.pt`.

**Nenhum código TypeScript em execução chama WordPress.** A migração que o briefing propõe como objetivo principal está concluída; falta apenas apagar os vestígios.

---

## 1. Veredicto de viabilidade

### ✅ Opção A — Aproveitar o projeto. Reutilizável: ~85%

Recomendação inequívoca. Começar um repositório limpo destruiria trabalho de alta qualidade e **não resolveria nenhum dos problemas reais**, que não são de arquitetura.

**Base da estimativa** — inventário completo de TypeScript versionado (`git ls-files`, excluindo `.d.ts` e `nestjs-api/dist`):

| Área | Ficheiros | Linhas | Destino |
|---|---:|---:|---|
| `src/components` | 24 | 6 079 | Manter — refatorar 2 ficheiros |
| `src/lib` (exceto CRM) | 63 | 4 153 | Manter |
| `src/app/api` (BFF) | 44 | 2 842 | Manter |
| `src/modules/booking-engine` | 14 | 2 088 | Manter — é o ativo mais valioso |
| `nestjs-api` | 21 | 1 397 | **Decisão em aberto** — ver §3.2 |
| `src/lib/transfercrm` | 18 | 1 327 | Manter |
| `src/app/[locale]` (site público) | 6 | 418 | Manter |
| `src/app` (B2B, drivers, admin) | 17 | 356 | Manter |
| `src/middleware.ts` + i18n | 2 | 98 | Manter — adaptar §3.1 |
| Outros | 6 | 253 | Maioritariamente descartar |
| **TOTAL** | **215** | **19 011** | |

**~85% reutilizável sem reescrita.** Os restantes ~15% dividem-se entre descartar (~2%), refatorar (~6%) e a decisão sobre o NestJS (~7%).

> **Aviso honesto sobre esta percentagem.** "Reutilizável" significa *não precisa de ser reescrito*. Não significa *não dá trabalho*. Há trabalho de endurecimento real a fazer — está no [Relatório de Auditoria](RELATORIO_AUDITORIA.md) e resume-se em ~1 dia de correções críticas + ~2 semanas de consolidação. Mas é trabalho de **acabamento**, não de **construção**.

### Porque não a Opção B

Começar limpo custaria, por baixo, 6 a 10 semanas para reconstruir o que já existe — e reintroduziria os mesmos bugs que já foram encontrados e corrigidos (as três correções recentes ao middleware, a recursão do proxy, o `skipTrailingSlashRedirect` para o webhook do Stripe). Estes são exatamente os detalhes que só se descobrem em produção.

O código tem ainda um indicador de qualidade que é raro e que não se recupera facilmente: **zero `any`, zero `@ts-ignore`, zero `eslint-disable`** em 215 ficheiros. Deitar isso fora para reescrever seria trocar código maduro por código novo por razões que não são técnicas.

---

## 2. Inventário — reaproveitar vs. descartar

### 2.1 Manter tal como está

| Ficheiro / Pasta | Porquê |
|---|---|
| `src/modules/booking-engine/**` | **O ativo mais valioso do repositório.** Ports & adapters genuínos: porta `IBookingProvider`, adaptadores CRM + nativo + fiscal, orquestrador com 4 modos. É precisamente o "isolamento da camada do CRM" que o briefing pede como objetivo futuro — e já está feito, com testes |
| `src/lib/transfercrm/**` (os `.ts`) | Cliente HTTP, mapeamento, validação, webhook com `timingSafeEqual`. 5 ficheiros de teste |
| `src/app/api/**` | 44 rotas BFF já no padrão pedido. Validação zod em 15 delas |
| `src/lib/partner/**`, `src/lib/internal-admin/**` | Sessões HMAC, comparação em tempo constante, flags de cookie corretas |
| `src/lib/supabase/**` | Integração SSR correta, incluindo refresh de sessão no middleware |
| `src/dictionaries/*.json` | PT/EN com paridade de chaves 100% verificada |
| `src/app/[locale]/legal/**` | RGPD + T&C completos nas duas línguas. Trabalho jurídico, não técnico — caro de refazer |
| `tailwind.config.ts`, `postcss.config.mjs` | Configuração limpa, paleta própria, sem inchaço de plugins |

### 2.2 Manter, mas refatorar

| Ficheiro | Problema | Esforço |
|---|---|---|
| `src/components/QuickQuoteForm.tsx` (1 122 linhas) | Traz um **dicionário PT/EN privado** (linhas 54-212 e 529-570) duplicado fora de `src/dictionaries/`. Duas fontes de verdade. Nomes de campo em português (`cadeiraBebe`, `passageiros`) na fronteira da API | S |
| `src/components/HeroSection.tsx` | Linhas 19-25 **sobrepõem-se ao dicionário** com texto PT hardcoded, o que faz PT e EN comunicarem posicionamentos diferentes. Contém também o selo Trustpilot falso | S |
| `src/app/api/send-budget/route.ts` | Em estado `DEBUG` assumido em produção: envio de email bloqueante e logging de emails de clientes. Sem rate limiting nem limites de comprimento | S |
| `src/components/BookingForm.tsx` (1 226 linhas) | **Órfão** — zero importações. Não é dívida: é um ativo desligado. Decidir se se religa (ver Auditoria §9) ou se se arquiva formalmente | — |
| `src/lib/nest-api-base-url.ts` | Tem `"use client"` sendo lógica de servidor. Contém o fallback `VERCEL` a remover | XS |

### 2.3 Descartar imediatamente

| Ficheiro | Razão |
|---|---|
| `src/components/QuickQuoteForm.wp-endpoint.php` | Endpoint WordPress dentro de uma pasta de componentes React. Vestígio da arquitetura que se está a abandonar |
| `public/.htaccess` | Regras Apache inúteis num servidor Node; redirecionam para `vruum.pt` |
| `src/app/apitest/page.tsx` | Consola de API pública sem autenticação, a apontar para endpoints `/api/v1/*` que não existem |
| `src/app/admin/partners/page.tsx` | Rota morta — devolve 404 por não constar do middleware |
| `src/lib/transfercrm/*.js`, `*.d.ts`, `*.js.map` (30 ficheiros) | Output compilado versionado ao lado da fonte, ignorado pelo linter. Com `moduleResolution: bundler` pode resolver para o `.js` obsoleto |
| `src/lib/routing/estimate-route-distance-km.{js,d.ts,js.map}` | Idem |
| `temp_home_en.html`, `temp_home_pt.html` | Dumps da homepage de produção de abril, não versionados |
| `nestjs-api/dist/**`, `nestjs-api/*.tsbuildinfo` | Build output e cache versionados |
| `next.config.ts` → `https://wp.way2go.pt` na CSP | Backend desativado |

### 2.4 Decisão estrutural em aberto

| Item | Questão |
|---|---|
| `nestjs-api/**` (21 fich., 1 397 linhas) | Segunda aplicação Node que serve `/api/public/quote` e `/api/public/book` por proxy. **Excluída do `tsconfig.json` e do `eslint.config.mjs`** — nunca é verificada nem testada. Ver §3.2: é a decisão com maior impacto no custo de operação em Cloudways |

---

## 3. Plano de ação imediato

### 3.1 Fase A — Preparação para Cloudways (Node/PM2)

**Diagnóstico: o projeto está invulgarmente bem preparado para sair da Vercel.**

Verifiquei os quatro pontos que normalmente inviabilizam este tipo de migração:

| Verificação | Resultado |
|---|---|
| `export const runtime = "edge"` em algum ficheiro | ❌ **Nenhum.** Todo o código corre em runtime Node |
| APIs exclusivas de Edge no middleware (`.geo`, `.ip`, `waitUntil`) | ❌ **Nenhuma.** `src/middleware.ts` usa apenas APIs padrão |
| ISR / `revalidate` / revalidação on-demand | ❌ **Nenhum.** Sem cache partilhada a coordenar entre workers PM2 |
| Acoplamento a variáveis Vercel | ⚠️ **Apenas 2 sítios, ambos fallbacks** |

Os dois pontos de acoplamento à Vercel são:
- `src/lib/nest-api-base-url.ts:31-33` — ramo `if (process.env.VERCEL === "1")`
- `src/lib/payments/payment-link.service.ts:13` — fallback `VERCEL_URL`, com `https://www.way2go.pt` como último recurso

Ambos são **fallbacks que só disparam se `NEST_API_BASE_URL` e `NEXT_PUBLIC_SITE_URL` estiverem vazias**. Definindo essas duas variáveis no Cloudways, tornam-se código morto. O lock-in efetivo à Vercel é praticamente nulo.

E `next.config.ts` já tem `output: "standalone"` — exatamente o que o self-hosting requer.

#### Passos ordenados

**A1 · Resolver o conflito entre `server.js` e `output: standalone`** — ✅ **RESOLVIDO em 19 ago 2026**

Existiam **dois modelos de arranque incompatíveis** no mesmo repositório:

- `server.js` na raiz — chamava `next({ dev: false })` programaticamente, o que exige o `node_modules` completo e a pasta `.next` inteira. Escrito para cPanel.
- `output: "standalone"` — o Next gera o **seu próprio** `.next/standalone/server.js`, autocontido, com apenas as dependências necessárias.

Os dois chamavam-se `server.js`, o que tornava ambíguo qualquer comando de arranque que referisse esse nome.

> **Correção a uma afirmação anterior deste relatório.** Descrevi o `CMD ["node", "server.js"]` do `Dockerfile` como potencialmente partido. Não estava: o estágio `runner` arranca de uma imagem limpa e copia apenas `public`, `.next/standalone` → `./` e `.next/static`, pelo que o `server.js` da raiz nunca chegava à imagem final e o `CMD` já resolvia para o do standalone. O problema era de legibilidade e de fragilidade, não de runtime.

**Resolução aplicada — adotado o standalone:**

| Alteração | Ficheiro |
|---|---|
| Removido o entrypoint cPanel | `server.js` (raiz) — eliminado |
| Removido o script que o invocava | `package.json` — `start:cpanel` eliminado |
| Novo script de build completo | `package.json` — `build:standalone` |
| Novo script de arranque local | `package.json` — `start:standalone` |
| Monta os assets no bundle standalone | `scripts/assemble-standalone.mjs` (novo) |
| Configuração PM2 para Cloudways | `ecosystem.config.js` (novo) |
| `CMD` documentado de forma inequívoca | `Dockerfile` |

**A armadilha que o `scripts/assemble-standalone.mjs` resolve:** `output: "standalone"` gera o servidor e um `node_modules` mínimo, mas **não copia `public/` nem `.next/static/`**. Sem esse passo o servidor arranca e serve HTML sem CSS, sem JS de cliente e sem imagens — falha silenciosa, sem erro no arranque. O script copia os dois e falha com mensagem explícita se a build não estiver onde deve.

**Deploy em Cloudways:**

```bash
npm ci
npm run build:standalone
pm2 start ecosystem.config.js --env production
```

O `ecosystem.config.js` corre com `cwd: "./.next/standalone"` e `script: "server.js"`, em `fork` com 1 instância — sem ISR nem cache partilhada no projeto, o modo `cluster` seria seguro, mas os planos Cloudways têm RAM fixa e `instances` só deve subir depois de medir.

**Verificação executada.** `npm run build:standalone` completou, e o servidor standalone foi arrancado e testado:

| Teste | Resultado |
|---|---|
| `/` (rewrite de locale) | 200 |
| `/pt/` e `/en/` | 200, com conteúdo distinto — i18n a funcionar |
| CSS de `.next/static` | 200 — o passo de assets funcionou |
| `hero-chauffeur.webp` de `public/` | 200 (10 160 326 bytes — confirma A2) |
| Cabeçalho CSP | Presente |
| `/legal/privacy/` sem locale | 307 → `/pt/legal/privacy/` |
| `/partner/` (secção não-localizada) | 307 → `/partner/book/` |
| `POST /api/send-budget` com corpo inválido | 400 (validação zod ativa) |
| `POST /api/send-budget/` com barra final | 400 — `skipTrailingSlashRedirect` preserva o corpo |
| Rota inexistente | 404 |

**A2 · Reativar a otimização de imagens** *(alto impacto em custo)*

`next.config.ts:22` tem `images: { unoptimized: true }` e o `sharp` não está nas dependências. Na Vercel isto era apenas mau para a performance. **Em Cloudways passa a ser mau e caro**: cada visitante descarrega os 9,7 MB de `hero-chauffeur.webp` diretamente da largura de banda do servidor, sem CDN a absorver.

Instalar `sharp`, remover `unoptimized`, e comprimir a imagem. É a ação de maior retorno de todo o plano.

**A3 · Colocar CDN à frente do servidor**

A Vercel fornecia cache de edge sem configuração. Um servidor Cloudways é uma origem única. Sem CDN, todo o tráfego estático bate no Node.

Pôr Cloudflare à frente e definir cabeçalhos `Cache-Control` — hoje `next.config.ts` só emite CSP na função `headers()`, nenhum cabeçalho de cache. Aproveitar a mesma alteração para acrescentar `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors` e HSTS, todos ausentes.

**A4 · Fixar as variáveis de ambiente e reparar o gate**

- Definir `NEXT_PUBLIC_SITE_URL` e `NEST_API_BASE_URL` — neutraliza os dois fallbacks Vercel
- Corrigir `audit_env.sh`, que está **sintaticamente partido** (`fisandbox` na linha 35, `FR` na 37; `bash -n` falha). É o gate de verificação pré-deploy e está morto em silêncio
- Acrescentar `.env.production` ao `.gitignore` — não está lá, e é para lá que o `audit_env.sh` descarrega os segredos de produção
- Documentar `DISCORD_WEBHOOK_URL` e as quatro `SMTP_*` no `.env.example`, onde **não constam** apesar de o formulário depender delas

**A5 · Verificar o que muda de comportamento sem a Vercel**

- **Webhook do Stripe** — `skipTrailingSlashRedirect: true` já está definido precisamente para o corpo do POST sobreviver. Manter e testar contra o novo domínio
- **Middleware** — passa a correr em Node a cada pedido, incluindo o refresh de sessão Supabase. Funciona, mas acrescenta latência que a edge escondia
- **Subdomínio `drivers.*`** — o middleware reescreve por hostname; confirmar que o DNS e o proxy do Cloudways passam o `Host` original
- **Logs** — passam de Vercel para PM2. Configurar rotação; e aproveitar para **remover o logging de emails de clientes** que hoje escreve PII nos logs

### 3.2 Fase B — Decidir o destino do `nestjs-api`

Esta é a decisão com maior impacto no custo de operação, e o briefing não a contempla.

O `nestjs-api` é uma segunda aplicação Node. Em Cloudways significa **dois processos PM2** em vez de um, na mesma RAM fixa. E o seu `package.json` revela um problema de produção:

```json
"build":      "tsc -p tsconfig.json --noEmit",
"start:prod": "tsx src/main.ts"
```

O script de `build` faz **apenas verificação de tipos — não emite nada** (`--noEmit`). E o `start:prod` corre **TypeScript diretamente através do `tsx`** em produção. O `tsx` é um runner orientado a desenvolvimento: acrescenta tempo de arranque e consumo de memória, e não há artefacto compilado a validar antes do deploy. Existe uma pasta `nestjs-api/dist/` versionada, mas nenhum script a produz.

Três caminhos:

| Opção | Descrição | Avaliação |
|---|---|---|
| **B1 — Absorver no Next** | Mover a lógica de `quote`/`book`/`pricing` para rotas Next. São ~1 400 linhas, e o padrão BFF já existe para tudo o resto | **Recomendada.** Um processo PM2, um deploy, um lint, um tsconfig. Elimina a única parte do sistema que não é verificada |
| **B2 — Manter separado, mas compilar** | `tsc` real com emit, `node dist/main.js`, incluir no lint e no tsconfig, segundo processo PM2 | Aceitável se houver intenção de o escalar de forma independente |
| **B3 — Manter como está** | Dois processos, um deles a correr TS não compilado e não verificado | Não recomendada em servidor de RAM fixa |

### 3.3 Fase C — Isolamento do CRM

**Esta fase está concluída.** O briefing pede-a como trabalho futuro, mas `src/modules/booking-engine/` já implementa:

- Porta `IBookingProvider` — `ports/booking-provider.port.ts`
- Adaptador CRM — `providers/transfer-crm.provider.ts`
- Adaptador nativo Way2Go — `providers/way2go-native.provider.ts`, sobre Supabase
- Adaptador fiscal — `providers/fiscal/vendus.provider.ts`
- Orquestrador com 4 modos: `STRICT_CRM`, `SHADOW_MODE` (default), `LOAD_BALANCE`, `STRICT_NATIVE`

O **Shadow Mode** merece destaque: cota o preço nos dois motores em paralelo, mostra ao cliente apenas o preço oficial do CRM, e regista internamente a diferença. É o mecanismo que permite validar o motor próprio com tráfego real e risco comercial zero — exatamente o que o objetivo 4 do briefing pretende alcançar.

O que falta são as **fases 4-5 documentadas em `docs/engine-agnostic-architecture.md`** (cotação nativa em rotas prioritárias; dispatch completo), mais duas lacunas que o próprio `OPERATIONAL_CHECKLIST.md` já assinala:

- Não existe fila de retry persistente para o webhook de estado do motorista — as falhas são apenas logs de runtime. A tabela `booking_retry_queue` está especificada na arquitetura mas não implementada
- A idempotência é parcial: depende de o cliente enviar `Idempotency-Key` e, em última instância, do comportamento do CRM

### 3.4 Fase D — Endurecimento

Executar a **Fase 0** do [Relatório de Auditoria](RELATORIO_AUDITORIA.md) — sete ações, cerca de um dia, que eliminam todos os riscos críticos. Vários deles já estão incorporados acima (A2, A4).

Acrescentar CI antes de qualquer migração de servidor: sem `lint` + `test` + `build` automáticos, não há forma de saber se a adaptação ao Cloudways partiu alguma coisa. É meio dia de trabalho e é o que protege as 19 000 linhas que se está a decidir reutilizar.

---

## Resumo

| Pergunta | Resposta |
|---|---|
| Aproveitar ou recomeçar? | **Aproveitar.** ~85% reutilizável sem reescrita |
| Substituir o WordPress | **Já está feito.** Restam 3 ficheiros residuais, nenhum em execução |
| Manter o TransferCRM via BFF | **Já está feito.** 44 rotas, webhook com assinatura verificada |
| Isolar a camada do CRM | **Já está feito**, com ports & adapters e um segundo provider escrito |
| Alojar em Cloudways/PM2 | **Viável, com poucos obstáculos.** Zero runtime Edge, zero ISR, `output: standalone` já configurado, 2 fallbacks Vercel a remover |
| Maior bloqueador técnico | ~~O conflito `server.js` vs `standalone` (A1)~~ **resolvido e verificado em 19 ago 2026.** Resta o destino do `nestjs-api` (Fase B) |
| Maior risco não-técnico | Migrar para servidor próprio **sem CDN e sem otimização de imagens** transforma um problema de performance num problema de fatura |

---

*Análise estática do repositório no commit `e6b7919`. Nenhum ficheiro do projeto foi alterado. Complementa o [Relatório de Auditoria](RELATORIO_AUDITORIA.md), que cobre o estado operacional e de segurança em detalhe.*

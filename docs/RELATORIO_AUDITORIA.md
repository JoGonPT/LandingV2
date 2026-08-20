# Relatório de Auditoria — Way2Go Landing V2

**Data:** 19 de agosto de 2026
**Âmbito:** verificação completa do repositório — estratégia de negócio, stack tecnológico, funcionalidades, estado operacional
**Método:** análise estática read-only do código, documentação, migrações de base de dados e histórico git. Nenhum ficheiro do projeto foi alterado.
**Commit analisado:** `e6b7919` (branch `main`)

> **Como ler este documento.** Cada secção tem duas camadas: primeiro **o que significa** em linguagem corrente, depois **o detalhe técnico** com caminhos de ficheiro e linhas. Quem quiser só a visão de negócio pode ler as secções 1, 2, 5, 6 e 9 e ignorar os blocos técnicos.

---

## 1. Sumário executivo

### Em linguagem simples

O projeto Way2Go tem, hoje, **duas realidades muito diferentes** a viver no mesmo repositório.

A primeira é o **site que os clientes veem**: uma página única, bonita e funcional, com um formulário onde o cliente descreve a viagem que quer. Esse formulário não dá preço nem permite reservar — envia o pedido para o Discord e para um email, e alguém da equipa responde depois com um orçamento à mão.

A segunda é a **plataforma que existe no código mas não está ligada ao site**: um sistema completo de reservas com pagamento por cartão, motor de preços próprio, portal para hotéis e agências fazerem reservas por conta-corrente, aplicação para os motoristas no telemóvel, faturação automática e dois painéis de administração. Tudo isto está escrito, testado em parte, e a funcionar — mas **não há um único link no site público que leve a nada disto**.

Isto não é forçosamente um erro. Pode ter sido uma decisão comercial consciente: captar contactos primeiro, automatizar depois. Mas é a decisão mais importante em cima da mesa, porque **muda a prioridade de quase tudo o resto neste relatório**.

Depois há um terceiro grupo: **coisas partidas ou em risco**. As mais graves são uma imagem de 9,7 MB na primeira dobra do site (que destrói a velocidade em telemóvel), um script de segurança que está literalmente com erro de sintaxe, código de depuração deixado em produção, e a ausência total de SEO e de medição de tráfego.

### Semáforo

| | Estado |
|---|---|
| 🟢 **Funciona e está no ar** | Landing bilingue PT/EN, formulário de pedido de orçamento, páginas legais completas (RGPD + T&C), FAQ, banner de cookies, deteção automática de idioma |
| 🟡 **Existe, funciona, mas está isolado** | Portal B2B para parceiros, PWA de motoristas, painéis de administração — todos operacionais, nenhum acessível a partir do site |
| 🔴 **Existe mas está desligado** | Funil de reserva com pagamento Stripe (código órfão), pagamento automático (desativado por defeito), faturação Vendus (em modo simulado) |
| ⚫ **Partido ou em risco** | Imagem hero de 9,7 MB, `audit_env.sh` com erro de sintaxe, código `debug:` em produção, sem SEO, sem analytics, sem CI, sem proteção anti-abuso no formulário |

### O número que resume tudo

O repositório tem **43 rotas de API**, **48 componentes**, **19 migrações de base de dados** e **quatro produtos distintos**. O site público usa **cinco componentes** e **uma rota de API**.

---

## 2. O negócio — o que a Way2Go vende

### Em linguagem simples

A Way2Go vende **transfers privados premium**, sobretudo de e para aeroportos, com motorista profissional. O posicionamento é de gama alta: veículos Mercedes ou equivalentes, receção com placa de nome no aeroporto, água engarrafada, Wi-Fi e carregadores a bordo.

Um ponto jurídico importante e bem resolvido: nos Termos e Condições a Way2Go **assume-se como intermediário tecnológico, não como transportador**. Ou seja, fornece a plataforma e a intermediação; quem executa fisicamente a viagem é o transportador parceiro, e a responsabilidade da viagem é dele. Isto é uma proteção legal significativa e está corretamente redigida.

Há três serviços na oferta: transfers de aeroporto, transfers locais, e **serviço à hora** (o motorista fica à disposição). A que se junta o canal B2B: hotéis e agências de viagens que reservam para os seus clientes.

**O ponto mais delicado é o preço: não aparece em lado nenhum no site.** A tabela de preços existe, está definida, mas só do lado do servidor. O cliente que entra no site não consegue saber quanto custa nada — tem de pedir orçamento e esperar. Num mercado onde os concorrentes dão preço instantâneo, isto é uma desvantagem competitiva direta e é a razão comercial mais forte para religar o funil automático.

### Detalhe técnico

**Fontes:** `src/dictionaries/pt.json`, `src/dictionaries/en.json`, `docs/MANUAL_DO_SISTEMA.md`

**Tabela de preços** (existe apenas em `supabase/migrations/20260419143000_native_engine_blueprint.sql`, nunca exposta ao público):

| Classe | Base | Por km | Mínimo |
|---|---|---|---|
| BUSINESS (Classe E ou similar) | € 8,00 | € 1,20 | € 20,00 |
| FIRST (Classe S ou similar) | € 12,00 | € 1,80 | € 30,00 |
| VAN (Classe V ou similar) | € 10,00 | € 1,50 | € 28,00 |

Lógica de margem B2B (`MARKUP` vs `NET_PRICE`) em `nestjs-api/src/public/pricing.service.ts`.

**Política comercial** (extraída dos T&C e FAQ nos dicionários):
- Meet & Greet com placa de nome
- 1 hora de espera gratuita em aeroportos/portos/estações; 15 minutos noutros locais
- Monitorização de voo com reagendamento até 6 horas de atraso
- Cancelamento gratuito com reembolso total até 24h antes; não reembolsável abaixo de 24h; No-Show retém a totalidade
- Bagagem: 1 volume de cabine + 1 mala média (≤20 kg) por passageiro
- Foro: Tribunais do Porto, lei portuguesa, resolução alternativa via CICAP

**A estratégia documentada** está em `docs/MANUAL_DO_SISTEMA.md` — o "Manual do Fundador". A tese central é a passagem de "montra" a "fábrica própria": deixar de ser um site que reencaminha pedidos e passar a ser plataforma com motor operacional próprio. Reivindica três vantagens — **controlo, resiliência, escala** — e descreve o portal B2B como *"franchising digital"*.

### ⚠️ Inconsistências de mensagem a corrigir

Estas são baratas de resolver e prejudicam a credibilidade:

1. **Cobertura geográfica contraditória.** O hero em inglês diz *"Your Reliable Worldwide Airport Transfers"*, mas a FAQ diz "todo o território nacional e Espanha, com especial foco em Lisboa, Porto e Algarve". Além disso, `src/components/HeroSection.tsx:19-25` **sobrepõe-se ao dicionário** com texto PT hardcoded ("Transfers Privados Portugal"), pelo que PT e EN comunicam posicionamentos diferentes. Prometer "worldwide" quando se opera em Portugal e Espanha é exposição desnecessária.

2. **Marca dupla: aparece `vruum.pt` no produto Way2Go.**
   - `src/components/Footer.tsx:22` — `const EMAIL = "reservas@vruum.pt"` (visível no site público)
   - `src/app/api/send-budget/route.ts:128` — os leads internos vão para `reservas@vruum.pt`, hardcoded, não configurável
   - `public/.htaccess:8` — redireciona para `https://www.vruum.pt`
   - O resto do projeto (legal, emails ao cliente, JSON-LD) usa `way2go.pt`, `support@way2go.pt`, `privacy@way2go.pt`
   - O `QuickQuoteForm` usa ainda um terceiro: `geral@way2go.pt`

3. **Métodos de pagamento contraditórios.** A FAQ promete "numerário, cartões de débito/crédito, MB Way e transferência bancária antecipada". O código só implementa Stripe (cartão). Como o funil está desligado, na prática hoje é tudo tratado manualmente — mas a FAQ está a prometer o que o sistema não faz.

4. **Duas taxonomias de veículos em paralelo.** Os dicionários e o `BookingForm` falam de *Business Class / First Class / Business Van*. O formulário que está realmente no ar (`QuickQuoteForm`) fala de *Berlina Executiva / Van Executiva / Duas Vans Executivas / Sob Consulta*. São vocabulários diferentes para a mesma frota.

---

## 3. O stack tecnológico

### Em linguagem simples

O site é construído com **Next.js**, a tecnologia padrão da indústria para sites rápidos em React — é o que usam a Nike, a TikTok ou o Notion. Está numa versão recente e bem configurada. Está alojado na **Vercel**, a plataforma dos próprios criadores do Next.js.

Os dados vivem no **Supabase** (uma base de dados PostgreSQL gerida). Os pagamentos usam **Stripe**. A gestão das reservas apoia-se num CRM externo chamado **TransferCRM**, e a faturação em **Vendus**. Os avisos de novos pedidos chegam por **Discord** e por email.

Em termos de qualidade de código, e isto merece ser dito com clareza: **está acima da média**. Não existe um único atalho de tipagem em todo o projeto — zero `any`, zero `@ts-ignore`, zero `eslint-disable`. Isso é raro e é sinal de disciplina. O problema não é a qualidade do código escrito; é o que está por ligar e por verificar automaticamente.

### Detalhe técnico

| Camada | Tecnologia | Notas |
|---|---|---|
| Framework | Next.js 15 (App Router) | `output: "standalone"`, `trailingSlash: true` |
| UI | React 19, TypeScript 5 (`strict`) | Alias `@/* → ./src/*` |
| Estilo | Tailwind CSS 3 + PostCSS | Paleta própria: `gold` #D4AF37, `dark` #050816 |
| i18n | Implementação manual | PT (default) + EN, dicionários JSON, `negotiator` + `@formatjs/intl-localematcher` |
| Base de dados | Supabase PostgreSQL | 19 migrações, políticas RLS |
| Pagamentos | Stripe 17 (server) + Stripe.js 9 / react-stripe-js 6 | |
| CRM | TransferCRM (REST B2B) | `src/lib/transfercrm/*` |
| Faturação | Vendus | `src/modules/booking-engine/providers/fiscal/vendus.provider.ts` |
| Email | Nodemailer (SMTP) + Resend/SendGrid | Dois caminhos distintos |
| Notificações | Discord webhook | Canal primário dos leads |
| Mapas | OSM Nominatim (default) ou Google Places | `src/app/api/places/autocomplete/route.ts` |
| Testes | Vitest | 11 ficheiros, ~40 casos |
| Gestão de estado | **nenhuma** | Só `useState`/`useEffect` + 2 hooks próprios |
| Analytics | **nenhuma** | Ver secção 7 |
| CMS | **nenhum** | Todo o texto vive nos dicionários JSON |

**Backend secundário.** Existe uma segunda aplicação **NestJS 10** em `nestjs-api/`, que serve `/api/public/quote` e `/api/public/book` por proxy. Está **excluída do `tsconfig.json` e do `eslint.config.mjs`** — nunca é verificada, lintada, testada nem compilada por qualquer script do repositório. Tem 45 ficheiros versionados, incluindo `dist/` compilado e um `.tsbuildinfo` de 120 KB.

**Estratégias de deploy coexistentes:**
- `vercel.json` — o deploy real e ativo
- `Dockerfile` + `.dockerignore` — criados a 18 de agosto, **não versionados**, nunca usados
- ~~`server.js` na raiz — entrypoint para cPanel~~ — **removido a 19 ago 2026**, substituído pela build standalone (`ecosystem.config.js` + `scripts/assemble-standalone.mjs`). Ver [Relatório de Viabilidade](RELATORIO_VIABILIDADE_MIGRACAO.md) §3.1 A1
- `public/.htaccess` — regras Apache de uma era de site estático, apontando para `vruum.pt`

---

## 4. Arquitetura — as quatro superfícies

### Em linguagem simples

O repositório não é um site. São **quatro produtos diferentes** no mesmo sítio, separados por um "porteiro" (o *middleware*) que decide, a cada pedido, qual deles serve conforme o endereço.

1. **O site público** — a landing bilingue. É o único que tem tráfego real.
2. **O portal B2B** — onde um hotel ou agência entra com um código, faz reservas para os seus clientes e vê o histórico e o crédito disponível. Está funcional e testado, mas é invisível: não está indexado no Google (de propósito) e nenhum link do site lá chega. Um parceiro só consegue entrar se lhe derem o endereço à mão.
3. **A app dos motoristas** — uma aplicação web instalável no telemóvel, servida num subdomínio próprio (`drivers.way2go.pt`), onde o motorista faz login, vê a agenda do dia e atualiza o estado da viagem.
4. **A administração** — dois painéis: um para gerir parceiros e comissões, outro para a parte financeira.

Por baixo de tudo isto está o "motor de reservas", que é a peça arquiteturalmente mais interessante do projeto: foi desenhado para ser **agnóstico ao fornecedor**. Ou seja, pode trabalhar com o CRM externo, com um motor próprio da Way2Go, ou com os dois ao mesmo tempo a comparar resultados — sem que o resto do sistema precise de saber qual está a ser usado. É boa engenharia.

### Detalhe técnico

**Encaminhamento** — `src/middleware.ts` trata quatro responsabilidades:
1. Bypass para `/drivers-pwa`, `/partner`, `/internal`, `/master-admin`
2. Reescrita por hostname: `drivers.*` → `/drivers-pwa/*`
3. Remoção de prefixos de idioma indevidos em secções não localizadas (308)
4. Negociação de idioma: `/` é **reescrito** (não redirecionado) para `/{locale}`; restantes caminhos sem idioma levam 308

**Mapa de rotas:**

| Superfície | Rotas | Estado |
|---|---|---|
| Público | `/[locale]`, `/[locale]/legal/{privacy,terms,cookies}`, `/[locale]/checkout/success` | Ativo |
| Parceiros | `/partner/book`, `/partner/[slug]/book`, `/partner/[slug]/dashboard` | Funcional, `noindex`, sem links de entrada |
| Motoristas | `/drivers-pwa`, `/drivers-pwa/login`, `/drivers-pwa/booking/[id]` | Funcional, subdomínio próprio |
| Admin | `/internal/admin`, `/master-admin/finance` | Funcional |
| Órfãs | `/admin/partners`, `/apitest` | Ver secção 7 |

**Motor de reservas** — `src/modules/booking-engine/`, padrão *ports & adapters*:
- Porta: `ports/booking-provider.port.ts` (`IBookingProvider`)
- Adaptadores: `providers/transfer-crm.provider.ts`, `providers/way2go-native.provider.ts`, `providers/fiscal/vendus.provider.ts`
- Orquestrador: `booking-engine.service.ts` com modos `STRICT_CRM | SHADOW_MODE | LOAD_BALANCE | STRICT_NATIVE`

O **Shadow Mode** (o default) é a peça mais elegante: cota o preço nos dois motores em paralelo, mostra ao cliente apenas o preço oficial do CRM, e regista internamente a diferença. Permite validar o motor próprio com tráfego real sem qualquer risco comercial. Documentado em `docs/engine-agnostic-architecture.md`.

---

## 5. O que funciona hoje

### Em linguagem simples

Apesar de tudo o que está por ligar, o que está no ar **funciona e está bem feito**:

- **O formulário de orçamento** é a peça central e está cuidada: sugestão automática de moradas enquanto se escreve, contadores de passageiros e bagagem, opções de cadeiras de bebé/criança/elevatório, e sugere automaticamente o veículo adequado ao número de pessoas. Quando o cliente submete, chega imediatamente um aviso ao Discord e dois emails (um de confirmação ao cliente, outro interno para a equipa).
- **As páginas legais estão completas e sérias** — política de privacidade RGPD com 8 secções e prazos de retenção definidos, e Termos e Condições completos em 2 partes. Ambas traduzidas integralmente.
- **O site é verdadeiramente bilingue** ao nível do conteúdo: uma comparação chave a chave dos dois dicionários não encontrou uma única chave em falta de nenhum dos lados.
- **A deteção de idioma funciona** — quem chega de um browser em inglês vê inglês, sem redirecionamentos visíveis.

### Detalhe técnico

**Homepage** — `src/app/[locale]/page.tsx` renderiza exatamente cinco componentes: `Navbar`, `HeroSection` (que envolve o `QuickQuoteForm`), `FAQSection`, `Footer`, `CookieConsent`.

**Funil de lead ativo:** `QuickQuoteForm` → `POST /api/send-budget` → Discord webhook (bloqueante) → 2 emails SMTP (bloqueantes).

**Paridade de dicionários:** verificada chave a chave, incluindo comprimento de arrays — **zero divergências** entre `pt.json` e `en.json`.

**Segurança de base bem executada:**
- Zero segredos versionados (`.env` e `.env.local` corretamente no `.gitignore`)
- Comparação de credenciais em tempo constante — `src/lib/partner/credentials.ts` usa SHA-256 + `timingSafeEqual`
- Sessões assinadas por HMAC com verificação prévia de comprimento
- Cookies de sessão com `httpOnly`, `sameSite: "lax"`, `secure` em produção
- **Ambos os webhooks verificam assinatura** — Stripe via raw body + `stripe-signature`; TransferCRM via HMAC + `timingSafeEqual`
- Validação zod em 15 rotas

**Higiene de tipos (excecional):** varrimento em todo o repositório devolve **0** ocorrências de `: any`, `as any`, `Record<string, any>`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` e `eslint-disable`. Apenas 18 conversões `as unknown as`.

---

## 6. O que existe mas está desligado

### Em linguagem simples

Esta é a secção que mais surpreende quem olha para o projeto pela primeira vez.

**O funil de reserva completo está escrito e não é usado.** O ficheiro `BookingForm.tsx` tem 1226 linhas e implementa tudo: pedir cotação, escolher classe de veículo, ver a decomposição do preço, pagar com cartão via Stripe, receber confirmação. Está traduzido nas duas línguas. E **nenhum ficheiro do projeto o importa** — verificado com uma pesquisa exaustiva que devolve apenas a própria definição. O histórico mostra quando aconteceu: o commit `5d88b16 feat: replace booking tabs with QuickQuoteForm on homepage` substituiu-o pelo formulário de orçamento.

E há mais camadas de desligamento por baixo: **mesmo que se voltasse a ligar o funil, o pagamento automático continuaria desativado**, porque a variável `MANUAL_PAYMENT_MODE` está ligada por defeito. E a faturação está em modo de simulação, a emitir números de fatura falsos.

Traduzindo em consequências: existe trabalho de desenvolvimento já pago e já feito — provavelmente várias semanas — que está a render zero. Religá-lo é muito mais barato do que construí-lo, mas exige uma decisão de negócio, não uma decisão técnica.

### Detalhe técnico

| Item | Ficheiro | Estado |
|---|---|---|
| Funil de reserva + Stripe | `src/components/BookingForm.tsx` | Órfão — 0 importações |
| Widget TransferCRM | `src/components/booking/TransferCrmWidget.tsx` | Órfão — 0 importações |
| Pagamento automático | `src/lib/payments/payment-flags.ts` | `MANUAL_PAYMENT_MODE` default `"1"` (ligado) |
| Faturação Vendus | `providers/fiscal/vendus.provider.ts:35-38` | Default `MOCK` — emite `VENDUS-MOCK-…` |
| Resumo fixo de reserva | `src/components/BookingForm.tsx:26` | `BOOKING_STICKY_SUMMARY_ENABLED = false` — *"off until UX is refined"* |
| Endpoint de conclusão | `src/app/api/checkout/complete/route.ts:11` | Devolve `code: "DEPRECATED"` (410) |
| Dispatch nativo (fases 4-5) | `docs/engine-agnostic-architecture.md` | Plano, não implementação |

**Conteúdo traduzido nunca renderizado:** todo o ramo `booking.checkout.*` dos dois dicionários (classes de veículo, decomposição de preço com taxa base/por-km/por-minuto/multiplicador/suplemento horário/tarifa mínima, "Continuar para pagamento", "Confirmar e pagar", pré-visualização de rota), mais `booking.success.*` e `booking.errors.*`. E ainda `hero.badge` e `hero.cta`, que estão traduzidos mas nunca são mostrados porque o `HeroSection` os ignora.

**Variáveis de ambiente que já não controlam nada:** `NEXT_PUBLIC_BOOKING_UI_MODE`, `NEXT_PUBLIC_BOOKING_UI_TOGGLE`, `MIDDLEWARE_DEBUG_API`, `NEST_QUOTE_PORT` e as cinco `NEXT_PUBLIC_TRANSFERCRM_WIDGET_*` — todas documentadas no `.env.example`, todas sem efeito.

**Dados de teste na base de produção:** a seed do motor nativo contém fixtures óbvias — "Driver Lisboa Centro", matrículas `00-AA-01`, email `drv1@way2go.pt`.

---

## 7. O que está partido ou em risco

Ordenado por severidade. Cada item foi verificado individualmente.

### 🔴 CRÍTICO

#### C1 — Imagem de 9,7 MB na primeira dobra do site

`public/hero-chauffeur.webp` pesa **10 160 326 bytes**. É o maior ficheiro do repositório por larga margem (o segundo maior tem 276 KB). E `next.config.ts` define `images: { unoptimized: true }`, o que desativa toda a otimização automática do Next.js — não há redimensionamento nem negociação de formato. A imagem é usada em `src/components/HeroSection.tsx:84` com `priority`, ou seja, é carregada com prioridade máxima.

**O que significa:** um visitante em 4G espera dezenas de segundos, ou desiste. É a métrica LCP (*Largest Contentful Paint*) do Google, que afeta diretamente o ranking de pesquisa e a taxa de conversão. É o pior problema do site e está na porta de entrada.

**Esforço: XS.** Comprimir a imagem para ~200 KB e remover `unoptimized` é uma tarefa de menos de uma hora com o maior retorno isolado de todo este relatório.

#### C2 — `audit_env.sh` está sintaticamente partido

O ficheiro tem texto colado por engano. `git diff` mostra exatamente duas linhas corrompidas:

```diff
-  fi          →  +  fisandbox      (linha 35)
-  (linha vazia) → +FR              (linha 37)
```

`bash -n audit_env.sh` falha com `syntax error near unexpected token 'done'`. O script **não corre de todo**.

**O que significa:** este é o guarda que verifica se todas as variáveis de ambiente críticas estão configuradas antes de um deploy. Está morto, e em silêncio — ninguém recebe erro, simplesmente deixou de proteger.

**Esforço: XS.** Alteração não commitada; reverter as duas linhas resolve.

#### C3 — `.env.production` não está protegido

O `.gitignore` cobre `.env` e `.env*.local`, mas **não** `.env.production`. Verificado: `git check-ignore .env.production` não devolve nada.

O `audit_env.sh` executa `vercel env pull .env.production` — descarrega **todos os segredos de produção em texto simples** — e só apaga o ficheiro na última linha. Como o script agora aborta a meio (C2), o ficheiro fica lá.

**O que significa:** basta um `git add .` distraído para comprometer `TRANSFERCRM_BEARER_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `W2G_MASTER_ADMIN_PASSWORD`, `PARTNER_SESSION_SECRET` e `STRIPE_SECRET_KEY`.

**Esforço: XS.** Uma linha no `.gitignore`.

#### C4 — Dados falsos nos dados estruturados de produção

`src/app/[locale]/layout.tsx:39` injeta em **todas as páginas** um bloco JSON-LD `LocalBusiness` com:
- `"telephone": "+351XXXXXXXXX"` — placeholder literal
- `"streetAddress": "Lisboa"`, `"postalCode": "1000"` — morada genérica, não real

**O que significa:** é isto que o Google lê para perceber quem é a empresa. Dados NAP (Nome/Morada/Telefone) inconsistentes ou com placeholders são um fator de desqualificação para resultados enriquecidos e um sinal de spam. Está no ar neste momento, e contradiz os contactos reais que já estão no rodapé.

**Esforço: XS.**

#### C5 — Ausência total de SEO

Não existe, em todo o projeto: `sitemap.ts`, `robots.ts`/`robots.txt`, favicon, `icon.*`, `apple-icon.*`, imagem Open Graph, nem `twitter-image`. A pasta `public/` tem exatamente três ficheiros: `.htaccess`, `driver-sw.js` e o webp de 9,7 MB.

Os metadados em `src/app/[locale]/layout.tsx:9-16` têm apenas `title`, `description` e `keywords` (que o Google ignora desde 2009). Não há `metadataBase`, nem `alternates.canonical`, nem `alternates.languages` (hreflang), nem `openGraph`, nem `twitter`, nem `robots`.

**O que significa:** todas as páginas do site — homepage, privacidade, termos, cookies — partilham o mesmo título e a mesma descrição. São indistinguíveis para o Google. E qualquer link partilhado no WhatsApp, LinkedIn ou Facebook aparece sem imagem, sem título decente e sem descrição. Para um site cujo único objetivo é captar contactos, isto é perder tráfego à entrada.

**Esforço: M.**

#### C6 — Não existe integração contínua

Não há diretório `.github/`. Os comandos `lint` (configurado com `--max-warnings=0`), `test` e `build` **nunca são executados automaticamente**. Nada impede que o `main` fique partido — e, de facto, o `main` tem neste momento dois commits com o prefixo `debug:`.

**O que significa:** a excelente disciplina de tipagem descrita na secção 5 não está protegida por nada além do cuidado individual. Uma distração e regride.

**Esforço: S.**

---

### 🟠 ALTO

#### A1 — Formulário público sem qualquer proteção contra abuso

`src/app/api/send-budget/route.ts` não tem rate limiting, CAPTCHA, honeypot, verificação de origem nem autenticação. Uma pesquisa por `rate.?limit|captcha|turnstile|honeypot` em todo o repositório não devolve nada de entrada.

Cada POST anónimo dispara 1 webhook Discord + 2 envios SMTP bloqueantes. Um script trivial esgota a quota de SMTP, faz revogar o webhook do Discord por excesso de pedidos, e inunda a caixa de reservas.

Agrava: o schema zod (linhas 7-24) **não tem `.max()` em nenhuma string**. `pickup`, `dropoff`, `observations` e `name` são ilimitados. Como os campos de embed do Discord têm limite de 1024 caracteres, um `observations` longo provoca 400 do Discord → a rota devolve 500 → **o lead perde-se**.

**Esforço: S.**

#### A2 — Código de depuração em produção

`src/app/api/send-budget/route.ts:81` — comentário literal: `// ── 2. Emails (DEBUG — aguarda para expor erros nos logs da Vercel)`. E na linha 87: `// ── Email sender (DEBUG MODE — bloqueante para expor erros nos logs)`.

O `await sendEmailsBackground(d)` foi tornado bloqueante para depuração no commit `df2fa97`, revertendo deliberadamente o `c2a51ef feat: add parallel background emails`. Dois envios SMTP estão agora no caminho crítico do pedido do utilizador — o cliente vê o *spinner* durante todo esse tempo.

Pior: as linhas 117 e 133 registam `info.accepted` e `info.rejected` nos logs da Vercel — ou seja, **endereços de email de clientes escritos em logs com retenção**. Num site que publica uma política RGPD completa, isto é uma incoerência com exposição regulatória.

**Esforço: XS** (reverter os dois commits `debug:`).

#### A3 — Selo Trustpilot é falso

`src/components/HeroSection.tsx:57-77` desenha à mão um SVG estático com a palavra **"EXCELLENT"** e 5 estrelas cheias. Não tem classificação real, não tem contagem de avaliações, não é um link, e não é o widget oficial do Trustpilot. A única coisa real é a meta tag de verificação de domínio em `src/app/[locale]/layout.tsx:14`.

**O que significa:** é exibir uma classificação de avaliações que não corresponde a dados verificados. Além do risco reputacional, é o tipo de prática que os próprios termos do Trustpilot proíbem e que pode configurar prática comercial enganosa perante a ASAE/DECO. Ou se instala o widget verdadeiro, ou se remove.

**Esforço: S.**

#### A4 — `/apitest` é uma consola de API pública e sem autenticação

`src/app/apitest/page.tsx` é um executor de pedidos para `/api/v1/orders`, `/api/v1/clients`, `/api/v1/drivers`, `/api/v1/vehicles`, incluindo um corpo POST de criação e (desde o commit `8838ddf`) um campo livre para cabeçalho de autorização. Não está protegido pelo middleware nem bloqueado no `next.config.ts`.

Está acessível em produção e funciona como um mapa do inventário da API interna para quem o encontrar. Ironicamente, aponta para endpoints `/api/v1/*` que **nem sequer existem** neste projeto.

**Esforço: XS** (apagar).

#### A5 — Sem proteção contra ataques de força bruta em nenhum login

`src/app/api/internal/admin/login/route.ts`, `src/app/api/partner/auth/route.ts`, `src/app/api/drivers/auth/login/route.ts`. A comparação é corretamente em tempo constante, mas não há contador de tentativas, bloqueio, backoff nem limite por IP.

`W2G_MASTER_ADMIN_PASSWORD` é uma **password única e partilhada** a proteger o painel financeiro. Adivinhação online ilimitada é possível.

**Esforço: S.**

#### A6 — Sem páginas de erro ou de 404

Zero `error.tsx`, `global-error.tsx`, `not-found.tsx` e `loading.tsx` em toda a árvore `src/app`. Qualquer exceção em render produz o ecrã de erro por defeito do Next.js — sem marca, em inglês, e destruindo o layout do idioma. Um 404 neste site bilingue devolve a página inglesa genérica do Next.

**Esforço: S.**

#### A7 — Cobertura de testes residual

11 ficheiros de teste, ~40 casos, todos concentrados em `src/lib/**` e `src/modules/**`. **Zero testes** para as 43 rotas de API, **zero** para os 48 componentes, **zero** para o `src/middleware.ts` — que é precisamente o ficheiro que já levou três correções urgentes recentes (`e6b7919`, `14ddc54`, `7bfdab4`). Não há framework E2E (Playwright/Cypress), nem provider de cobertura no `vitest.config.ts`, nem script `test:coverage`. A cobertura não é apenas baixa: é **impossível de medir** com a configuração atual.

**Esforço: L** (para cobertura significativa das rotas críticas).

---

### 🟡 MÉDIO

#### M1 — O único funil de receita depende de variáveis não documentadas

`/api/send-budget` exige `DISCORD_WEBHOOK_URL` — e se não estiver definida devolve **HTTP 500 e perde o lead** (linhas 49-56). Depois usa `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.

**Nenhuma destas cinco variáveis consta do `.env.example`** (verificado: 26 chaves documentadas, 0 correspondências para SMTP ou DISCORD). Quem fizer setup do projeto de raiz seguindo a documentação fica com o formulário partido e sem saber porquê.

Agravante de arquitetura: o Discord — um canal de notificação — é tratado como dependência **crítica e bloqueante**, enquanto o email (o registo formal) é tolerante a falhas. A hierarquia está invertida: se o Discord estiver em baixo, o cliente recebe um erro e o negócio perde o contacto.

**Esforço: S.**

#### M2 — Duplicação de conteúdo entre `/` e `/pt`

`src/middleware.ts` faz `NextResponse.rewrite` de `/` para `/${locale}` (commit `14ddc54`). Assim, `way2go.pt/` e `way2go.pt/pt/` devolvem **HTML byte a byte idêntico**. Sem tag canonical (C5), é duplicação de conteúdo clássica, que divide a autoridade dos links entre dois endereços.

**Esforço: XS** (resolvido pelo lote de SEO).

#### M3 — O HTML servido diz sempre `lang="pt"`, mesmo em inglês

`src/app/layout.tsx:10` tem `<html lang="pt">` hardcoded. O `src/components/LocaleHtmlLang.tsx` corrige-o do lado do cliente, num `useEffect`. Mas os motores de busca e os leitores de ecrã que consomem o HTML inicial veem português nas páginas inglesas.

Há prova direta disto no próprio repositório: o ficheiro `temp_home_en.html` — que é um dump da página **inglesa** — começa com `<html lang="pt">`.

**Esforço: S.**

#### M4 — Zero associações label/campo em todo o codebase

`grep -rn "htmlFor" src --include=*.tsx` → **0 correspondências**, contra 58 elementos `<button>` e dezenas de inputs. O `QuickQuoteForm` usa um componente `FieldLabel` puramente visual (linha 249) que desenha texto ao lado de um `<input>` sem qualquer `id`/`htmlFor` a ligá-los.

**O que significa:** um utilizador com leitor de ecrã encontra campos sem nome no formulário principal de conversão do site. Além da barreira de acessibilidade, é risco de conformidade — a diretiva europeia de acessibilidade digital aplica-se progressivamente ao setor privado.

**Esforço: S.**

#### M5 — Não existe qualquer medição de tráfego ou conversão

Pesquisa por `gtag|googletagmanager|google-analytics|fbq|plausible|posthog|@vercel/analytics|hotjar|clarity` em `src/` e `public/` → **nenhuma correspondência**. Não há Google Analytics, nem Tag Manager, nem pixel da Meta, nem nada.

Ao mesmo tempo, `src/components/CookieConsent.tsx` escreve `localStorage["cookie-consent"]` e **nada lê esse valor de volta** — o banner não bloqueia coisa nenhuma. E a política de cookies nos dicionários (que só tem 2 secções rudimentares, contra as políticas de privacidade e T&C que estão completas) **afirma que são usados cookies analíticos** que não existem.

**O que significa:** não se sabe quantas pessoas visitam o site, de onde vêm, quantas começam a preencher o formulário nem quantas desistem. Numa operação de captação de leads, está-se a decidir às cegas. E declara-se na política de cookies uma coisa que não corresponde à realidade — o que, curiosamente, é o problema mais fácil de resolver dos dois.

**Esforço: S.**

#### M6 — 33 ficheiros compilados versionados ao lado do código-fonte

`src/lib/transfercrm/*` (30 ficheiros `.js`/`.d.ts`/`.js.map`) e `src/lib/routing/estimate-route-distance-km.*` (3). Existem `client.ts` e `client.js` com o mesmo conteúdo. O `eslint.config.mjs` ignora explicitamente `src/lib/transfercrm/**/*.js`, pelo que as cópias compiladas **não são lintadas e podem divergir em silêncio** do TypeScript que supostamente refletem. Com `moduleResolution: bundler`, um import de `@/lib/transfercrm/client` pode resolver para o `.js` obsoleto.

**Esforço: XS.**

#### M7 — O Dockerfile produziria uma build partida

O `Dockerfile` (não versionado) executa `RUN npm run build` sem qualquer `ARG`/`ENV` para as variáveis `NEXT_PUBLIC_*`. O Next.js incorpora essas variáveis no bundle **em tempo de build**, portanto a imagem sairia com `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` todas a `undefined` — o Stripe e a PWA dos motoristas falhariam em runtime, sem qualquer erro em build. **Este ponto mantém-se por resolver.**

~~Secundário: `CMD ["node", "server.js"]` é ambíguo.~~ **Resolvido a 19 ago 2026.** O `server.js` da raiz foi removido e o `CMD` documentado. Nota de rigor: este ponto estava sobrevalorizado na versão original — o estágio `runner` do Dockerfile arranca de uma imagem limpa e nunca copiava o `server.js` da raiz, pelo que o `CMD` já resolvia corretamente para o do standalone. Era um problema de legibilidade, não de runtime.

**Esforço restante: S** (apenas os `ARG` das `NEXT_PUBLIC_*`).

#### M8 — 13 de 43 rotas de API sem `try`/`catch`

Incluindo `src/app/api/checkout/intent/route.ts` e `src/app/api/checkout/status/route.ts`, que estão no caminho de pagamento. Uma exceção não tratada devolve um 500 opaco sem sequer um `console.error` que permita diagnosticar.

**Esforço: S.**

#### M9 — CSP enfraquecida e cabeçalhos de segurança em falta

`next.config.ts` inclui `'unsafe-inline'` em `script-src` e `script-src-elem`, mais `blob:`, e `img-src` aceita qualquer host HTTPS. Isto neutraliza o principal benefício da CSP contra XSS. Não estão configurados `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy` nem HSTS.

A CSP permite ainda `https://wp.way2go.pt` — o backend WordPress já desativado.

**Esforço: S.**

#### M10 — `/admin/partners` é uma rota morta

`src/app/admin/partners/page.tsx` duplica o painel de administração, mas `/admin` não consta das secções não localizadas do middleware. O pedido é redirecionado para `/pt/admin/partners` → **404**. Existem também dois ficheiros de login praticamente idênticos (`internal/admin/login` e `master-admin/login`) que fazem POST para o mesmo endpoint e diferem apenas no redirecionamento.

**Esforço: XS.**

---

### ⚪ BAIXO

- **`temp_home_en.html` / `temp_home_pt.html`** (32 KB cada, não versionados) — dumps SSR da homepage de produção capturados em abril, com o *fingerprint* de deployment `dpl_FGjseCsAhFrLjZfYHqxCCkn2x2vY`. Foram provavelmente obtidos para comparar os renders PT e EN (é assim que M3 se torna observável). São detritos com ~4 meses e seriam commitados por qualquer `git add .`.
- **`src/components/QuickQuoteForm.wp-endpoint.php`** — endpoint WordPress residual dentro da pasta de componentes React.
- **`src/lib/nest-api-base-url.ts`** tem `"use client"` sendo um módulo de lógica de servidor — arrasta-se para o bundle do cliente desnecessariamente.
- **`escapeHtml`** (fim do `send-budget/route.ts`) não escapa a plica `'`. Hoje é seguro porque todas as interpolações estão em atributos com aspas duplas, mas é um invariante frágil. Além disso, `d.email` é interpolado no `mailto:` **sem** passar pelo `escapeHtml`, ao contrário dos campos vizinhos.
- **`formatDateTime`** (linha 144) desestrutura resultados de `.split()` sem validação — entrada malformada produz `"undefined/undefined/undefined"` no email de confirmação ao cliente.
- **`tsconfig.json`** para em `strict: true`; faltam `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals` e `noUnusedParameters` (é esta última lacuna que deixa passar o ponto anterior).
- **`.env` e `.env.local` divergiram** — o `.env` local guarda `DRIVER_LOGIN_EMAIL`/`DRIVER_LOGIN_PASSWORD`/`DRIVER_SESSION_SECRET`, resíduos da autenticação de motoristas anterior ao Supabase, que já não são lidos por nenhum ficheiro em `src/`.
- **`/[locale]/checkout/success`** está em português hardcoded, sem tradução, com acentos em falta ("O seu transfer esta pre-reservado… proximos minutos") e um botão em inglês ("Back to booking").
- **`QuickQuoteForm.tsx:257`** — o badge de campo opcional está hardcoded como `"opcional"` e aparece assim também na versão inglesa.
- **Os emails transacionais são sempre em português**, mesmo quando o formulário é submetido com `idioma: "en"` — a língua é apenas reportada no rodapé ("Formulário EN-US"), nunca usada para trocar o template.
- **O `QuickQuoteForm` tem o seu próprio dicionário PT/EN privado** (linhas 54-212 e 529-570), duplicado fora de `src/dictionaries/` — duas fontes de verdade para manter sincronizadas.

---

## 8. O que está genuinamente bem-feito

Vale a pena isolar isto, porque num relatório com esta quantidade de achados é fácil perder-se a proporção. **O problema deste projeto não é a qualidade do código. É o que está por ligar e por verificar automaticamente.**

- **Higiene de tipos excecional** — zero `any`, zero `@ts-ignore`, zero `eslint-disable` em 132 ficheiros TypeScript. Nunca vi isto num projeto desta dimensão sem CI a forçá-lo.
- **Criptografia correta** — `timingSafeEqual` em todas as comparações de credenciais, HMAC nas sessões, verificação de assinatura nos dois webhooks.
- **Sem segredos versionados** — verificado com varrimento de padrões `sk_live_`, `whsec_`, `AIza[…]` em todos os ficheiros seguidos por git. Só aparecem os placeholders do `.env.example`.
- **Arquitetura hexagonal genuína** no motor de reservas, com Shadow Mode — desenho de nível sénior, não é cosmética.
- **Separação cliente/servidor sensata** — 23 de 48 `.tsx` são componentes de cliente, concentrados onde há realmente interatividade. Não é `"use client"` em todo o lado.
- **Fontes carregadas corretamente** — `next/font/google` com subset latino, self-hosted, sem layout shift.
- **Documentação interna acima da média** — `OPERATIONAL_CHECKLIST.md` com 13 secções e veredicto por item, `MANUAL_DO_SISTEMA.md`, `engine-agnostic-architecture.md` com plano de 5 fases, e 19 migrações Supabase ordenadas com políticas RLS.
- **Validação zod em 15 rotas**, incluindo todos os logins e todos os endpoints de parceiro e fiscais.

---

## 9. Recomendações por prioridade

> **Sobre as estimativas.** A escala abaixo mede **esforço de implementação** apenas. Não inclui QA, revisão, nem o tempo de decisão de negócio. São aproximações para ordenar prioridades e servir de base a orçamento — não são compromissos.
>
> **XS** < 1h · **S** ~meio dia · **M** 1-2 dias · **L** 3-5 dias · **XL** > 1 semana

### Fase 0 — Fazer esta semana (total: ~1 dia)

| # | Ação | Esforço | O que destrava | Risco de não fazer |
|---|---|---|---|---|
| 1 | Comprimir `hero-chauffeur.webp` e remover `images.unoptimized` | **XS** | Velocidade do site em telemóvel, ranking Google, taxa de conversão | Visitantes desistem antes de ver a página |
| 2 | Corrigir `audit_env.sh` (2 linhas) | **XS** | Verificação de env antes de deploy volta a funcionar | Deploys com variáveis em falta sem aviso |
| 3 | Adicionar `.env.production` ao `.gitignore` | **XS** | — | Exposição de todos os segredos de produção |
| 4 | Reverter os commits `debug:` (email bloqueante + logs de PII) | **XS** | Formulário mais rápido; conformidade RGPD | Emails de clientes em logs; espera desnecessária |
| 5 | Corrigir telefone e morada no JSON-LD | **XS** | Elegibilidade para resultados enriquecidos Google | Sinal de spam para o Google |
| 6 | Apagar `/apitest` e `temp_home_*.html` | **XS** | — | Mapa da API interna exposto publicamente |
| 7 | Resolver o selo Trustpilot (widget real ou remover) | **S** | Credibilidade; conformidade | Prática comercial potencialmente enganosa |

**Estas sete ações custam cerca de um dia e eliminam todos os riscos críticos imediatos.**

### Fase 1 — Próximas 2 semanas (total: ~4-5 dias)

| # | Ação | Esforço | O que destrava |
|---|---|---|---|
| 8 | Lote SEO: `metadataBase`, canonical, hreflang, `sitemap.ts`, `robots.ts`, favicon, imagem OG, metadados por página | **M** | Indexação no Google, partilha decente em redes sociais, fim da duplicação `/` vs `/pt` |
| 9 | Instalar analytics + tornar o banner de cookies funcional | **S** | **Passar a saber quantos visitantes há e quantos convertem** — hoje decide-se às cegas |
| 10 | Rate limiting + honeypot + `.max()` nas strings do `send-budget` | **S** | Proteção do único funil de receita |
| 11 | Documentar `SMTP_*` e `DISCORD_WEBHOOK_URL` no `.env.example`; tornar o Discord não-bloqueante | **S** | Deixa de se perder leads quando o Discord falha |
| 12 | CI no GitHub Actions: `lint` + `test` + `build` | **S** | Protege a disciplina de código que já existe |
| 13 | `error.tsx` + `not-found.tsx` com marca, nos dois idiomas | **S** | Erros deixam de expor o ecrã default do Next |
| 14 | Corrigir `lang` no SSR + adicionar `htmlFor` nos campos do formulário | **S** | Acessibilidade e SEO de idioma |

### Fase 2 — Consolidação (total: ~1-2 semanas)

| # | Ação | Esforço | O que destrava |
|---|---|---|---|
| 15 | Unificar a marca: eliminar `vruum.pt` do produto Way2Go, tornar o destinatário configurável por env | **S** | Coerência de marca no site público |
| 16 | Alinhar mensagem: resolver "Worldwide" vs Portugal/Espanha; alinhar métodos de pagamento da FAQ com a realidade; unificar taxonomia de veículos | **S** | Credibilidade e clareza comercial |
| 17 | Brute-force protection nos três logins | **S** | Proteção do painel financeiro |
| 18 | Testes para as rotas de API críticas + para o `middleware.ts` | **L** | Fim dos hotfixes repetidos no middleware |
| 19 | Limpeza: remover `.js` compilados, `/admin/partners` morta, `.wp-endpoint.php`, decidir sobre o Dockerfile | **S** | Redução de dívida e de ambiguidade |
| 20 | Traduzir a página de sucesso do checkout e os emails transacionais | **S** | Experiência bilingue coerente |

---

## A decisão estratégica de fundo

Tudo acima é execução. **Há uma decisão que não é técnica e que tem de ser tomada primeiro**, porque reordena as prioridades:

> **Religar o funil de reserva automático, ou assumir o modelo de captação de leads e otimizá-lo?**

### Cenário A — Assumir a captação de leads

Aceitar que o modelo é: cliente pede, humano responde com preço. Otimizar tudo em torno disso — velocidade do formulário, taxa de resposta, medição da conversão, talvez uma tabela de preços indicativa na página para reduzir a fricção.

- **Esforço:** Fases 0 + 1 + 2 ≈ **3 semanas**
- **Implica:** arquivar formalmente `BookingForm.tsx`, o widget do TransferCRM, e o ramo `booking.checkout.*` dos dicionários — ou pelo menos marcá-los como inativos, para deixarem de confundir quem lê o código
- **Vantagem:** simples, previsível, permite margem por negociação caso a caso
- **Desvantagem:** não escala com o volume, exige pessoas disponíveis para responder, e perde os clientes que querem preço imediato às 2 da manhã

### Cenário B — Religar o funil automático

Voltar a expor o `BookingForm`, desligar o `MANUAL_PAYMENT_MODE`, passar o Vendus de `MOCK` a produção, validar o motor de preços com tráfego real através do Shadow Mode que já existe.

- **Esforço:** Fases 0 + 1 + 2, **mais L a XL** para religar, validar preços reais e testar o fluxo de pagamento ponta a ponta ≈ **5 a 7 semanas**
- **Implica:** validar a tabela de preços com dados reais antes de a expor; testes E2E do fluxo de pagamento (hoje inexistentes); decidir o destino do backend NestJS não verificado
- **Vantagem:** o trabalho já feito passa a render; preço instantâneo é vantagem competitiva direta; escala sem adicionar pessoas
- **Desvantagem:** um erro no motor de preços é receita perdida ou prejuízo direto, e hoje não há testes que o cubram

### Recomendação

**Executar a Fase 0 imediatamente, independentemente da decisão** — são riscos reais e custam um dia.

Depois, **executar a Fase 1 antes de decidir**. A razão é o ponto 9: neste momento não existe **um único dado** sobre quantas pessoas visitam o site, quantas começam a preencher o formulário e quantas desistem. A decisão entre o Cenário A e o Cenário B depende inteiramente dessa informação — se o formulário atual converte bem, o Cenário A pode ser suficiente; se houver desistência massiva no formulário, o Cenário B justifica-se sozinho.

Instalar analytics custa meio dia e transforma uma decisão de instinto numa decisão informada. É o melhor investimento isolado deste relatório a seguir à imagem hero.

---

*Relatório gerado por análise estática do repositório. Nenhum ficheiro do projeto foi alterado durante a auditoria. Todas as afirmações técnicas citam caminhos de ficheiro verificáveis no commit `e6b7919`.*

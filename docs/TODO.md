# TODO Operacional — Way2Go

Lista de trabalho viva, derivada do [Relatório de Auditoria](RELATORIO_AUDITORIA.md) e do
[Relatório de Viabilidade](RELATORIO_VIABILIDADE_MIGRACAO.md).

**Última atualização:** 19 de agosto de 2026 · **Base:** commit `e6b7919`

---

## Regras de integridade

Estas regras existem para que a lista continue a ser fiável à medida que cresce.

1. **Nada entra sem evidência.** Cada item cita um ficheiro e, quando aplicável, a linha. Se não
   houver caminho verificável, o item vai para a secção *§7 Por verificar* — não para as fases.
2. **Não inventar.** Se algo não foi confirmado por leitura do código ou por execução, diz-se
   explicitamente que não foi. Suposição marcada como facto é o pior resultado possível desta lista.
3. **Cada correção traz o seu teste.** Nenhum item fecha sem a coluna *Como verificar* ter sido
   executada e o resultado registado em §8.
4. **Não partir o que funciona.** Antes de fechar qualquer item: `npm run lint` e `npm test` têm de
   passar. Estado de referência atual — lint limpo, **120 testes**, `tsc --noEmit` sem erros. `npm run test:coverage` mede a cobertura.
5. **Uma alteração, uma razão.** Não misturar correções de temas diferentes no mesmo commit; se um
   item se revelar maior do que o descrito, dividir em vez de alargar em silêncio.
6. **Corrigir a lista também.** Se um item se revelar errado ou exagerado, corrigir aqui e dizer
   porquê — ver o exemplo em §8 (o `CMD` do Dockerfile estava sobrevalorizado).

## Legenda

| Estado | Significado |
|---|---|
| ⬜ | Por fazer |
| 🔄 | Em curso |
| ✅ | Feito e verificado |
| 🚫 | Bloqueado — depende de decisão em §6 |
| ❓ | Não verificável a partir do repositório — ver §7 |

Esforço: **XS** < 1h · **S** ~meio dia · **M** 1-2 dias · **L** 3-5 dias · **XL** > 1 semana
*(esforço de implementação; não inclui QA nem decisão de negócio)*

---

## 1. Concluído

| # | Item | Evidência | Verificação executada |
|---|---|---|---|
| ✅ **A1** | Conflito `server.js` vs `output: standalone` | Havia dois modelos de arranque incompatíveis com o mesmo nome de ficheiro | §8, 19 ago |
| ✅ **F0-1** | Imagem hero: 9,69 MB → **181 KB** (−98,2%) e otimização reativada | 5327×7990 → 1600×2400; `sharp` instalado; `images.unoptimized` removido | §8, 19 ago |
| ✅ **F0-2** | `audit_env.sh` restaurado | A corrupção nunca foi comitada — bastou `git checkout --` | `bash -n` OK, diff vazio |
| ✅ **F0-3** | `.env.production` protegido | `.gitignore` reescrito com `.env.*` + `!.env.example` | `git check-ignore` a 5 variantes |
| ✅ **F0-4** | Estado `DEBUG` do `send-budget` removido | Emails paralelizados e em paralelo com o Discord; PII fora dos logs | §8, 19 ago |
| ✅ **F0-5** | JSON-LD sem dados falsos | Telefone real; `address`/`geo` fabricados removidos | §8, 19 ago |
| ✅ **F0-6** | `/apitest` e `temp_home_*.html` eliminados | Expôs **dois bugs sérios** — ver §8 | §8, 19 ago |
| ✅ **NOVO-1** | Matcher do middleware deixava passar `/api*` | Bug pré-existente descoberto no F0-6 | §8, 19 ago |
| ✅ **NOVO-2** | Build não limpava rotas apagadas | Bug pré-existente descoberto no F0-6 | §8, 19 ago |
| ✅ **NOVO-3** | Service worker dos motoristas inacessível (307→404) | Bug pré-existente descoberto no F1-1 | §8, 19 ago |
| ✅ **F1-1** | SEO: sitemap, robots, canonical, hreflang, favicon, OG | 8 URLs, 24 hreflang, títulos distintos por página | §8, 19 ago |
| ✅ **F1-3** | Rate limit, honeypot e limites de comprimento | 6.º pedido → 429; string longa → 400 | §8, 19 ago |
| ✅ **F1-4** | Discord não-bloqueante; env documentadas | Lead sobrevive à falha de um canal | §8, 19 ago |
| ✅ **F1-5** | CI: lint, testes e build | `.github/workflows/ci.yml` | §8, 19 ago |
| ✅ **F1-6** | Páginas de erro e 404 com marca | 404 nos dois idiomas | §8, 19 ago |
| ✅ **F1-7** | `lang` no SSR + labels dos campos de morada | `/en/` passa a servir `lang="en"` | §8, 19 ago |
| 🚫 **F1-2** | Analytics | Adiado por decisão de 19 ago — bloqueia §6-A | §6 |
| ✅ **F2-1** | Rodapé mostra `reservas@way2go.pt`; entrega mantém-se | ⚠️ falta alias de email — ver §8 | §8, 19 ago |
| ✅ **F2-2** | Cobertura alinhada: Portugal e Espanha | Removida a sobreposição do HeroSection ao dicionário | §8, 19 ago |
| ✅ **F2-3** | Força bruta travada nos 3 logins | 5 falhas → 429, isolado por IP | §8, 19 ago |
| ✅ **F2-5** | 36 ficheiros de dívida removidos | 33 compilados + rota morta + PHP + .htaccess | §8, 19 ago |
| ✅ **F2-6** | Página de sucesso e email do cliente traduzidos | + injeção de HTML fechada | §8, 19 ago |
| ✅ **F2-4** | Testes ao middleware e ao funil de leads | 116 testes; middleware 94,6%, send-budget 91,4% | §8, 19 ago |
| ✅ **F2-7** | Dockerfile apagado por decisão | Elimina o 3.º caminho de deploy sem dono | §8, 19 ago |
| ✅ **A3** | Cabeçalhos de segurança e cache (fecha o M9) | 6 cabeçalhos novos + cache por tipo de recurso | §8, 19 ago |
| ✅ **M8** | Tratamento de erros nas rotas | **12 dos 13 já cobertos**; 1 real corrigido (`drivers/auth/logout`) | §8, 19 ago |
| ✅ **M10** | 4 opções de rigidez adotadas | Medidas: 0, 0, 0 e 1 erro | §8, 19 ago |
| ✅ **L-vários** | `formatDateTime`, `escapeHtml`, fuga de PT no email EN | 4 testes novos | §8, 19 ago |
| ✅ **VS Code** | Aviso do `.env` resolvido sem expor segredos | `.vscode/settings.json` versionado | §8, 19 ago |
| ⬜ **NOVO-4** | CSP com nonce, para remover `'unsafe-inline'` | Exige mover a CSP para o middleware; risco de partir hidratação e Stripe | — |
| ⬜ **NOVO-5** | `noUncheckedIndexedAccess` | **21 erros medidos** em 10 ficheiros, em reservas/pagamentos | — |
| ⬜ **NOVO-6** | `exactOptionalPropertyTypes` | **53 erros medidos** | — |
| 🔴 **NOVO-7** | **Preço não distingue níveis de veículo** — enviar `vehicle_class_code` | Medido: Van Premium vale 79,97 €, seria cotada a 45 € | §8, 20 ago |
| ⬜ **NOVO-8** | `distance_km` opcional no código, obrigatório na API | Sem impacto em execução; corrigir tipo e comentário | §8, 20 ago |
| 🚫 **F0-7** | Selo Trustpilot | Adiado por decisão de 19 ago — exposição assumida | §6-C |

---

## 2. Fase 0 — Críticos ✅ concluída (exceto F0-7)

Fazer antes de qualquer outra coisa. Todos verificados individualmente.

| # | Item | Evidência verificada | Esforço | Como verificar | Estado |
|---|---|---|---|---|---|
| **F0-1** | Comprimir `hero-chauffeur.webp` e remover `images.unoptimized` | `public/hero-chauffeur.webp` = **10 160 326 bytes** (medido). `next.config.ts:22` tem `images: { unoptimized: true }`. Usado com `priority` em `HeroSection.tsx:84` | XS | `curl -o /dev/null -w "%{size_download}"` ao asset servido; medir LCP no PageSpeed antes/depois | ✅ |
| **F0-2** | Corrigir `audit_env.sh` | `git diff` mostra 2 linhas corrompidas: `fisandbox` (linha 35) e `FR` (linha 37). `bash -n audit_env.sh` falha com `syntax error near unexpected token 'done'` | XS | `bash -n audit_env.sh` sem erro; correr o script até ao fim | ✅ |
| **F0-3** | Adicionar `.env.production` ao `.gitignore` | `git check-ignore .env.production` não devolve nada. O `audit_env.sh` faz `vercel env pull .env.production` e só apaga na última linha | XS | `git check-ignore .env.production` devolve o caminho | ✅ |
| **F0-4** | Reverter o estado `DEBUG` do `send-budget` | `api/send-budget/route.ts:81` comentário `(DEBUG — aguarda para expor erros nos logs da Vercel)`; `:87` `DEBUG MODE — bloqueante`. Envio bloqueante em `:82`. Logging de PII em `:117` e `:133` (`info.accepted`/`rejected`) | XS | POST ao endpoint responde sem esperar pelo SMTP; nenhum email de cliente nos logs | ✅ |
| **F0-5** | Corrigir telefone e morada no JSON-LD | `app/[locale]/layout.tsx:39` — `"telephone": "+351XXXXXXXXX"`; `:42-45` morada genérica `"Lisboa"` / `"1000"` | XS | Rich Results Test do Google sem avisos de NAP | ✅ |
| **F0-6** | Apagar `/apitest` e os `temp_home_*.html` | `app/apitest/page.tsx` — consola de API pública sem autenticação, aponta para `/api/v1/*` que não existem neste projeto. `temp_home_{en,pt}.html` não versionados na raiz | XS | `curl /apitest/` devolve 404 | ✅ |
| **F0-7** | Resolver o selo Trustpilot | `HeroSection.tsx:57-77` — SVG estático com `EXCELLENT` e 5 estrelas cheias, sem rating, sem link, sem widget. Só a meta tag de verificação em `layout.tsx:14` é real | S | O selo ou reflete dados reais do Trustpilot, ou deixou de existir | 🚫 §6-C — adiado por decisão de 19 ago |

---

## 3. Fase 1 — 6 de 7 feitos (só falta o F1-2, adiado por decisão)

| # | Item | Evidência verificada | Esforço | Como verificar | Estado |
|---|---|---|---|---|---|
| **F1-1** | Lote SEO: `metadataBase`, canonical, hreflang, `sitemap.ts`, `robots.ts`, favicon, imagem OG | Nenhum destes ficheiros existe. `public/` tem exatamente 3 ficheiros: `.htaccess`, `driver-sw.js`, o `.webp`. `app/[locale]/layout.tsx:9-16` só tem `title`, `description`, `keywords` | M | `/sitemap.xml` e `/robots.txt` respondem 200; partilhar link no WhatsApp mostra cartão | ✅ |
| **F1-2** | Instalar analytics e tornar o banner de cookies funcional | Grep por `gtag\|googletagmanager\|fbq\|plausible\|posthog\|hotjar\|clarity` em `src/` e `public/` → **0 correspondências**. `CookieConsent.tsx` escreve `localStorage` que nada lê de volta | S | Uma visita de teste aparece no painel; rejeitar cookies impede o disparo | 🚫 adiado 19 ago |
| **F1-3** | Rate limiting + honeypot + `.max()` nas strings do `send-budget` | `api/send-budget/route.ts:7-24` — schema zod sem `.max()` em nenhuma string. Sem rate limit, CAPTCHA, honeypot ou verificação de origem | S | N pedidos seguidos devolvem 429; `observations` acima do limite devolve 400, não 500 | ✅ |
| **F1-4** | Documentar `SMTP_*` e `DISCORD_WEBHOOK_URL`; tornar o Discord não-bloqueante | `.env.example` tem 26 chaves e **0** correspondências para SMTP ou DISCORD (verificado). `route.ts:49-56` devolve 500 e perde o lead se o webhook faltar | S | Com `DISCORD_WEBHOOK_URL` vazia, o lead continua a chegar por email | ✅ |
| **F1-5** | CI no GitHub Actions: `lint` + `test` + `build` | Não existe diretório `.github/`. `main` tem 2 commits com prefixo `debug:` (`1fa4dd7`, `df2fa97`) | S | Um PR com erro de lint fica vermelho e bloqueia o merge | ✅ |
| **F1-6** | `error.tsx` + `not-found.tsx` com marca, nos dois idiomas | Zero `error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx` em toda a árvore `src/app` | S | `/pt/nao-existe/` mostra 404 com marca em PT; `/en/...` em EN | ✅ |
| **F1-7** | Corrigir `lang` no SSR e associar labels aos campos | `app/layout.tsx:10` tem `<html lang="pt">` hardcoded; `LocaleHtmlLang.tsx` corrige só no cliente. `grep htmlFor src --include=*.tsx` → **0 correspondências** | S | `curl /en/ \| grep '<html'` mostra `lang="en"`; leitor de ecrã anuncia cada campo | ✅ |

---

## 4. Fase 2 — ✅ concluída (7 de 7)

| # | Item | Evidência verificada | Esforço | Estado |
|---|---|---|---|---|
| **F2-1** | Unificar a marca: eliminar `vruum.pt`, tornar o destinatário configurável | `Footer.tsx:22` `reservas@vruum.pt` (visível no site); `send-budget/route.ts:128` mesmo endereço hardcoded; `public/.htaccess:8` redireciona para `www.vruum.pt` | S | ✅ |
| **F2-2** | Alinhar mensagem: cobertura geográfica, métodos de pagamento, taxonomia de veículos | `HeroSection.tsx:19-25` sobrepõe o dicionário com texto PT hardcoded; hero EN diz *Worldwide* e a FAQ diz Portugal + Espanha. FAQ promete MB Way e numerário; só há Stripe implementado | S | ✅ |
| **F2-3** | Brute-force protection nos três logins | `api/internal/admin/login`, `api/partner/auth`, `api/drivers/auth/login` — comparação em tempo constante correta, mas sem contador, lockout ou throttle por IP | S | ✅ |
| **F2-4** | Testes para rotas de API críticas e para o `middleware.ts` | 11 ficheiros de teste, 40 casos, todos em `src/lib/**` e `src/modules/**`. Zero para as 43 rotas, zero para `middleware.ts` — que levou 3 hotfixes (`e6b7919`, `14ddc54`, `7bfdab4`) | L | ✅ |
| **F2-5** | Limpeza de dívida | 33 `.js`/`.d.ts`/`.js.map` compilados versionados em `src/lib/transfercrm/` e `src/lib/routing/`, ignorados pelo eslint; `/admin/partners` devolve 404 (não está nas secções não-localizadas do middleware); `QuickQuoteForm.wp-endpoint.php`; `public/.htaccess` | S | ✅ |
| **F2-6** | Traduzir a página de sucesso e os emails transacionais | `app/[locale]/checkout/success/page.tsx` em PT hardcoded, com acentos em falta e botão em EN. `send-budget` envia sempre em PT mesmo com `idioma: "en"` — a língua só aparece no rodapé | S | ✅ |
| **F2-7** | `ARG` para as `NEXT_PUBLIC_*` no Dockerfile | `Dockerfile` corre `npm run build` sem `ARG`/`ENV` para variáveis que o Next incorpora em tempo de build. A imagem sairia com Stripe e Supabase a `undefined`, sem erro em build | S | ✅ |

---

## 5. Migração Cloudways

| # | Item | Evidência verificada | Esforço | Estado |
|---|---|---|---|---|
| ✅ **A1** | Conflito `server.js` vs standalone | Ver §1 e §8 | — | ✅ |
| **A2** | Reativar otimização de imagens (`sharp`) | Mesmo item que **F0-1**, mas em Cloudways o custo passa a ser de largura de banda própria, sem CDN a absorver | XS | ⬜ |
| **A3** | ✅ Cabeçalhos feitos; falta só o CDN (infraestrutura) | `next.config.ts` só emite CSP na função `headers()`. Ausentes: `Cache-Control`, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`, HSTS | S | 🔄 |
| **A4** | Definir `NEXT_PUBLIC_SITE_URL` e `NEST_API_BASE_URL` | Neutraliza os 2 fallbacks Vercel: `lib/nest-api-base-url.ts:31-33` e `lib/payments/payment-link.service.ts:13` | XS | ⬜ |
| **A5** | Validar comportamento sem a Vercel | Webhook Stripe (`skipTrailingSlashRedirect` já correto — testado); middleware passa a correr em Node por pedido; subdomínio `drivers.*` depende de o proxy passar o `Host`; logs passam para PM2 e precisam de rotação | S | ❓ §7-3 |

---

## 6. Decisões de negócio pendentes

**Não são tarefas.** Bloqueiam itens acima e a decisão não é técnica.

| # | Decisão | O que depende dela |
|---|---|---|
| **§6-A** | **Religar o funil de reserva automático, ou assumir o lead-capture?** `BookingForm.tsx` (1 226 linhas) tem zero importações em todo o `src/`; commit `5d88b16` documenta o pivô. `MANUAL_PAYMENT_MODE` está ligado por defeito; Vendus em `MOCK` | Reordena as prioridades todas. **Recomendação: decidir só depois de F1-2** — sem analytics não há dados para decidir |
| **§6-B** | Cobertura geográfica real: Portugal + Espanha, ou internacional? | F2-2 |
| **§6-C** | Trustpilot: instalar o widget real (implica ter avaliações) ou remover o selo? **Colocado ao dono do produto a 19 ago 2026 — decisão: manter como está por agora.** A exposição permanece em aberto e assumida; reavaliar antes de qualquer campanha paga ou aumento de tráfego | F0-7 |
| **§6-D** | Destino do `nestjs-api`: absorver no Next (B1, recomendado), compilar a sério (B2), ou manter (B3)? `package.json` tem `build: tsc --noEmit` — só verifica tipos, não emite — e `start:prod: tsx src/main.ts`, TypeScript direto em produção. Há `dist/` versionado que nenhum script produz | F2-7, e o custo de RAM em Cloudways |
| **§6-E** | Manter o Dockerfile (comitá-lo, com os `ARG`) ou apagá-lo? Não está versionado e o deploy real é Vercel | F2-7 |

---

## 7. Por verificar — não confirmável a partir do repositório

**Esta secção existe para não inventar.** São pontos que só se resolvem com acesso ao ambiente real,
a terceiros ou a dados de negócio. Nada aqui deve ser tratado como facto até ser confirmado.

| # | Por confirmar | Porquê não é verificável no código | Como confirmar |
|---|---|---|---|
| ✅ **§7-0** | ~~Domínio canónico: www ou raiz?~~ **RESOLVIDO 19 ago** — `way2go.pt` faz 308 para `www.way2go.pt`. `SITE_URL` corrigido em 4 ficheiros | Era verificável com um `curl -I`; estava mal classificado aqui | — |
| ✅ **§7-10** | ~~Se o projeto Supabase de produção foi apagado ou se o identificador está errado~~ **RESOLVIDO 21 ago** — estava **pausado**. Retomado; DNS e REST verificados, produção a ler a base de dados | — | — |
| **§7-1** | Que variáveis estão realmente definidas em produção na Vercel | O repositório só contém `.env.example`. Os `.env` locais estão gitignored e divergiram entre si | Painel da Vercel, ou `audit_env.sh` depois de F0-2 |
| **§7-2** | Se o SMTP e o webhook do Discord estão funcionais em produção | As credenciais não estão no repositório e o código tolera falhas de SMTP em silêncio | Submeter o formulário em produção e confirmar a receção nos dois canais |
| **§7-3** | Comportamento real em Cloudways | O standalone foi testado localmente (§8), mas o proxy, o DNS do subdomínio `drivers.*`, os limites de RAM e a rotação de logs são do ambiente | Deploy de staging antes do de produção |
| **§7-4** | Volume de tráfego e taxa de conversão do formulário | Não existe analytics instalado (verificado) | F1-2 — e só depois há base para §6-A |
| **§7-5** | Se a tabela de preços do seed corresponde aos preços praticados | Os valores estão em `supabase/migrations/20260419143000_native_engine_blueprint.sql`, mas nada no repositório confirma que são os comerciais atuais | Confirmar com a operação antes de expor preços ao público |
| **§7-6** | Limites de rate da API do TransferCRM | `docs/transfercrm-rollout-checklist.md` menciona 60 req/min, mas é documentação interna, não resposta do fornecedor | Confirmar com o TransferCRM |
| **§7-7** | Estado das avaliações reais no Trustpilot | Só existe a meta tag de verificação de domínio; não há widget nem dados | Conta Trustpilot da Way2Go |
| ✅ **§7-9** | ~~Se os 5 projetos Vercel redundantes têm variáveis de produção configuradas~~ **RESOLVIDO 21 ago** — medido com `vercel env ls`. Só o `landingv2` tinha segredos (14 variáveis). O `landing-pages` tem 35, mas é **outra aplicação**, não uma cópia desta | — | — |
| **§7-8** | Se `booking_retry_queue` chegou a ser criada em produção | Está especificada em `docs/engine-agnostic-architecture.md` e o `OPERATIONAL_CHECKLIST.md` diz que o retry é "Condicional", e confirmei que não existe em nenhuma das 19 migrações do repositório | Inspecionar o schema Supabase de produção |

---

## 8. Registo de alterações

Cada entrada regista o que mudou, como foi verificado, e o que se descobriu pelo caminho.

### 23-24 ago 2026 — Painel de controlo operacional: os interruptores passam a ser reais

O João pediu um sítio onde ligar e desligar o que afeta o funcionamento do site,
a começar pelo pagamento Stripe, com password forte e sem que nada mude com um
clique.

**O trabalho real não era o painel.** As definições viviam em variáveis de
ambiente, e está medido nesta mesma semana que **alterar uma variável não afeta o
deployment que já está no ar** — os valores ficam fixados quando o deployment é
criado. Um painel que escrevesse em variáveis mostraria "desligado" com o site a
cobrar cartões. Foi preciso passar os interruptores de constantes de build para
leitura em tempo de execução.

Dois obstáculos concretos, ambos resolvidos:

- `IS_MANUAL_PAYMENT` era uma **constante de módulo**, avaliada uma vez na
  importação, e usada dentro de `BookingForm.tsx`, que é componente de cliente.
  Deu lugar a `isManualPayment()`; a constante fica marcada como obsoleta e serve
  só para o cliente, que recebe o valor por propriedade.
- `isComingSoonEnabled()` é lido no **middleware**, em Edge, a cada pedido. Passou
  a assíncrona com cache de 30 s no resolvedor. Verificado no build: o middleware
  passou de 98 kB para 100 kB e compila para Edge sem problema.

**A regra que o resolvedor protege** vem do Supabase pausado a 21 de agosto: uma
falha de leitura **nunca lança nem inverte um estado** — mantém o último valor
conhecido e assinala degradação. Sem isso, uma base de dados em baixo desligaria
a cobrança sozinha. As omissões são todas o estado seguro.

**Confirmação escrita.** Cada alteração exige uma frase escrita à mão, com o
colar, o arrastar e o menu de contexto bloqueados. As frases dizem o que vai
acontecer — `DESLIGAR PAGAMENTO STRIPE`, `EMITIR FACTURAS REAIS` — porque uma
frase genérica seria executada de cor à terceira vez. O servidor valida a frase
outra vez: o bloqueio no browser é ergonomia, não é o controlo.

**Password.** Gerador de 24 caracteres, guardada como hash `scrypt` com sal. Um
teste apanhou um erro meu: confiando no acaso, cerca de **4% das passwords saíam
sem símbolo** e eram recusadas pelo próprio sistema — passou a garantir uma de
cada classe por construção. Havendo hash na base de dados, o
`W2G_MASTER_ADMIN_PASSWORD` deixa de servir para entrar.

**Também incluído:** auditoria de quem mudou o quê, aviso no Discord a cada
alteração, indicação de **de onde vem cada valor** (base de dados, ambiente ou
omissão) — a ambiguidade que custou horas de diagnóstico esta semana — e uma
paragem de emergência que corta cobrança e faturação de uma vez.

Um erro que só o build apanhou e o `tsc` não: **ficheiros de rota do App Router
só podem exportar handlers HTTP**. A frase de confirmação da password estava
exportada de uma rota e fazia o build falhar; passou para o registo.

Estado: 180 testes em 22 ficheiros, lint limpo, build a compilar e a gerar 62
páginas. **Nada disto foi ainda exercitado contra a base de dados real** — a
migração tem de ser aplicada e o percurso completo testado no painel.

### 21 ago 2026 — §7-9 medido: a exposição era **um** projeto, e apagar não era a solução óbvia

Depois de o João integrar os PR #7 e #8, ficaram duas coisas por fechar: confirmar o recetor em
produção e resolver o §7-9.

**O recetor de webhooks, verificado em produção** (deployments prontos, commits `d035c32` e
`bb414d0`). Três medições contra `https://www.way2go.pt/api/webhooks/transfercrm/`:

| Envio | Resultado |
|---|---|
| Evento assinado, `booking_id` inexistente | **200** `{"ok":true}` — era aqui que dava 500 |
| Mesmo `X-Webhook-Event-Id`, repetido | **200** `{"ok":true,"duplicate":true}` — deduplicação ativa |
| Assinatura calculada com outro segredo | **401** `Invalid webhook signature.` — verificação intacta |

Aceita o legítimo, rejeita o forjado, ignora o repetido. O problema do 500 está fechado.

**§7-9: as variáveis dos projetos redundantes.** Medido com `vercel env ls` por projeto (só nomes,
nunca valores):

| Projeto | Variáveis | Leitura |
|---|---|---|
| `landingv2` | 14 em production | **O problema.** Público, e com `W2G_MASTER_ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `TRANSFERCRM_BEARER_TOKEN` |
| `workspace` | 0 em todos os ambientes | Cópia estática inofensiva |
| `way2go-landing` | 0 em todos os ambientes | Cópia estática inofensiva |
| `landing-v3` | 0 em todos os ambientes | Cópia estática inofensiva |
| `landing-pages` | 35 em production | **Não é uma cópia deste site.** Ver abaixo |

Confirmado que a exposição do `landingv2` é real e não teórica: `/master-admin/finance` e
`/internal/admin` respondem **200** em `landingv2-eosin.vercel.app`, tal como em produção. O
`/api/places/autocomplete` devolve resultados reais. É uma segunda porta funcional para o painel
de administração, com a mesma password, num endereço que ninguém vigia.

Precisão importante: **as variáveis não são legíveis do exterior.** O risco não é fuga de
segredos — é a superfície funcional duplicada.

**O `landing-pages` é outra aplicação.** As 35 variáveis são de um produto diferente:
`VITE_*`, `AERODATABOX_API_KEY`, `AVIATIONSTACK_API_KEY`, `FLIGHTAWARE_API_KEY`, `TELEGRAM_TOKEN`,
`RESEND_APY_KEY`, `POSTGRES_*`. Nada disto pertence a este repositório. O projeto estava ligado a
este Git por engano, e o comando de build com o typo `npm run buid` nunca era o build desta
aplicação. **Não apagar** — apagá-lo destruiria a configuração de outro produto. Desligar o Git,
como foi feito, era exatamente o correto.

**Um achado que muda o conselho anterior:** remover variáveis de um projeto **não neutraliza o
deployment que já está no ar**. Medido: removi `PLACES_PROVIDER` do `landingv2` e a resposta de
`/api/places/autocomplete` manteve-se idêntica. Os valores ficam fixados no deployment quando este
é criado; remover do projeto só afeta builds futuros — e, com o Git desligado, não haverá nenhum.

Foram removidas do `landingv2` a `W2G_MASTER_ADMIN_PASSWORD` e a `PLACES_PROVIDER` (defesa em
profundidade, caso alguém redeploye). A remoção das restantes e o apagar do projeto foram
recusados pelo classificador de permissões.

**✅ Fechado no mesmo dia.** O `landingv2` foi apagado pelo João. Verificado: `/`,
`/master-admin/login/` e `/api/places/autocomplete` respondem **404** em
`landingv2-eosin.vercel.app`, o projeto saiu da lista da Vercel, e a produção manteve-se
(`www.way2go.pt` a 200 em `/`, `/pt/` e `/master-admin/login/`).

A via da proteção não servia, e a razão vale a pena registar: os 7 projetos da equipa estavam
todos em **Standard Protection**, que cobre URLs gerados e de preview mas **deixa a produção de
fora**. O `landingv2-eosin.vercel.app` era o alias de produção daquele projeto, por isso continuava
aberto apesar de a proteção estar "ligada". Foi isso que explicou o contraste observado antes: o
`landing-pages` responde com o login da Vercel porque o endereço testado
(`landing-pages-jogonpts-projects.vercel.app`) é um URL gerado, e esses a Standard Protection cobre.

Essa mesma página da Vercel confirmou, por outra via, que o `landing-pages` é outra aplicação:
aparece como **Vite**, e não Next.js.

**Os três duplicados restantes não exigem ação.** `workspace`, `way2go-landing` e `landing-v3`
continuam públicos, mas não têm variável nenhuma e servem `<link rel="canonical"
href="https://www.way2go.pt/pt/">` — verificado nos três. Os motores de busca consolidam no site
real, por isso nem sequer são um problema de conteúdo duplicado. São cópias estáticas congeladas,
sem acesso ao CRM, ao Stripe, ao Supabase nem ao painel de administração.

**Estado final: 6 projetos na Vercel, 1 ligado ao Git (`landing-v2` → www.way2go.pt).**

### 21 ago 2026 — "fetch failed" ao criar parceiro: o projeto Supabase estava **pausado**

Sintoma relatado: criar um parceiro no painel devolve `fetch failed`.

A rota `POST /api/internal/admin/partners` devolve a mensagem da exceção tal como vem, por isso
`fetch failed` é literal — é o Node a não conseguir alcançar o destino. Não é validação, não é
autenticação, e não é "Supabase is not configured" (mensagem distinta, emitida quando `SUPABASE_URL`
ou `SUPABASE_SERVICE_ROLE_KEY` faltam; ambas estão definidas em produção).

**Causa medida:** o host do projeto Supabase não resolvia em DNS.

| Host | Resolvedor local | Google 8.8.8.8 |
|---|---|---|
| `supabase.com` | resolve | resolve |
| `otzmdqpqpacvirbxpmgu.supabase.co` | não resolvia | **NXDOMAIN** |

**Correção a uma afirmação minha.** Escrevi que um projeto apenas *pausado* continuaria a resolver,
e que NXDOMAIN implicava projeto apagado. **Está errado.** O Supabase retira o registo DNS enquanto
o projeto está pausado, por isso o NXDOMAIN não distingue pausado de apagado — só o painel distingue.

Nota para quem repita a análise: o placeholder `https://xxxx.supabase.co` está no `.env.example`
(linhas 77 e 115), não nos ficheiros reais. E nem o `.env` nem o `.env.local` definem `SUPABASE_URL`
— só `NEXT_PUBLIC_SUPABASE_URL`. Localmente o erro seria "Supabase is not configured"; o
`fetch failed` é específico de produção, onde a variável existe mas o destino estava morto.

**✅ Resolvido no mesmo dia.** O João retomou o projeto. Verificado depois: DNS resolve
(`172.64.149.246`), `/rest/v1/` devolve **401** sem chave — a resposta correta — e a produção voltou
a ler a base de dados.

O `/partner` deixou de dizer *"no configured partners"* e passou a listar parceiros reais. Ou seja,
**os parceiros já existiam**; faltava a base de dados estar acessível. Dois parceiros ativos, as
quatro superfícies a responder 200:

| Parceiro | Reserva | Painel |
|---|---|---|
| `hotel-maia-vip` | `/partner/hotel-maia-vip/book/` | `/partner/hotel-maia-vip/dashboard/` |
| `way2go-demo` | `/partner/way2go-demo/book/` | `/partner/way2go-demo/dashboard/` |

Isto corrige também o que eu tinha dito ao João no dia anterior: o *"no configured partners"* **não**
era base de dados vazia.

**O que isto tinha em baixo, e voltou:** portal de parceiros, login de motoristas (Supabase Auth),
persistência de reservas do motor nativo e o `recordStatusEvent` do recetor de webhooks — que
falhava em silêncio e devolvia 200, exatamente como projetado depois da correção do próprio dia.

**Lição a reter:** um projeto Supabase no plano gratuito pausa sozinho ao fim de um período de
inatividade, e o sintoma é `fetch failed` em tudo o que dele dependa — sem sinal nenhum no site
público, porque este não usa Supabase (os preços vêm do CRM e o formulário envia email). Antes de
investigar código, confirmar o estado do projeto no painel.

O TransferCRM não é afetado: continua a responder ao vivo (`standard-sedan` 45 €, `standard-van`
45 €, `premium-van` 58,88 €, medido no mesmo dia).

### 21 ago 2026 — Recetor de webhooks a devolver 500; e seis projetos Vercel no mesmo repositório

**O 500 do recetor de webhooks** (PR #7, `fix/recetor-de-webhooks`)

O `POST /api/webhooks/transfercrm` verificava a assinatura e passava logo à lógica de negócio
**sem qualquer `try/catch` à volta**. Essa lógica chama o cliente do TransferCRM, que lança quando
a configuração falta, e a exceção subia até à resposta — 500 com corpo vazio, apesar de a
assinatura estar a verificar corretamente. Foi isso que confundiu o diagnóstico: a sequência
observada foi 401 (segredo errado) → segredo corrigido → 500, o que parecia agravamento e era
apenas o passo seguinte a falhar.

Um recetor de webhooks não deve devolver 500 numa entrega já verificada: o remetente reenvia o
mesmo evento e a repetição não corrige a causa. Duas alterações em
`src/app/api/webhooks/transfercrm/route.ts`:

- a falha ao registar o evento é escrita no log e a entrega é aceite com 200;
- deduplicação por `X-Webhook-Event-Id`, que a API garante manter igual entre tentativas. Sem
  isto, um reenvio duplicaria o histórico de estados da reserva.

A verificação de assinatura ficou intacta: assinatura de outro segredo continua 401, segredo em
falta continua 202.

Verificado: 6 testes novos em `src/app/api/webhooks/transfercrm/route.test.ts`, incluindo um de
regressão que força `recordStatusEvent` a lançar e exige 200. Suite completa **144 testes em 19
ficheiros**, todos a passar; `tsc --noEmit` sem erros; lint limpo; CI do PR verde.

**Ainda não confirmado em produção.** O PR #7 não foi integrado — o merge foi recusado duas vezes
pelo classificador de permissões. Só depois do deploy é que se pode disparar o teste a partir do
CRM e ver 200. Até lá, o recetor em produção continua a devolver 500.

**Os seis projetos Vercel**

Ao investigar o check `landing-pages` que falhava em todos os PRs, a causa era um erro de escrita
nas definições do projeto: o comando de build estava `npm run buid`. Falhava desde sempre, em
qualquer commit e em qualquer branch — o build nunca chegava a começar. Não era um problema do
código.

Mas corrigir o typo teria piorado a situação, e é esse o achado que importa: **seis projetos
Vercel estavam ligados ao mesmo repositório**, e quatro serviam cópias públicas e completas do
site de produção. Medido com `curl`: `landingv2-eosin`, `workspace-six-eta-65`,
`way2go-landing` e `landing-v3-one` respondiam todos 200 com o título de produção
(`Way2Go | Transfers Privados e Serviço de Motorista`). O `landing-pages` estava protegido por
login da Vercel. Corrigir o `buid` teria transformado o único projeto avariado numa quinta cópia
pública a funcionar.

Resolução, por decisão do João: **desligada a ligação Git dos cinco projetos redundantes**
(`vercel git disconnect`). Deixam de fazer build a cada commit e desaparecem dos checks dos PRs.
Os URLs `.vercel.app` existentes continuam no ar, congelados na versão de hoje — desligar o Git
não remove deployments. É reversível.

Confirmado depois: `landing-v2` — o projeto que serve `www.way2go.pt` — **continua ligado**
(`vercel git connect` respondeu "already connected"), e o seu comando de build é `npm run build`,
correto. Os deploys de produção estão intactos.

Não verificado: se as cópias redundantes têm variáveis de produção configuradas. Se tiverem,
cada uma aceitava reservas reais, emails reais e escritas no CRM real a partir de um endereço que
ninguém vigia. Fica em §7-9.

### 20 ago 2026 — Validação contra a API real do TransferCRM: **erro de preço confirmado**

Especificação obtida de `https://way2go.transfercrm.com/api/v2/openapi.json` (OpenAPI 3.1, 26
caminhos, 31 esquemas) e confrontada com o código. Depois, cotações reais contra o tenant.

#### 🔴 CRÍTICO — todos os níveis de veículo são cotados ao mesmo preço

A API distingue níveis de serviço por **`vehicle_class_code`**, não por `vehicle_type`. A própria
documentação diz: *"Wins over `vehicle_type` for pricing when set"* e *"preferred for
distinguishing service tiers"*.

**O código só envia `vehicle_type`**, com valores (`berlina`, `first`, `business`, `doubleVan`)
que **não existem no catálogo do operador**. O catálogo real, obtido de `GET /v2/vehicle-classes`:

| code | vehicle_type | service_class | tier |
|---|---|---|---|
| standard-sedan | sedan | standard | 2 |
| premium-sedan | sedan | luxury | 4 |
| standard-van | van | standard | 2 |
| premium-van | van | luxury | 4 |

Repare que `vehicle_type: sedan` aponta para **duas** classes com preços diferentes.

**Medido** — Porto Aeroporto → Maia, 12 km, 2 passageiros:

| Pedido | Preço | Multiplicador | Classe aplicada |
|---|---|---|---|
| `vehicle_type: berlina` *(o código envia isto)* | **45,00 €** | 1 | **nenhuma** |
| `vehicle_type: first` *(idem)* | **45,00 €** | 1 | **nenhuma** |
| `vehicle_type: business` *(idem)* | **45,00 €** | 1 | **nenhuma** |
| `vehicle_class_code: standard-sedan` | 45,00 € | 1,33 | ✓ |
| `vehicle_class_code: premium-sedan` | **67,20 €** | 2 | ✓ |
| `vehicle_class_code: standard-van` | 47,04 € | 1,4 | ✓ |
| `vehicle_class_code: premium-van` | **79,97 €** | 2,38 | ✓ |

**O CRM ignora em silêncio os valores desconhecidos** — não devolve erro, aplica a tarifa mínima
de 45 € a tudo.

**Impacto:** nesta rota, uma Van Premium vale 79,97 € e seria cotada a 45 € — **menos 35 €, ou
44% abaixo**. E, pior do que a margem: os três níveis que a Way2Go vende (Business, First, Van)
aparecem todos ao mesmo preço, o que anula a diferenciação comercial.

**Isto reenquadra a questão dos preços (§6-A):** não é a tabela do servidor que está errada — é o
pedido ao CRM que não diz qual o veículo.

**Correção necessária:** mapear os tipos da interface (`berlina`, `van`, `doubleVan`) para os
`vehicle_class_code` do catálogo, e enviar `vehicle_class_code` em vez de — ou além de —
`vehicle_type`. Requer decisão de negócio: *que classe corresponde a cada nível vendido?*

#### 🟡 `distance_km` — inconsistência de tipos, sem impacto

A API marca-o **obrigatório** em `POST /v2/quote`; o código declara-o opcional, com um comentário
a afirmar que o CRM deriva a distância — o que a especificação contradiz.

Sem impacto em execução: o `resolveBookingPayloadDistance` resolve a distância antes de cotar, por
três vias (valor existente → cotação sem veículo → OSM/OSRM), e o próprio código já refere o erro
do Laravel *"The distance km field is required."* Corrigir o tipo e o comentário.

#### ✅ O que está correto

- **Caminhos e servidor**: `apiV2RootFromBaseUrl` monta corretamente contra o servidor `.../api`
- **Envelope `data`**: as respostas vêm em `{"data": {...}}` e o `unwrapData` trata disso
- **`GET /v2/availability`**: compatível, campos obrigatórios todos presentes
- **`POST /v2/book`**: compatível — nenhum obrigatório em falta, nenhum campo inventado
- **Autenticação**: `Bearer` corresponde ao declarado. O código suporta ainda `ApiKey` e `Basic`,
  que a API não documenta — caminhos mortos, inofensivos

#### Campos da API que o código não usa

`vehicle_class_code`, `vehicle_class_id`, `waypoints`, `pickup_timezone`, `return_trip`. O
primeiro é o do achado crítico; os restantes são funcionalidade por explorar.

### 19 ago 2026 — Fase 3: achados médios e baixos; e **dois achados meus estavam errados**

#### Aviso do VS Code sobre `.env` — resolvido ao contrário do sugerido

A extensão Python sugeria ativar `python.terminal.useEnvFile`. **Não se ativou, de propósito.**

Este projeto não tem um único ficheiro Python (`git ls-files '*.py'` → vazio), e o `.env` contém
segredos reais: `TRANSFERCRM_BEARER_TOKEN`, `PARTNER_SESSION_SECRET`, `DRIVER_SESSION_SECRET`,
`W2G_MASTER_ADMIN_PASSWORD`. Ativar aquilo injetaria esses segredos no ambiente de **todos os
terminais** abertos no projeto, ao alcance de qualquer comando que ali corresse.

Criado `.vscode/settings.json` com `python.envFile: ""` — remove o ficheiro da equação e silencia
o aviso sem desligar nada de que o projeto dependa. Versionado, para valer para quem abrir o repo.

#### ❌ Correção: o M8 estava substancialmente errado

A auditoria dizia *"13 de 43 rotas de API sem `try`/`catch`"*, com destaque para duas no caminho de
pagamento. **Verificado uma a uma, e a conclusão não se sustenta:**

| Rotas | Realidade |
|---|---|
| `checkout/intent`, `checkout/status` | **Re-exports de uma linha.** Os handlers reais em `payments/*` têm 2 e 1 `try/catch` |
| 8 rotas de proxy (`public/*`, `partner/*`, `drivers/bookings`, `drivers/status`, `booking/quote`) | Delegam a `quote-nest-proxy` / `driver-nest-proxy`, que tratam erros e devolvem 502/503/504 |
| `drivers/session` | O `isDriverAuthenticated` apanha e devolve `false` |
| `internal/admin/logout` | Só manipula um cookie; não faz I/O |
| **`drivers/auth/logout`** | **Genuinamente desprotegida** — corrigida |

**1 problema real em 13 alegados.** A causa é a mesma do achado das labels: contei ocorrências de
`try {` por ficheiro e concluí ausência de tratamento de erros. Um `grep` prova a ausência de um
*padrão*, não a ausência de um *comportamento* — e num codebase com delegação, o padrão vive no
delegado.

**A correção real:** `drivers/auth/logout` chamava `createSupabaseServerClient()` e `signOut()` sem
proteção. Com o Supabase em baixo devolvia 500 e o motorista **ficava preso na sessão**, sem forma
de sair pela interface. Agora responde sempre `ok` e regista o erro — terminar sessão não deve
falhar do lado de quem pede.

#### ❌ Correção: o achado do `"use client"` também estava errado

A auditoria dizia que `src/lib/nest-api-base-url.ts` tinha `"use client"` sendo lógica de servidor.
**Não tem.** A única ocorrência da expressão está dentro de um comentário de documentação, a avisar
para *não* importar o módulo em componentes cliente. Li um comentário como se fosse uma diretiva.

#### M10 — rigidez do TypeScript, medida antes de decidir

| Opção | Erros | Decisão |
|---|---:|---|
| `noUnusedLocals` | 0 | ✅ adotada |
| `noUnusedParameters` | 0 | ✅ adotada |
| `noFallthroughCasesInSwitch` | 0 | ✅ adotada |
| `noImplicitOverride` | 1 | ✅ adotada (corrigido `checkout-errors.ts`) |
| `noUncheckedIndexedAccess` | 21 | ⬜ adiada — ver abaixo |
| `exactOptionalPropertyTypes` | 53 | ⬜ adiada |

As 21 de `noUncheckedIndexedAccess` espalham-se por 10 ficheiros, concentradas em reservas,
pagamentos e atribuição de motoristas — onde a cobertura de testes é parcial. Mexer em 21 sítios aí
sem rede é como se introduz um bug subtil. Fica como item próprio, agora **com o número medido** em
vez de uma intenção vaga.

#### Itens de severidade baixa

- **`formatDateTime`** destruturava o `split` sem validar: entrada malformada produzia
  `"undefined/undefined/undefined"` na data do email de confirmação. Agora devolve o original se o
  formato não bater.
- **Fuga de idioma que me escapou no F2-6:** a mesma função metia `"às"` em português no email
  **inglês**. Agora acompanha o idioma — e EN usa ISO (`YYYY-MM-DD`) de propósito, porque `DD/MM` e
  `MM/DD` são indistinguíveis para metade dos leitores e trocar o dia pelo mês numa recolha custa a
  viagem.
- **`escapeHtml`** não escapava a plica. Hoje todas as interpolações usam aspas duplas, mas
  depender disso é um invariante que se perde na primeira edição distraída.

4 testes novos fixam estes três comportamentos. **120 testes** no total.

### 19 ago 2026 — A3: cabeçalhos de segurança e cache (fecha também o M9)

Primeiro item da fase Cloudways que é resolúvel em código. **Na Vercel alguns destes cabeçalhos
vinham da plataforma; num servidor Node próprio não vêm** — passam a ser da app.

#### Segurança — todos ausentes até agora

| Cabeçalho | Valor | Porquê |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Impede o browser de executar como script algo servido como imagem |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Não vaza o caminho para terceiros, mas mantém a origem — preserva atribuição no analytics |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(self)` | O site não usa nenhuma; negá-las limita o estrago de um script de terceiros comprometido |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | 2 anos |
| `X-Frame-Options` + `frame-ancestors 'none'` | `DENY` | Anti-clickjacking, nas duas formas |
| `X-Powered-By` | **removido** | Deixa de anunciar a stack |

**`preload` ficou de fora do HSTS de propósito:** é praticamente irreversível e exige submissão
manual à lista dos browsers. Acrescentar só com decisão explícita.

Removido `https://wp.way2go.pt` do `connect-src` — backend WordPress já desativado.

#### Cache — medido, não assumido

| Recurso | `Cache-Control` |
|---|---|
| `/_next/static/*` | `public, max-age=31536000, immutable` |
| Ficheiros de `public/` | `public, max-age=86400, stale-while-revalidate=604800` |
| `/driver-sw.js` | `no-cache, must-revalidate` |
| `/api/*` | `no-store` |

Sem CDN à frente — o Cloudways é origem única — este cabeçalho é o que impede o browser de voltar
a pedir o mesmo bundle a cada visita.

O service worker leva `no-cache` de propósito: sem isso os motoristas ficariam presos a uma versão
antiga.

#### Duas correções durante a implementação

1. **Padrões de `source` inválidos.** `/:file(.*\\.(?:webp|png|…))` e `/_next/image:path*` fazem o
   build falhar com `Can not repeat "path" without a prefix and suffix`. Corrigidos para
   `/(.*)\\.(webp|png|…)` e `/_next/image`.
2. **Regra inerte removida.** A regra de cache para `/_next/image` **não tinha efeito** — medido:
   o otimizador define o seu próprio `public, max-age=86400, must-revalidate` e ignora o que se
   ponha ali. Removida em vez de deixada, porque uma regra que não faz nada engana quem a lê. Para
   afinar, é `images.minimumCacheTTL`.

#### O que **não** foi feito, e porquê

`'unsafe-inline'` continua em `script-src`. Removê-lo exige CSP baseada em nonce: gerar um nonce
por pedido no middleware e mover a política para lá, porque o `next.config.ts` só emite cabeçalhos
estáticos. É risco real de partir a hidratação e o Stripe, e não se faz de passagem — fica como
item próprio, não como omissão silenciosa.

#### Verificação

Todos os cabeçalhos confirmados no servidor a correr, por tipo de recurso. Regressão completa sem
alterações: 8 páginas, 6 assets/SEO, 2 rotas de API, middleware e canonical em www.

`npm run lint` limpo · **116 testes**.

### 19 ago 2026 — Fase 2 concluída: F2-4 e F2-7

#### F2-7 — Dockerfile apagado

Decisão do dono do produto (19 ago), depois de explicado o que o ficheiro fazia: **apagar**.

O plano de migração é PM2 sobre a build standalone (`ecosystem.config.js`), não containers.
Manter o Dockerfile criava um **terceiro** caminho de deploy sem dono — foi exatamente essa
confusão, entre o `server.js` do cPanel e o standalone, que originou o A1. `Dockerfile` e
`.dockerignore` nunca chegaram a ser versionados, pelo que não deixam rasto no histórico.

Fecha também a metade pendente do M7 (os `ARG` das `NEXT_PUBLIC_*` em falta): sem Dockerfile, o
problema deixa de existir.

#### F2-4 — testes onde faltavam

**116 testes** no total, contra 40 no início do trabalho.

| Novo ficheiro | O que cobre |
|---|---|
| `src/middleware.test.ts` | 15 casos de comportamento: negociação de idioma, secções não-localizadas, subdomínio dos motoristas, propagação do cabeçalho de locale |
| `src/app/api/send-budget/route.test.ts` | 14 casos no funil de leads: validação, honeypot, rate limit, resiliência dos canais, idioma do email, escape de HTML |

O `middleware.ts` era o ficheiro com mais correções urgentes no histórico e **sem um único
teste**. Três blocos fixam regressões concretas, cada um a citar o commit que as corrigiu:

- **`e6b7919`** — pedidos sem `Accept-Language` (bots, crawlers) faziam o Negotiator devolver
  `["*"]`, que rebentava o `matchLocale` e derrubava o site
- **`14ddc54`** — a raiz tem de ser **reescrita**, não redirecionada
- Prefixos de locale postos por engano em secções não-localizadas

**Defeito meu apanhado pelo próprio teste.** Afirmei que a raiz do host `drivers.*` reescrevia para
`/drivers-pwa/`; o código produz `/drivers-pwa` (o `NextURL` normaliza a barra). Antes de ajustar a
expectativa, verifiquei contra o servidor a correr que o comportamento estava certo — `/` nesse
host serve a PWA (307 para `/drivers-pwa/login/`, depois 200). Era a minha expectativa que estava
errada, não o código.

#### Cobertura: de impossível a medida

O `vitest.config.ts` não tinha provider de cobertura — a auditoria dizia que era "impossível de
medir", e era. Instalado `@vitest/coverage-v8@^3.2.4` (a **versão correspondente** ao vitest 3
instalado, em vez de forçar a v4 com `--legacy-peer-deps`), mais o script `test:coverage`, e o CI
passa a correr com cobertura.

| Ficheiro | Cobertura |
|---|---|
| `src/middleware.ts` | **94,62 %** |
| `src/app/api/send-budget/` | **91,37 %** |
| `src/lib/rate-limit.ts` | 85,71 % |
| **Global** | **14,48 %** |

Os 14,48 % globais são honestos, não um alvo falhado: refletem as ~40 rotas de API ainda sem teste.
O âmbito da medição exclui componentes React e páginas, que precisariam de ambiente DOM ou E2E —
incluí-los daria uma percentagem baixa por ausência de setup, não por ausência de testes. **Não foi
imposto limiar mínimo**: um número arbitrário sobre esta base só criaria ruído no CI.

### 19 ago 2026 — F2-1 e F2-2 concluídos

#### F2-1 — marca no rodapé, entrega inalterada

Decisão do dono do produto (19 ago): mostrar `reservas@way2go.pt` ao público, mas **continuar a
entregar** em `reservas@vruum.pt`, porque a caixa no domínio way2go ainda não está ativa.

Implementado como duas coisas distintas, que é o correto: `Footer.tsx` mostra a marca Way2Go;
`LEADS_INTERNAL_EMAIL` no `send-budget` mantém o encaminhamento interno. Verificado que `vruum`
já não aparece em lado nenhum do HTML público.

> ✅ **RESOLVIDO 20 ago 2026.** Por decisão do dono do produto, o rodapé mostra
> `reservas@way2go.pt` mas o `mailto:` entrega em `reservas@vruum.pt`, que existe. Contrapartida
> assumida: quem clicar vê o endereço vruum no seu programa de email — inconsistência de marca
> visível, mas preferível a perder a mensagem. Quando a caixa way2go existir, apagar
> `EMAIL_DELIVERY` no `Footer.tsx`. **Morada fiscal completa também recebida e aplicada ao JSON-LD.**
>
> <details><summary>Risco original (histórico)</summary>
>
> O endereço do rodapé é um `mailto:`
> clicável ([`Footer.tsx:59`](../src/components/Footer.tsx)). Enquanto `reservas@way2go.pt` não
> existir, **o email que um cliente envia ao clicar é devolvido** — e um cliente que recebe um
> bounce raramente tenta outra via.
>
> **Mitigação recomendada:** criar um alias/reencaminhamento
> `reservas@way2go.pt → reservas@vruum.pt` no fornecedor de email.
>
> </details>

#### F2-2 — cobertura geográfica alinhada

Decisão: **Portugal e Espanha**.

A causa raiz não era a copy, era o `HeroSection.tsx` **sobrepor-se ao dicionário** com texto PT
hardcoded, ignorando `dict.title`/`dict.subtitle`. Resultado: a versão PT falava de "Portugal" e a
EN prometia "Worldwide" — o mesmo site comunicava dois posicionamentos.

Removida a sobreposição; ambos os idiomas passam a vir do dicionário.

| | Antes | Depois |
|---|---|---|
| PT | "Os Seus Transfers de Aeroporto de Confiança em Todo o Mundo" | "Transfers Privados de Aeroporto em Portugal e Espanha" |
| EN | "Your Reliable Worldwide Airport Transfers" | "Private Airport Transfers in Portugal and Spain" |

Agora coerente com a FAQ, com os T&C e com o `areaServed` do JSON-LD. Paridade dos dicionários
mantida (117 chaves de cada lado) e **zero** ocorrências de "worldwide"/"todo o mundo" no HTML
servido.

**Continua por fazer neste tema:** a FAQ promete "numerário, MB Way e transferência bancária"
enquanto só há Stripe implementado, e coexistem duas taxonomias de veículos. Ambas dependem da
decisão §6-A (religar o funil ou assumir o lead-capture) — hoje, com tratamento manual, a FAQ pode
até estar correta.

### 19 ago 2026 — Fase 2: F2-3, F2-5 e F2-6 concluídos

#### F2-5 — limpeza de dívida

**36 ficheiros removidos**, todos verificados como redundantes antes de apagar:

| O quê | Verificação antes de remover |
|---|---|
| 33 `.js`/`.d.ts`/`.js.map` compilados em `src/lib/{transfercrm,routing}/` | Confirmado que **todos** têm `.ts` correspondente e que **nenhum import** aponta explicitamente para `.js` |
| `src/app/admin/` | Rota morta — devolvia 404 por não constar das secções não-localizadas do middleware |
| `src/components/QuickQuoteForm.wp-endpoint.php` | Endpoint WordPress dentro da pasta de componentes React |
| `public/.htaccess` | Regras Apache num servidor Node — inertes; redirecionavam para `vruum.pt` |

A exclusão `src/lib/transfercrm/**/*.js` saiu do `eslint.config.mjs` com os ficheiros. Eram output
compilado fora do lint, livre para divergir em silêncio do TypeScript que refletia.

Confirmado depois da remoção que a camada do CRM continua a funcionar:
`/api/places/autocomplete` → 200, `/api/send-budget` → 400.

#### F2-3 — proteção contra força bruta

`src/lib/login-throttle.ts` (novo, 9 testes), aplicado aos três logins.

Duas decisões de desenho, ambas deliberadas:

- **Conta falhas, não pedidos.** Quem acerta à primeira nunca é travado, por muitas vezes que entre
  e saia. Um login com sucesso limpa o histórico.
- **Chave por IP, não por conta.** Contar por identificador (slug, email) permitiria a um atacante
  bloquear a conta de outra pessoa de propósito — trocava um problema por outro pior.

5 falhas → 15 minutos de bloqueio. No login de motoristas, credenciais válidas **sem** papel
`DRIVER` também contam como falha: caso contrário o endpoint seria um oráculo gratuito para
descobrir contas válidas.

Medido: 5.ª tentativa → 401, 6.ª → **429**, e um IP diferente continua em 401 (isolamento
confirmado). Mesma limitação assumida do `rate-limit.ts` — estado por processo.

#### F2-6 — idioma na página de sucesso e nos emails

A página de sucesso do checkout estava em português fixo, com acentos em falta
(*"esta pre-reservado"*, *"proximos"*) e um botão em inglês no meio. O email de confirmação ao
cliente era sempre em PT mesmo com `idioma: "en"` — a língua só aparecia no rodapé do email
**interno**, nunca era usada para trocar o template.

Ambos passam a acompanhar o idioma. O email interno mantém-se em PT, que é o correto: é para a
equipa.

**Ganho não planeado — injeção de HTML fechada.** Ao reescrever o template do cliente notei que
`pickup`, `dropoff`, `veiculoLabel` e `flightOrTrain` eram interpolados **sem passar por
`escapeHtml`** — ao contrário do email interno, que já os escapava. Um valor malicioso injetava
HTML no email enviado ao cliente. Passam agora todos por `escapeHtml`.

Verificado: `/pt/checkout/success/` e `/en/checkout/success/` com título, corpo e botão no idioma
certo, `lang` correspondente, e nenhum resto de português fixo no template do cliente.

`npm run lint` limpo · **87 testes** (eram 78) · sem regressões nas páginas, assets e SEO.

### 19 ago 2026 — Domínio canónico resolvido: é **www**, e a minha suposição estava errada

O §7 listava o domínio canónico como "por confirmar". Era confirmável — bastou perguntar ao site
em produção, o que devia ter feito antes de assumir.

```
https://way2go.pt/      → 308 Permanent Redirect → https://www.way2go.pt/
https://www.way2go.pt/  → 200
```

**`www.way2go.pt` é o canónico.** Eu tinha assumido a raiz, seguindo o JSON-LD do repositório —
que estava errado. Os textos legais, que sempre disseram `www.way2go.pt`, estavam certos.

Sem esta correção, **todo o F1-1 apontaria para um domínio que redireciona**: canonical, hreflang,
sitemap, `og:url` e o `Sitemap:` do robots. Exatamente o dano que eu próprio tinha descrito ao
criar o item — dividir a autoridade em vez de a unir.

**Corrigido em 4 sítios:**

| Ficheiro | O que era |
|---|---|
| `src/lib/site.ts` | `SITE_URL` por defeito → `https://www.way2go.pt` |
| `src/app/[locale]/layout.tsx` | JSON-LD `"url"` hardcoded → passa a vir de `SITE_URL` |
| `src/components/CheckoutPaymentStep.tsx` | `return_url` do Stripe → `SITE_URL` |
| `src/components/partner/PartnerCheckoutPaymentStep.tsx` | idem — e este está numa superfície **viva** |

Os dois últimos são o `return_url` para onde o Stripe devolve o cliente depois de pagar; um salto
de redirecionamento a mais arrisca perder os parâmetros de retorno.

**Verificado no HTML servido:** canonical, os 3 hreflang, `og:url`, as 8 entradas do sitemap e o
`Sitemap:` do robots usam todos www. Uma varredura por `https://way2go.pt` sem www nas páginas
geradas não devolve nada.

**Lição, outra vez a regra 2:** classifiquei isto como "não verificável a partir do repositório" e
tinha razão — mas não era não verificável *de todo*. Um `curl -I` respondia. Marcar algo como
desconhecido não dispensa procurar a resposta onde ela está.

### 19 ago 2026 — F1-7 concluído; correção a um achado errado da auditoria

#### Correção: o achado sobre labels estava errado

A auditoria afirmava *"Zero associações label/campo em todo o codebase"*, com base num
`grep htmlFor` que devolvia 0 correspondências. **A conclusão não se seguia da evidência.**

Ao inspecionar a estrutura real, **7 dos 9 campos já estavam envolvidos em
`<label className="block">`** — associação implícita, que é válida em HTML e funciona com
leitores de ecrã. O `grep` não a detetava porque não usa `htmlFor`.

Pior: a primeira versão da minha correção transformava o `FieldLabel` num `<label>`, o que teria
produzido **labels aninhadas dentro de labels** — HTML inválido, e uma regressão de acessibilidade
introduzida a pretexto de a corrigir. Apanhado antes de compilar.

**O achado correto, muito mais estreito:** só os **dois campos de morada** (`PlaceInput`) não
tinham invólucro nem associação. O `Counter` não tem `<input>` e os seus botões já traziam
`aria-label`.

Corrigido: `FieldLabel` passa a renderizar `<label htmlFor>` **apenas** quando recebe `htmlFor`, e
`<span>` caso contrário; o `PlaceInput` gera um `id` com `useId()` e liga-o.
Verificado no HTML servido: ambos os `<label for>` resolvem para um `id` existente.

**Lição para esta lista:** um `grep` que não encontra um padrão prova a ausência *desse padrão*,
não a ausência do *comportamento*. Regra 2 aplicada a mim próprio.

#### F1-7 — `lang` no HTML servido

O middleware passa o locale no cabeçalho `x-w2g-locale`; o layout raiz lê-o com `headers()`.
`LocaleHtmlLang.tsx` foi **removido** — a correção era feita no cliente, depois da hidratação, tarde
demais para motores de busca e leitores de ecrã.

Ponderei uma alternativa (dividir a app em grupos de rotas com layouts raiz separados), mais
correta em teoria mas bastante mais invasiva num codebase sem testes E2E. Escolhi o cabeçalho e
medi o custo.

> **Correção a esta entrada (20 ago 2026).** Escrevi aqui que a pré-renderização se manteve e que
> "o receio não se confirmou". **Estava incompleto.** Verifiquei só as páginas `●` (SSG via
> `generateStaticParams`) — essas mantiveram-se, e são as públicas, que é o que mais conta. Mas as
> páginas `○` (estáticas simples) **passaram a `ƒ`**, porque usam o layout raiz que agora lê
> `headers()`:
>
> | Rota | Antes | Depois |
> |---|---|---|
> | `/_not-found` | ○ | **ƒ** |
> | `/internal/admin`, `/internal/admin/login` | ○ | **ƒ** |
> | `/master-admin/login` | ○ | **ƒ** |
> | `/partner` | ○ | **ƒ** |
> | `/[locale]` e as 3 páginas legais | ● | ● |
>
> O impacto prático continua desprezável — são páginas de administração, um 404 e um redirect,
> todas de tráfego residual e sem chamadas externas. A decisão mantém-se. Mas medi parcialmente e
> generalizei: verifiquei o caso que esperava e não o conjunto todo.

| Caminho | Antes | Depois |
|---|---|---|
| `/pt/` | `lang="pt"` | `lang="pt"` |
| `/en/` | **`lang="pt"`** | **`lang="en"`** |
| `/en/legal/terms/` | **`lang="pt"`** | **`lang="en"`** |
| `/` com `Accept-Language: en` | **`lang="pt"`** | **`lang="en"`** |
| `/drivers-pwa/login/` | `lang="pt"` | `lang="pt"` |

No mesmo passo corrigiu-se o badge `"opcional"`, que estava fixo em português e aparecia assim na
versão inglesa. Agora vem do dicionário: PT `opcional`, EN `optional`.

#### Defeito meu apanhado na build

Coloquei a chave `optional` na interface `FormState` em vez de a deixar ao dicionário inferido — a
build falhou com erro de tipos. Corrigido. Foi o `tsc` do `next build` a apanhá-lo, o que é
precisamente o que o F1-5 (CI) passa a garantir em cada PR.

#### F1-2 — adiado por decisão

Escolha de ferramenta de analytics colocada ao dono do produto a 19 ago 2026: **decidir mais
tarde**. Continua a ser o desbloqueador da decisão estratégica §6-A — sem dados de conversão, essa
escolha é feita às cegas.

### 19 ago 2026 — Fase 1 parcial (F1-1, F1-3 a F1-6); terceiro bug pré-existente

#### F0-5 completado

Morada confirmada pelo dono do produto: **Maia** — coerente com o foro da Comarca do Porto, o que
confirma que o `"Lisboa"` anterior estava errado, não apenas genérico. `address` reposto com
`addressLocality: "Maia"` e `addressRegion: "Porto"`.

`streetAddress` e `postalCode` continuam **por preencher**: foi dada a localidade, não a morada
fiscal completa. Preencher quando existir — o Google prefere um `PostalAddress` completo.

#### F1-1 — SEO

Novos: `src/lib/site.ts` (fonte única do URL e dos locales), `src/app/sitemap.ts`,
`src/app/robots.ts`, `src/app/icon.tsx`, `src/app/[locale]/opengraph-image.tsx`,
`src/lib/legal-metadata.ts`. Alterados: os dois layouts e as três páginas legais.

Favicon e imagem OG são **gerados** com `next/og` a partir dos elementos de marca que já existiam
(o "W" do Navbar, o dourado #D4AF37), em vez de ficheiros novos — evita uma segunda fonte de
verdade sobre a marca.

**Por confirmar (§7):** `SITE_URL` assume `https://way2go.pt`. O repositório é inconsistente sobre
www vs raiz — os textos legais dizem `www.way2go.pt`. Um canonical apontado ao domínio errado
divide a autoridade em vez de a unir. **Fixar `NEXT_PUBLIC_SITE_URL` depois de confirmar o DNS.**

#### NOVO-3 — o service worker dos motoristas nunca foi alcançável

Terceiro bug da mesma família, encontrado ao verificar o F1-1. A exclusão do matcher dizia
`service-worker.js`, mas o ficheiro é `public/driver-sw.js`. Medido antes de corrigir:

| Host | Antes | Depois |
|---|---|---|
| normal | 307 → `/pt/driver-sw.js` → **404** | **200** |
| `drivers.*` | **404** (reescrito para `/drivers-pwa/driver-sw.js`) | **200** |

O registo em `DriverServiceWorkerRegister.tsx` tem `.catch(() => {})`, que engolia a falha — a PWA
dos motoristas nunca teve service worker e nada o denunciava.

No mesmo passo, o matcher deixava também passar `/robots.txt`, `/sitemap.xml`, `/icon` e
`/opengraph-image` (redirecionados para `/pt/…` → 404), o que teria tornado **todo o F1-1
inoperante**.

**Foi criado `src/middleware-matcher.test.ts`** — 25 casos, e lê o padrão do código-fonte em vez de
o copiar, para não poder dessincronizar. Três bugs distintos nasceram deste padrão; agora há rede.

#### F1-3 e F1-4 — proteção e resiliência do funil de leads

- `.max()` em todas as strings do schema. `observations` fica em 900, abaixo do limite de 1024 do
  embed do Discord — era esse estouro que fazia o endpoint devolver 500 e **perder o lead**.
- Honeypot `website`: campo fora do fluxo visual, `aria-hidden`, `tabIndex={-1}`. Se vier
  preenchido, responde 200 sem notificar — negar abertamente ensinaria o bot a contornar.
- `src/lib/rate-limit.ts` (novo, com testes): 5 pedidos por IP / 10 min. **Limitação assumida:** o
  estado é do processo; em serverless com N instâncias o limite efetivo é `5 × N`. Trava o abuso
  trivial, que é a ameaça real. Um limite rigoroso exigiria Redis.
- **Discord deixou de ser bloqueante.** Antes, uma falha do Discord devolvia 500 mesmo com o email
  entregue — e o lead perdia-se. Agora só falha se *nenhum* canal funcionar.
- `DISCORD_WEBHOOK_URL`, as quatro `SMTP_*` e `LEADS_INTERNAL_EMAIL` documentadas no `.env.example`.

#### F1-6 — páginas de erro

`ErrorScreen` partilhado, mais `[locale]/{error,not-found}.tsx`, `not-found.tsx` e
`global-error.tsx` na raiz.

**Defeito meu, apanhado na verificação:** a primeira versão derivava o locale durante o render.
Como o 404 é pré-renderizado em build (sem caminho), o servidor produzia `pt` e o cliente
calcularia `en` — erro de hidratação. Corrigido para arrancar em `pt` e só corrigir após montar.

#### F1-5 — CI

`.github/workflows/ci.yml`: lint, testes e build em push e PR. A build corre com `NEXT_PUBLIC_*`
fictícias — valida que compila, **não produz artefacto publicável**.

#### Melhoria ao `clean-build.mjs`

Durante esta sessão o script falhou com `EBUSY` porque um servidor de teste ainda corria sobre o
bundle — **comportou-se como projetado**, mas a mensagem saía como exceção crua. Passa a apanhar o
erro e a explicar a causa.

#### Verificação executada

| Teste | Resultado |
|---|---|
| `/robots.txt` | 200, com `Sitemap:` e as 5 áreas internas em `Disallow` |
| `/sitemap.xml` | 8 URLs (4 caminhos × 2 locales), **24 links hreflang** |
| `/icon`, `/pt/opengraph-image` | 200 `image/png` (OG: 1200×630, 35 KB) |
| Canonical | distinto por página e por locale |
| hreflang | `pt`, `en`, `x-default` |
| Títulos | 6 páginas, 6 títulos distintos (antes: 1 para todas) |
| `/driver-sw.js` | **200 em ambos os hosts** (antes 404) |
| `pickup` com 300 chars | 400 |
| 6 pedidos ao `send-budget` | 5 passam, o 6.º → **429** |
| `/pt/nao-existe/`, `/en/…`, `/partner/…` | 404 com ecrã de marca |
| Regressão: `/`, `/pt/`, `/en/`, legais, `/partner/`, `/drivers-pwa/` | 200 / 307 corretos |

`npm run lint` limpo · **78 testes** (eram 40) · servidor encerrado.

### 19 ago 2026 — Fase 0 executada (F0-1 a F0-6); dois bugs novos descobertos

#### O que mudou

| Item | Ficheiros |
|---|---|
| **F0-1** | `public/hero-chauffeur.webp` recomprimida; `next.config.ts` (otimização ativa, formatos AVIF/WebP); `sharp` adicionado às dependências |
| **F0-2** | `audit_env.sh` — `git checkout --` |
| **F0-3** | `.gitignore` reescrito |
| **F0-4** | `src/app/api/send-budget/route.ts` |
| **F0-5** | `src/app/[locale]/layout.tsx` |
| **F0-6** | `src/app/apitest/` e `temp_home_*.html` eliminados |
| **NOVO-1** | `src/middleware.ts` — matcher delimitado |
| **NOVO-2** | `scripts/clean-build.mjs` (novo); `package.json` — `build:standalone` limpa antes de construir |

#### F0-2 — a correção era mais simples do que o relatado

O `audit_env.sh` estava partido **apenas na working tree**; o HEAD sempre esteve limpo
(`git show HEAD:audit_env.sh | bash -n` passa). A corrupção nunca foi comitada, logo a correção
certa era `git checkout -- audit_env.sh`, não editar as linhas. Tentei editar primeiro e produzi
um diff residual de uma linha em branco — descartar foi o caminho limpo.

#### F0-5 — o que não se corrigiu, e porquê

O telefone foi reposto a partir de `Footer.tsx:20` (`+351913281953`, o número de WhatsApp que a
empresa já publica aos clientes) e o email de `support@way2go.pt`, presente nos textos legais.

**A morada não foi corrigida — foi removida.** Não existe morada de sede em lado nenhum do
repositório, e os valores anteriores (`"Lisboa"`, código postal `"1000"`, coordenadas de Lisboa)
eram inventados. Mais: o foro contratual é a **Comarca do Porto** nos dois idiomas
(`dictionaries/{pt,en}.json`, cláusula 9.3), o que sugere que "Lisboa" estava simplesmente errado.
Inventar uma morada seria pior do que não ter nenhuma, por isso `address` e `geo` saíram e ficou
`areaServed` (Portugal, Espanha), que é verificável na FAQ.

➡️ **Fica em aberto:** repor `address` com a morada real da sede, que tem de vir da empresa.

#### NOVO-1 — o matcher do middleware deixava passar tudo o que começasse por `api`

Descoberto porque `/apitest/` continuava a responder **200** depois de a pasta ser apagada.

O matcher era `"/((?!api|_next/static|…)…)"`. O `api` no lookahead **não estava delimitado**, pelo
que excluía qualquer caminho *iniciado* pela literal `api`. Confirmado empiricamente antes de
corrigir:

| Caminho | Antes | Depois |
|---|---|---|
| `/apitest/` | 200 | 307 → 404 |
| `/apifoo/` | 200 | 307 |
| `/api-docs/` | 200 | 307 |
| `/apple/` | 307 | 307 |
| `/qualquercoisa/` | 307 | 307 |

Consequências enquanto durou: a landing era servida em URLs arbitrários (conteúdo duplicado para
SEO), e nenhum desses pedidos recebia o refresh de sessão Supabase.

Corrigido para `api(?:/|$)`. Verificado que as rotas de API reais continuam a não ser
redirecionadas: `POST /api/send-budget` → 400, com e sem barra final;
`GET /api/places/autocomplete` → 200.

**Bug pré-existente**, não introduzido por este trabalho.

#### NOVO-2 — o build não removia rotas apagadas

Também exposto pelo F0-6, e o mais perigoso dos dois: o `next build` **não limpa artefactos de
rotas que deixaram de existir**. Depois de apagar `src/app/apitest/`, os manifests da nova build
já não continham a rota — mas `.next/standalone/.next/server/app/apitest.html` sobrevivia e era
servido com `x-nextjs-cache: HIT`.

Limpar só `.next/standalone` **não resolveu**: o `next build` seguinte repunha o ficheiro a partir
da cache incremental em `.next/`. Só a remoção de `.next` inteiro elimina a rota.

Traduzido: **uma página apagada podia continuar viva em produção**, sem que nada o denunciasse —
os manifests estavam corretos. `scripts/clean-build.mjs` passa a limpar `.next` antes de cada
build de produção, e **falha com erro** se a remoção não for possível (no Windows, um processo a
correr sobre o bundle mantém handles abertos e o `rm` falha em silêncio — foi assim que o
artefacto sobreviveu às primeiras tentativas).

#### Verificação executada

Build limpa, servidor standalone arrancado, e:

| Teste | Resultado |
|---|---|
| `hero-chauffeur.webp` servido | **185 452 bytes** (era 10 160 326) |
| Mesma imagem via `/_next/image?w=1200` | 200, **70 495 bytes**, `image/avif` — otimização ativa |
| JSON-LD: `telephone` | `+351913281953` |
| JSON-LD: `address` / `geo` | removidos |
| JSON-LD: placeholder `XXXX` | ausente |
| `/apitest/`, `/apifoo/`, `/api-docs/` | 307 (antes 200) |
| `/apitest/` seguindo redirects | **404** |
| `POST /api/send-budget` (com e sem barra) | 400 |
| `GET /api/places/autocomplete` | 200 |
| `/`, `/pt/`, `/en/`, as 3 páginas legais | 200 |
| `/partner/` | 307 → `/partner/book/` |
| `/drivers-pwa/login/` | 200 |

`npm run lint` limpo · **40/40 testes** · servidor encerrado.

#### Alteração de âmbito assumida

O `F0-4` obrigou a nomear o destinatário interno dos emails. Em vez de o deixar hardcoded,
introduzi `LEADS_INTERNAL_EMAIL` com **o mesmo valor por defeito** (`reservas@vruum.pt`), pelo que
o comportamento não muda. É meio caminho para o **F2-1**, que continua por fazer: eliminar
`vruum.pt` do produto Way2Go.

### 19 ago 2026 — Correção: contagem de migrações errada nos relatórios

Ao criar esta lista, a verificação de uma afirmação de §7-8 expôs um erro meu nos dois relatórios.

Afirmei **21 migrações** no sumário e na tabela de stack do Relatório de Auditoria, e **22
migrações** na secção do que está bem-feito. Os dois números estavam errados, e serem
inconsistentes entre si devia ter sido sinal de alarme na altura.

**Valor verificado:** `ls supabase/migrations/*.sql | wc -l` → **19**. A pasta `supabase/` contém
ainda `config.toml` e `seed_b2b_partner.sql`, que não são migrações.

Corrigido em `RELATORIO_AUDITORIA.md` (3 ocorrências), nesta lista, e no artifact publicado.

**Confirmado no mesmo passo:** `booking_retry_queue` **não existe** em nenhuma das 19 migrações —
`grep -ril "retry_queue" supabase/` não devolve nada. Só é mencionada em
`docs/engine-agnostic-architecture.md:316,415`, ou seja, está especificada mas não implementada.
Se existe no Supabase de produção é outra questão, e essa continua por verificar (§7-8).

### 19 ago 2026 — A1: adotado o build standalone

**Alterações**

| Ficheiro | O que mudou |
|---|---|
| `server.js` (raiz) | Removido — entrypoint cPanel |
| `package.json` | `start:cpanel` → `build:standalone` + `start:standalone` |
| `scripts/assemble-standalone.mjs` | Novo — copia `public/` e `.next/static/` para o bundle |
| `ecosystem.config.js` | Novo — PM2 para Cloudways |
| `Dockerfile` | `CMD` documentado de forma inequívoca |

**Descoberto durante a implementação.** `output: "standalone"` gera o servidor e um `node_modules`
mínimo mas **não copia `public/` nem `.next/static/`**. Sem esse passo o servidor arranca sem erro
nenhum e serve HTML sem CSS, sem JS de cliente e sem imagens — falha silenciosa. Foi por isso que
o `assemble-standalone.mjs` passou a ser parte da solução, e não apenas apontar o PM2 ao ficheiro.

**Correção a uma afirmação anterior.** Descrevi o `CMD ["node", "server.js"]` do Dockerfile como
potencialmente partido. Não estava: o estágio `runner` arranca de imagem limpa e copia apenas
`public`, `.next/standalone` → `./` e `.next/static`, pelo que o `server.js` da raiz nunca chegava
à imagem final e o `CMD` já resolvia corretamente. Era legibilidade e fragilidade, não runtime.
Corrigido nos dois relatórios.

**Verificação executada** — `npm run build:standalone` completou; servidor arrancado em
`127.0.0.1:3111` e testado:

| Teste | Resultado |
|---|---|
| `/` (rewrite de locale) | 200 |
| `/pt/` e `/en/` | 200, conteúdo distinto — i18n a funcionar |
| CSS de `.next/static` | 200 — passo de assets confirmado |
| `hero-chauffeur.webp` de `public/` | 200, 10 160 326 bytes (reconfirma F0-1) |
| Cabeçalho CSP | Presente |
| `/legal/privacy/` sem locale | 307 → `/pt/legal/privacy/` |
| `/partner/` (secção não-localizada) | 307 → `/partner/book/` |
| `POST /api/send-budget` corpo inválido | 400 |
| Mesmo POST com barra final | 400 — `skipTrailingSlashRedirect` preserva o corpo |
| Rota inexistente | 404 |

`npm run lint` limpo · **40/40 testes a passar** · servidor encerrado.

---

*Cada afirmação desta lista cita um caminho verificável no commit `e6b7919` ou está declarada como
não verificada em §7. Ao acrescentar itens, manter essa regra.*

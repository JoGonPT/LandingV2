# Payload CMS — análise e documento de decisão

**Estado:** análise concluída. **Nada foi instalado nem alterado.**
**Data:** 29 de agosto de 2026.
**Para:** decisão do João e leitura da equipa de desenvolvimento.

Este documento existe para uma coisa: permitir decidir **onde** o Payload vive e **onde**
guarda os dados, com os custos de cada caminho medidos em vez de estimados no ar. As duas
decisões estão em aberto e são pré-requisito de qualquer instalação.

---

## 1. O que existe hoje

| | |
|---|---|
| Router | **App Router**, exclusivamente. Não existe `pages/` |
| Next.js | 15.5.12 (o Payload exige ≥ 15.2.9) |
| React | 19 |
| Node | 23.10.0 (o Payload exige ≥ 20.9.0) |
| ORM | **nenhum** |
| CMS | **nenhum** |
| `sharp` | ^0.35.3, já instalado — o Payload precisa dele |

**Acesso a dados.** Não há ORM. O Supabase é acedido por **REST direto** com a chave de
serviço — ver `src/lib/site-settings/store.ts` e `src/lib/sync/sync-errors-store.ts`. Não
existe `DATABASE_URL` nem qualquer variável de ligação direta ao Postgres em produção.

**Onde vive o conteúdo.** Em `src/dictionaries/pt.json` e `en.json`, **117 chaves** em sete
secções — `common`, `hero`, `booking`, `faq`, `footer`, `cookies`, `legal`. Mudar uma vírgula
no site exige um commit e um deploy. É este o problema que o CMS resolve.

**Escala.** 45 rotas de API, 19 páginas, 14 entradas de topo em `src/app/`, 28 componentes,
41 tabelas expostas pela API do Supabase.

---

## 2. Os conflitos, com evidência

Cinco. Três eram sérios; **um deixou de o ser** depois de confirmar a documentação.

### 2.1 Colisão de rotas de API — resolúvel

O Payload monta `/api/[...slug]`. Existem **45 rotas** em `/api/`. Um catch-all nesse nível
seria a maior fonte de risco do projeto.

**Mas é configurável.** A documentação confirma as chaves `routes.admin` (omissão `/admin`)
e `routes.api` (omissão `/api`), com a ressalva de que *"changing Root-level Routes also
requires a change to Project Structure to match the new route"*. Com `routes.api: "/cms-api"`
o catch-all deixa de tocar nas 45 rotas existentes.

### 2.2 O middleware captura `/admin` — resolúvel

`src/middleware.ts` exclui do matcher `api`, `_next`, metadata e estáticos. **Não exclui
`/admin`.** E `nonLocalizedTopSections` é `["partner", "internal", "master-admin"]`.

Consequência: `/admin` seria reescrito para `/pt/admin` e, com o interruptor "Em breve"
ligado, **trancado atrás do portão**. Resolve-se acrescentando a secção às duas listas — mas
é uma alteração a um ficheiro que já levou três correções e tem testes dedicados
(`src/middleware-matcher.test.ts`).

### 2.3 Dois `<html>` — não resolúvel, só contornável

`src/app/layout.tsx:35-36` é o layout raiz e emite `<html>` e `<body>`. O admin do Payload
precisa dos seus.

A documentação do Payload é explícita: *"your existing app files should move into their own
route group"*. Isso significa mover **as 14 entradas de topo** — `[locale]`, `api`,
`drivers-pwa`, `em-breve`, `internal`, `master-admin`, `partner`, `layout.tsx`,
`not-found.tsx`, `global-error.tsx`, `icon.tsx`, `robots.ts`, `sitemap.ts`, `globals.css` —
para dentro de um route group.

Os URLs não mudam (route groups não aparecem no caminho), mas é um movimento grande, com
risco no *tracing* do build `standalone` que alimenta o Cloudways.

**É este o custo real do caminho "dentro desta aplicação".** Os outros negoceiam-se; este não.

### 2.4 Configuração que precisa de ajuste

Em `next.config.ts`:

- **CSP** — `frame-ancestors 'none'`, `connect-src` fechado e `img-src` sem `blob:`. O admin
  do Payload muito provavelmente precisa de mais do que isto.
- **`trailingSlash: true`** — altera os URLs do admin.
- **`Cache-Control: no-store` em `/api/:path*`** — passaria a cobrir a API do Payload.
- O Payload exige embrulhar a config em `withPayload`.

### 2.5 Ferramentas

`tsconfig.json` tem `noUnusedLocals` e `noUnusedParameters`, e o `include` é `**/*.ts(x)` —
apanha tudo o que for gerado. `eslint.config.mjs` corre com `--max-warnings=0`. Os ficheiros
que o Payload gera (`payload-types.ts`, importmap) vão tropeçar nos dois se não forem
excluídos.

---

## 3. As duas arquiteturas

| | **App separada** | **Dentro desta app** |
|---|---|---|
| Conflitos a resolver | nenhum | 2.2, 2.3, 2.4, 2.5 |
| Ficheiros movidos | nenhum | **14 entradas de topo** |
| Risco no site atual | **nenhum** | real, mitigável com testes |
| Deployments | dois | um |
| Se o CMS cair | site de pé | site de pé, sem conteúdo novo |
| Partilha de sessão | não | sim |
| Complexidade a manter | duas apps | uma app maior |

**Recomendação: app separada**, na mesma repo, com deployment próprio — por exemplo
`cms.way2go.pt`. O site consome a API do Payload e mantém os `dictionaries` como recurso.

O argumento não é elegância; é que **nenhum dos conflitos existe**. Numa semana em que a base
de dados esteve pausada sem ninguém dar por isso, separar o que pode falhar do que não pode
falhar tem valor demonstrado.

O caminho "dentro" é legítimo e a documentação suporta-o. Custa o movimento das 14 entradas e
o ajuste do middleware, e paga isso com um único deployment e sessão partilhada. Se a equipa
de desenvolvimento preferir uma app só, é uma escolha defensável — desde que feita com os
olhos abertos para 2.3.

---

## 4. O esquema — para responder a "onde guardar"

Confirmado na documentação do adaptador Postgres do Payload:

| Elemento | Como fica no Postgres |
|---|---|
| Coleção | uma tabela com o nome do slug |
| Campos localizados | tabela à parte com sufixo `_locales` |
| Relações | tabela à parte com sufixo `_rels` |
| Versões e rascunhos | tabela à parte com sufixo `_v` |
| Blocos | JSON ou relacional, conforme `blocksAsJSON` |

**Ordem de grandeza para o âmbito pedido** — textos do site, páginas, media e páginas legais,
com localização PT/EN e rascunhos ativos: **estimo 20 a 30 tabelas**. É uma estimativa a
partir da regra acima, não uma contagem: o número exato só se conhece depois de escrever as
coleções.

### A opção que muda a decisão

O adaptador tem **`schemaName`** — *"a string for the postgres schema to use, defaults to
'public'"*, marcada como **experimental** na documentação.

Com `schemaName: "payload"`, as 20 a 30 tabelas ficam num schema próprio, **isoladas das 41
tabelas existentes**, dentro do mesmo projeto Supabase. Uma só base de dados para gerir, para
copiar e para migrar para o Cloudways, sem misturar conteúdo editorial com reservas,
pagamentos e credenciais.

Note-se a ordem de grandeza: o Payload acrescentaria mais de metade do que já lá está. Num
schema próprio isso é arrumação; em `public`, ao lado das outras, seria confusão permanente.

**É esta a via recomendada.** A alternativa — segundo projeto Supabase — dá isolamento total
mas acrescenta uma base de dados a manter e a pagar, e já existem dois projetos por
esclarecer (ver §7).

Ressalva honesta: a opção está marcada como experimental. Vale confirmar o estado dela antes
de comprometer, sobretudo por causa das migrações.

---

## 5. O que falta e ainda não existe

**Uma ligação direta ao Postgres.** O Payload precisa de `pool: { connectionString }`. Este
projeto só fala REST com o Supabase e não tem `DATABASE_URL` em produção — confirmado.

Obtém-se no painel do Supabase, em Project Settings → Database → Connection string. **Não vai
para o repositório**: é variável de ambiente, como todas as outras. Se a password tiver
símbolos, tem de ser codificada em percentagem.

---

## 6. Passo a passo

Cada passo tem um ponto de verificação, para que a execução possa parar a meio sem deixar o
site partido.

### Caminho A — app separada (recomendado)

1. **`cms/`, app Next nova.** Verificar: o `npm run build` da app existente continua limpo, e
   `git status` não mostra alterações fora de `cms/`.
2. **Payload + adaptador Postgres, com `schemaName: "payload"`.** Verificar: as tabelas
   aparecem nesse schema e **nenhuma** em `public`.
3. **Coleções: textos, páginas, media, legais.** Verificar: o admin abre e grava.
4. **Deployment próprio.** Verificar: o `www.way2go.pt` responde igual ao que responde hoje.
5. **O site passa a ler do Payload, com os `dictionaries` como recurso.** Verificar: com o CMS
   desligado à força, o site continua a servir texto.

O site só é tocado no passo 5, e mesmo aí de forma reversível.

### Caminho B — dentro desta aplicação

1. **Mover as 14 entradas de topo para `(frontend)`.** Verificar: as 19 páginas e as 45 rotas
   respondem o mesmo que antes; `npm test` verde; `build:standalone` a produzir um bundle que
   arranca.
2. **`routes.api: "/cms-api"` e `routes.admin: "/cms"`**, com a estrutura de pastas a
   acompanhar. Verificar: nenhuma das 45 rotas mudou de comportamento.
3. **Excluir `/cms` do middleware** — matcher e `nonLocalizedTopSections`. Verificar: com o
   "Em breve" ligado, o `/cms` continua alcançável. Acrescentar caso ao
   `middleware-matcher.test.ts`.
4. **Ajustar CSP, `withPayload`, `tsconfig` e `eslint`.** Verificar: build e lint limpos.
5. **Coleções e migração de conteúdo**, como no caminho A.

O passo 1 é o que carrega o risco. Não deve ser feito no mesmo PR que qualquer outra coisa.

---

## 7. Por decidir

1. **Arquitetura** — app separada ou dentro desta. §3.
2. **Base de dados** — `schemaName: "payload"` no Supabase atual, ou projeto separado. §4.
3. **O estado de `schemaName`** — está marcada como experimental; confirmar antes de
   comprometer.
4. **Os dois projetos Supabase** — o `gxecrhhtvhpbsbatmedk` continua de pé com o mesmo esquema
   do `otzmdqpqpacvirbxpmgu`, e não se sabe se é uma branch ou um projeto à parte. Convém
   esclarecer **antes** de acrescentar um CMS à mistura.

---

## 8. O que este documento não fez

Nenhum pacote instalado. Nenhum ficheiro do projeto alterado. Não existe `payload.config.ts`,
o `next.config.ts` está intacto, o middleware está intacto, e o `package.json` não ganhou uma
única dependência.

O único ficheiro novo é este.

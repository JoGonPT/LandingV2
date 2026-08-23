-- Interruptores operacionais do site, lidos em tempo de execução.
--
-- Porquê uma tabela e não variáveis de ambiente: na Vercel os valores ficam
-- fixados no deployment no momento em que este é criado — alterar uma variável
-- não afeta o que já está no ar, só um deploy novo. Um painel que escrevesse em
-- variáveis mostraria "desligado" com o site a cobrar cartões.
--
-- As variáveis de ambiente continuam a existir como valor de recurso: a ordem de
-- resolução é sempre base de dados -> ambiente -> omissão segura.

create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by_label text
);

alter table public.site_settings enable row level security;

drop policy if exists site_settings_service_role_all on public.site_settings;

create policy site_settings_service_role_all
  on public.site_settings
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.site_settings is
  'Interruptores operacionais. Fonte de verdade em tempo de execução; o ambiente é o recurso.';

-- ---------------------------------------------------------------------------

-- Registo de alterações. Só inserções — uma linha por mudança de estado.
--
-- Existe porque a administração usa uma password única partilhada e não há
-- forma de distinguir pessoas. O `actor_label` é pedido no momento da alteração
-- e é o mínimo para haver responsabilidade; `confirmation_typed` guarda a frase
-- que foi efetivamente escrita, que prova que a confirmação passou pelo servidor.

create table if not exists public.site_settings_audit (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  old_value text,
  new_value text not null,
  actor_label text,
  confirmation_typed text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_settings_audit_key on public.site_settings_audit (key, created_at desc);
create index if not exists idx_site_settings_audit_recent on public.site_settings_audit (created_at desc);

alter table public.site_settings_audit enable row level security;

drop policy if exists site_settings_audit_service_role_all on public.site_settings_audit;

create policy site_settings_audit_service_role_all
  on public.site_settings_audit
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.site_settings_audit is
  'Histórico imutável de alterações aos interruptores. Nunca apagar.';

-- ---------------------------------------------------------------------------

-- Credenciais da administração.
--
-- Hoje a password vive em claro em W2G_MASTER_ADMIN_PASSWORD e é comparada tal
-- e qual. Aqui guarda-se apenas o resultado de scrypt com sal aleatório: a
-- password em claro nunca é escrita, nem em log, nem nesta tabela.
--
-- Linha única, garantida pelo índice parcial abaixo. Enquanto não existir linha,
-- o login recorre à variável de ambiente — de outra forma ninguém entraria para
-- definir a primeira password.

create table if not exists public.admin_credentials (
  id uuid primary key default gen_random_uuid(),
  is_current boolean not null default true,
  password_hash text not null,
  salt text not null,
  algo text not null default 'scrypt',
  rotated_at timestamptz not null default now(),
  rotated_by_label text
);

create unique index if not exists idx_admin_credentials_single_current
  on public.admin_credentials (is_current)
  where is_current;

alter table public.admin_credentials enable row level security;

drop policy if exists admin_credentials_service_role_all on public.admin_credentials;

create policy admin_credentials_service_role_all
  on public.admin_credentials
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.admin_credentials is
  'Hash scrypt da password de administração. Sem linha corrente, o login usa W2G_MASTER_ADMIN_PASSWORD.';

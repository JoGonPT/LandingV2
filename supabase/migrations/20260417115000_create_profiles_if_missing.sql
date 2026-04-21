-- Baseline for databases that never ran legacy migrations creating `public.profiles`.
-- Required before 20260417120000_profiles_transfercrm_driver_id_rls.sql and later profile FK/RLS migrations.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Links Supabase Auth users to app role and tenant scope.';

create index if not exists profiles_tenant_id_idx on public.profiles (tenant_id);

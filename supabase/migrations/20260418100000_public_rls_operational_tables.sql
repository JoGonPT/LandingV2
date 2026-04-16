-- RLS por tabela (critério alinhado a policies existentes: get_my_role(), profiles.tenant_id).
-- - service_role: política explícita (linter / consistência com public.partners).
-- - ADMIN: ALL nas tabelas operacionais.
-- - Catálogo: leitura pública só de linhas ativas (tenants.active, services."isActive").
-- - Preços: SELECT para utilizadores autenticados do mesmo tenant_id (via profiles).
-- - Motoristas: só linhas com driver_id = auth.uid() quando role = DRIVER.
-- - _prisma_migrations: sem acesso via PostgREST para anon/authenticated (só service_role na política).

-- ---------------------------------------------------------------------------
-- _prisma_migrations
-- ---------------------------------------------------------------------------
alter table public._prisma_migrations enable row level security;

drop policy if exists _prisma_migrations_service_role_all on public._prisma_migrations;

create policy _prisma_migrations_service_role_all
  on public._prisma_migrations
  for all
  to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------
alter table public.tenants enable row level security;

drop policy if exists tenants_service_role_all on public.tenants;
drop policy if exists tenants_admin_all on public.tenants;
drop policy if exists tenants_public_select_active on public.tenants;

create policy tenants_service_role_all
  on public.tenants
  for all
  to service_role
  using (true)
  with check (true);

create policy tenants_admin_all
  on public.tenants
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

create policy tenants_public_select_active
  on public.tenants
  for select
  to anon, authenticated
  using (active = true);

-- ---------------------------------------------------------------------------
-- services (catálogo)
-- ---------------------------------------------------------------------------
alter table public.services enable row level security;

drop policy if exists services_service_role_all on public.services;
drop policy if exists services_admin_all on public.services;
drop policy if exists services_public_select_active on public.services;

create policy services_service_role_all
  on public.services
  for all
  to service_role
  using (true)
  with check (true);

create policy services_admin_all
  on public.services
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

create policy services_public_select_active
  on public.services
  for select
  to anon, authenticated
  using ("isActive" = true);

-- ---------------------------------------------------------------------------
-- pricing_rules (por tenant)
-- ---------------------------------------------------------------------------
alter table public.pricing_rules enable row level security;

drop policy if exists pricing_rules_service_role_all on public.pricing_rules;
drop policy if exists pricing_rules_admin_all on public.pricing_rules;
drop policy if exists pricing_rules_tenant_select on public.pricing_rules;

create policy pricing_rules_service_role_all
  on public.pricing_rules
  for all
  to service_role
  using (true)
  with check (true);

create policy pricing_rules_admin_all
  on public.pricing_rules
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

create policy pricing_rules_tenant_select
  on public.pricing_rules
  for select
  to authenticated
  using (
    tenant_id is not distinct from (
      select p.tenant_id::text from public.profiles p where p.id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- vehicle_type_configs (via pricing_rule do tenant)
-- ---------------------------------------------------------------------------
alter table public.vehicle_type_configs enable row level security;

drop policy if exists vehicle_type_configs_service_role_all on public.vehicle_type_configs;
drop policy if exists vehicle_type_configs_admin_all on public.vehicle_type_configs;
drop policy if exists vehicle_type_configs_tenant_select on public.vehicle_type_configs;

create policy vehicle_type_configs_service_role_all
  on public.vehicle_type_configs
  for all
  to service_role
  using (true)
  with check (true);

create policy vehicle_type_configs_admin_all
  on public.vehicle_type_configs
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

create policy vehicle_type_configs_tenant_select
  on public.vehicle_type_configs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.pricing_rules pr
      where pr.id = vehicle_type_configs.pricing_rule_id
        and pr.tenant_id is not distinct from (
          select p.tenant_id::text from public.profiles p where p.id = auth.uid()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- driver_availability
-- ---------------------------------------------------------------------------
alter table public.driver_availability enable row level security;

drop policy if exists driver_availability_service_role_all on public.driver_availability;
drop policy if exists driver_availability_admin_all on public.driver_availability;
drop policy if exists driver_availability_driver_own on public.driver_availability;

create policy driver_availability_service_role_all
  on public.driver_availability
  for all
  to service_role
  using (true)
  with check (true);

create policy driver_availability_admin_all
  on public.driver_availability
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

create policy driver_availability_driver_own
  on public.driver_availability
  for all
  to authenticated
  using (get_my_role() = 'DRIVER' and driver_id = auth.uid())
  with check (get_my_role() = 'DRIVER' and driver_id = auth.uid());

-- ---------------------------------------------------------------------------
-- driver_locations
-- ---------------------------------------------------------------------------
alter table public.driver_locations enable row level security;

drop policy if exists driver_locations_service_role_all on public.driver_locations;
drop policy if exists driver_locations_admin_all on public.driver_locations;
drop policy if exists driver_locations_driver_own on public.driver_locations;

create policy driver_locations_service_role_all
  on public.driver_locations
  for all
  to service_role
  using (true)
  with check (true);

create policy driver_locations_admin_all
  on public.driver_locations
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

create policy driver_locations_driver_own
  on public.driver_locations
  for all
  to authenticated
  using (get_my_role() = 'DRIVER' and driver_id = auth.uid()::text)
  with check (get_my_role() = 'DRIVER' and driver_id = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Trigger helper: search_path fix (Supabase advisor)
-- ---------------------------------------------------------------------------
alter function public.update_updated_at_column() set search_path to public;

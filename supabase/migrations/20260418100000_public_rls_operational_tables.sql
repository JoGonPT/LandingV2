-- RLS por tabela (critério alinhado a policies existentes: get_my_role(), profiles.tenant_id).
-- Cada bloco só corre se a tabela existir (remotes sem Prisma / sem catálogo legado).

-- ---------------------------------------------------------------------------
-- _prisma_migrations
-- ---------------------------------------------------------------------------
do $w2g_rls_prisma$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = '_prisma_migrations'
  ) then
    alter table public._prisma_migrations enable row level security;

    drop policy if exists _prisma_migrations_service_role_all on public._prisma_migrations;

    create policy _prisma_migrations_service_role_all
      on public._prisma_migrations
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $w2g_rls_prisma$;

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------
do $w2g_rls_tenants$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'tenants'
  ) then
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
  end if;
end $w2g_rls_tenants$;

-- ---------------------------------------------------------------------------
-- services (catálogo)
-- ---------------------------------------------------------------------------
do $w2g_rls_services$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'services'
  ) then
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
  end if;
end $w2g_rls_services$;

-- ---------------------------------------------------------------------------
-- pricing_rules (por tenant)
-- ---------------------------------------------------------------------------
do $w2g_rls_pricing_rules$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'pricing_rules'
  ) then
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
  end if;
end $w2g_rls_pricing_rules$;

-- ---------------------------------------------------------------------------
-- vehicle_type_configs (via pricing_rule do tenant)
-- ---------------------------------------------------------------------------
do $w2g_rls_vehicle_type_configs$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'vehicle_type_configs'
  ) then
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
  end if;
end $w2g_rls_vehicle_type_configs$;

-- ---------------------------------------------------------------------------
-- driver_availability
-- ---------------------------------------------------------------------------
do $w2g_rls_driver_availability$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'driver_availability'
  ) then
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
  end if;
end $w2g_rls_driver_availability$;

-- ---------------------------------------------------------------------------
-- driver_locations
-- ---------------------------------------------------------------------------
do $w2g_rls_driver_locations$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'driver_locations'
  ) then
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
  end if;
end $w2g_rls_driver_locations$;

-- ---------------------------------------------------------------------------
-- Trigger helper: search_path fix (Supabase advisor)
-- ---------------------------------------------------------------------------
do $w2g_set_search_path$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'update_updated_at_column'
      and p.prokind = 'f'
  ) then
    alter function public.update_updated_at_column() set search_path to public;
  end if;
end $w2g_set_search_path$;

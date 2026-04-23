-- Align profiles.tenant_id with public.tenants(id) (text) when the operational catalog exists.
-- On lean remotes (no tenants/pricing stack), this migration is a no-op.

do $w2g_profiles_tenant_fk$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'pricing_rules'
  ) then
    drop policy if exists pricing_rules_tenant_select on public.pricing_rules;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'vehicle_type_configs'
  ) then
    drop policy if exists vehicle_type_configs_tenant_select on public.vehicle_type_configs;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  )
  and exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'tenants'
  ) then
    alter table public.profiles
      alter column tenant_id type text using (tenant_id::text);

    alter table public.profiles
      drop constraint if exists profiles_tenant_id_fkey;

    alter table public.profiles
      add constraint profiles_tenant_id_fkey
      foreign key (tenant_id) references public.tenants (id)
      on update cascade
      on delete set null;

    comment on column public.profiles.tenant_id is 'Tenant scope; must match public.tenants.id (same as pricing_rules.tenant_id).';
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'pricing_rules'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pricing_rules'
      and column_name = 'tenant_id'
  ) then
    create policy pricing_rules_tenant_select
      on public.pricing_rules
      for select
      to authenticated
      using (
        tenant_id is not distinct from (
          select p.tenant_id from public.profiles p where p.id = auth.uid()
        )
      );
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'vehicle_type_configs'
  )
  and exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'pricing_rules'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicle_type_configs'
      and column_name = 'pricing_rule_id'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pricing_rules'
      and column_name = 'tenant_id'
  ) then
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
              select p.tenant_id from public.profiles p where p.id = auth.uid()
            )
        )
      );
  end if;
end $w2g_profiles_tenant_fk$;

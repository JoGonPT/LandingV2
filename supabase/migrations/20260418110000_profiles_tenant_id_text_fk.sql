-- Align profiles.tenant_id with public.tenants(id) (text) and public.pricing_rules(tenant_id).
-- Prefer text + FK over uuid: same type as tenants.id / pricing_rules; RLS compares without casts.
-- Policies on pricing_rules / vehicle_type_configs reference profiles.tenant_id — drop, alter, recreate.

drop policy if exists pricing_rules_tenant_select on public.pricing_rules;
drop policy if exists vehicle_type_configs_tenant_select on public.vehicle_type_configs;

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

create policy pricing_rules_tenant_select
  on public.pricing_rules
  for select
  to authenticated
  using (
    tenant_id is not distinct from (
      select p.tenant_id from public.profiles p where p.id = auth.uid()
    )
  );

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

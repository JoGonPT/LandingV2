-- Partner B2B credit lines (EUR). Replaces legacy `partners` (tenant-scoped id PK) when present.
-- Existing tenants: data is copied from `partner_credits` when that table exists (after base table exists).

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'partners'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partners'
      and column_name = 'slug'
  ) then
    alter table public.bookings drop constraint if exists bookings_partner_id_fkey;
    alter table public.partners drop constraint if exists partners_tenant_id_fkey;
    drop table public.partners;

    create table public.partners (
      slug text primary key,
      display_name text not null,
      partner_kind text not null default 'Partner',
      credit_limit numeric not null default 0 check (credit_limit >= 0),
      current_usage numeric not null default 0 check (current_usage >= 0),
      commission_rate numeric not null default 0 check (commission_rate >= 0 and commission_rate <= 100),
      pricing_model text not null default 'MARKUP' check (pricing_model in ('MARKUP', 'NET_PRICE')),
      total_commissions_earned numeric not null default 0 check (total_commissions_earned >= 0),
      updated_at timestamptz not null default now()
    );

    create index partners_updated_at_idx on public.partners (updated_at desc);

    comment on table public.partners is 'B2B partner credit limits and on-account usage (EUR); synced from Way2Go partner portal.';
    comment on column public.partners.commission_rate is 'Partner commission % applied to CRM quote (0–100).';
    comment on column public.partners.pricing_model is 'MARKUP: retail = CRM * (1+rate); NET_PRICE: retail = CRM, net settlement CRM * (1-rate).';
    comment on column public.partners.total_commissions_earned is 'Running total of partner earnings credited on completed bookings (EUR).';

    alter table public.bookings
      add constraint bookings_partner_id_fkey
      foreign key (partner_id) references public.partners (slug) on delete set null;

  end if;
end $$;

create table if not exists public.partners (
  slug text primary key,
  display_name text not null,
  partner_kind text not null default 'Partner',
  credit_limit numeric not null default 0 check (credit_limit >= 0),
  current_usage numeric not null default 0 check (current_usage >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists partners_updated_at_idx on public.partners (updated_at desc);

comment on table public.partners is 'B2B partner credit limits and on-account usage (EUR); synced from Way2Go partner portal.';

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'partner_credits'
  ) then
    insert into public.partners (slug, display_name, partner_kind, credit_limit, current_usage, updated_at)
    select
      pc.slug,
      pc.display_name,
      'Partner',
      pc.credit_limit,
      pc.current_usage,
      coalesce(pc.updated_at, now())
    from public.partner_credits pc
    on conflict (slug) do update set
      display_name = excluded.display_name,
      credit_limit = excluded.credit_limit,
      current_usage = excluded.current_usage,
      updated_at = excluded.updated_at;
  end if;
end $$;

-- RLS: explicit policy for service_role; anon/authenticated have no policies (deny via API).
alter table public.partners enable row level security;

drop policy if exists partners_service_role_all on public.partners;

create policy partners_service_role_all
  on public.partners
  for all
  to service_role
  using (true)
  with check (true);

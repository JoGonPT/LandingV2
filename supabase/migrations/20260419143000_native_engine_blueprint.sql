-- Native engine blueprint (Phase 3): pricing + simplified availability.

create table if not exists public.rate_cards (
  id text primary key,
  vehicle_class text not null,
  base_fee numeric(10,2) not null default 0,
  per_km_rate numeric(10,4) not null,
  min_fare numeric(10,2) not null,
  currency text not null default 'EUR',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_class, currency)
);

create table if not exists public.fleet_availability (
  id text primary key,
  vehicle_class text not null,
  is_available boolean not null default true,
  available_units integer not null default 0,
  available_from timestamptz,
  available_to timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rate_cards_vehicle_class_idx on public.rate_cards (vehicle_class);
create index if not exists rate_cards_active_idx on public.rate_cards (active);
create index if not exists fleet_availability_vehicle_class_idx on public.fleet_availability (vehicle_class);
create index if not exists fleet_availability_is_available_idx on public.fleet_availability (is_available);

alter table public.rate_cards enable row level security;
alter table public.fleet_availability enable row level security;

drop policy if exists rate_cards_service_role_all on public.rate_cards;
drop policy if exists rate_cards_admin_all on public.rate_cards;
drop policy if exists fleet_availability_service_role_all on public.fleet_availability;
drop policy if exists fleet_availability_admin_all on public.fleet_availability;

create policy rate_cards_service_role_all
  on public.rate_cards
  for all
  to service_role
  using (true)
  with check (true);

create policy rate_cards_admin_all
  on public.rate_cards
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

create policy fleet_availability_service_role_all
  on public.fleet_availability
  for all
  to service_role
  using (true)
  with check (true);

create policy fleet_availability_admin_all
  on public.fleet_availability
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

-- PT market seed (shadow mode baseline for pricing comparison)
insert into public.rate_cards (id, vehicle_class, base_fee, per_km_rate, min_fare, currency, active)
values
  ('rc_business_eur_pt', 'BUSINESS', 8.00, 1.20, 20.00, 'EUR', true),
  ('rc_first_eur_pt', 'FIRST', 12.00, 1.80, 30.00, 'EUR', true),
  ('rc_van_eur_pt', 'VAN', 10.00, 1.50, 28.00, 'EUR', true)
on conflict (id) do update
set
  vehicle_class = excluded.vehicle_class,
  base_fee = excluded.base_fee,
  per_km_rate = excluded.per_km_rate,
  min_fare = excluded.min_fare,
  currency = excluded.currency,
  active = excluded.active,
  updated_at = now();

insert into public.fleet_availability (id, vehicle_class, is_available, available_units, notes)
values
  ('fa_business_pt', 'BUSINESS', true, 6, 'PT shadow baseline'),
  ('fa_first_pt', 'FIRST', true, 2, 'PT shadow baseline'),
  ('fa_van_pt', 'VAN', true, 4, 'PT shadow baseline')
on conflict (id) do update
set
  vehicle_class = excluded.vehicle_class,
  is_available = excluded.is_available,
  available_units = excluded.available_units,
  notes = excluded.notes,
  updated_at = now();

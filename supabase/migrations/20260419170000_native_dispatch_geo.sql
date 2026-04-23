-- Native engine phase 4: local dispatch + geolocation basics.
-- Uses `native_driver_booking_assignments` (not `driver_booking_assignments`) so the
-- existing CRM proxy table from 20260417120000_driver_booking_assignments.sql stays intact.

create table if not exists public.fleet_vehicles (
  id text primary key,
  vehicle_class text not null,
  plate text unique,
  brand text,
  model text,
  year integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id text primary key,
  full_name text not null,
  phone text,
  email text,
  status text not null default 'ACTIVE',
  vehicle_class text,
  fleet_vehicle_id text references public.fleet_vehicles(id) on delete set null,
  current_lat double precision,
  current_lng double precision,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lean/legacy `public.drivers` may already exist without native-dispatch columns; CREATE TABLE IF NOT EXISTS is a no-op.
alter table public.drivers add column if not exists full_name text;
alter table public.drivers add column if not exists phone text;
alter table public.drivers add column if not exists email text;
alter table public.drivers add column if not exists status text;
alter table public.drivers add column if not exists vehicle_class text;
alter table public.drivers add column if not exists fleet_vehicle_id text;
alter table public.drivers add column if not exists current_lat double precision;
alter table public.drivers add column if not exists current_lng double precision;
alter table public.drivers add column if not exists active boolean;
alter table public.drivers add column if not exists created_at timestamptz;
alter table public.drivers add column if not exists updated_at timestamptz;

update public.drivers set status = coalesce(status, 'ACTIVE');
update public.drivers set active = coalesce(active, true);
update public.drivers set created_at = coalesce(created_at, now());
update public.drivers set updated_at = coalesce(updated_at, now());

create table if not exists public.native_driver_booking_assignments (
  id text primary key,
  booking_id text not null references public.booking_orders(id) on delete cascade,
  driver_id text not null references public.drivers(id) on delete cascade,
  vehicle_id text references public.fleet_vehicles(id) on delete set null,
  status text not null default 'ASSIGNED',
  assigned_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fleet_vehicles_vehicle_class_idx on public.fleet_vehicles (vehicle_class);
create index if not exists fleet_vehicles_active_idx on public.fleet_vehicles (active);
create index if not exists drivers_status_idx on public.drivers (status);
create index if not exists drivers_vehicle_class_idx on public.drivers (vehicle_class);
create index if not exists drivers_active_idx on public.drivers (active);
create index if not exists drivers_geo_idx on public.drivers (current_lat, current_lng);
create index if not exists native_dba_booking_idx on public.native_driver_booking_assignments (booking_id);
create index if not exists native_dba_driver_idx on public.native_driver_booking_assignments (driver_id);

alter table public.fleet_vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.native_driver_booking_assignments enable row level security;

drop policy if exists fleet_vehicles_service_role_all on public.fleet_vehicles;
drop policy if exists fleet_vehicles_admin_all on public.fleet_vehicles;
drop policy if exists drivers_service_role_all on public.drivers;
drop policy if exists drivers_admin_all on public.drivers;
drop policy if exists native_dba_service_role_all on public.native_driver_booking_assignments;
drop policy if exists native_dba_admin_all on public.native_driver_booking_assignments;

create policy fleet_vehicles_service_role_all
  on public.fleet_vehicles
  for all
  to service_role
  using (true)
  with check (true);

create policy fleet_vehicles_admin_all
  on public.fleet_vehicles
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

create policy drivers_service_role_all
  on public.drivers
  for all
  to service_role
  using (true)
  with check (true);

create policy drivers_admin_all
  on public.drivers
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

create policy native_dba_service_role_all
  on public.native_driver_booking_assignments
  for all
  to service_role
  using (true)
  with check (true);

create policy native_dba_admin_all
  on public.native_driver_booking_assignments
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

-- PostgREST: join drivers + vehicles for assignment scoring (matches booking-engine SupabaseService).
create or replace view public.driver_vehicle_live
with (security_invoker = true) as
select
  d.id as driver_id,
  coalesce(d.fleet_vehicle_id, fv.id) as vehicle_id,
  d.current_lat,
  d.current_lng,
  coalesce(fa.available_units, 1)::integer as available_units,
  d.active,
  coalesce(fv.vehicle_class, d.vehicle_class) as vehicle_class
from public.drivers d
left join public.fleet_vehicles fv on fv.id = d.fleet_vehicle_id
left join public.fleet_availability fa on fa.vehicle_class = coalesce(fv.vehicle_class, d.vehicle_class);

grant select on public.driver_vehicle_live to service_role;
grant select on public.driver_vehicle_live to authenticated;

-- Legacy CRM `public.drivers` may enforce NOT NULL on columns the native seed does not fill.
do $legacy_drivers_drop_not_null_for_seed$
begin
  if exists (
    select 1 from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public' and c.relname = 'drivers' and a.attname = 'userId' and not a.attisdropped and a.attnotnull
  ) then execute 'alter table public.drivers alter column "userId" drop not null'; end if;
  if exists (
    select 1 from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public' and c.relname = 'drivers' and a.attname = 'updatedAt' and not a.attisdropped and a.attnotnull
  ) then execute 'alter table public.drivers alter column "updatedAt" drop not null'; end if;
  if exists (
    select 1 from pg_attribute a join pg_class c on a.attrelid = c.oid join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public' and c.relname = 'drivers' and a.attname = 'createdAt' and not a.attisdropped and a.attnotnull
  ) then execute 'alter table public.drivers alter column "createdAt" drop not null'; end if;
end $legacy_drivers_drop_not_null_for_seed$;

-- Baseline seed for PT market dispatch testing.
insert into public.fleet_vehicles (id, vehicle_class, plate, brand, model, year, active)
values
  ('veh_business_001', 'BUSINESS', '00-AA-01', 'Mercedes', 'E Class', 2022, true),
  ('veh_business_002', 'BUSINESS', '00-AA-02', 'BMW', '5 Series', 2021, true),
  ('veh_van_001', 'VAN', '00-BB-01', 'Mercedes', 'V Class', 2020, true)
on conflict (id) do update
set
  vehicle_class = excluded.vehicle_class,
  plate = excluded.plate,
  brand = excluded.brand,
  model = excluded.model,
  year = excluded.year,
  active = excluded.active,
  updated_at = now();

insert into public.drivers (id, full_name, phone, email, status, vehicle_class, fleet_vehicle_id, current_lat, current_lng, active)
values
  ('drv_001', 'Driver Lisboa Centro', '+351910000001', 'drv1@way2go.pt', 'ACTIVE', 'BUSINESS', 'veh_business_001', 38.7223, -9.1393, true),
  ('drv_002', 'Driver Lisboa Norte', '+351910000002', 'drv2@way2go.pt', 'ACTIVE', 'BUSINESS', 'veh_business_002', 38.7600, -9.1300, true),
  ('drv_003', 'Driver Lisboa Van', '+351910000003', 'drv3@way2go.pt', 'ACTIVE', 'VAN', 'veh_van_001', 38.7400, -9.1500, true)
on conflict (id) do update
set
  full_name = excluded.full_name,
  phone = excluded.phone,
  email = excluded.email,
  status = excluded.status,
  vehicle_class = excluded.vehicle_class,
  fleet_vehicle_id = excluded.fleet_vehicle_id,
  current_lat = excluded.current_lat,
  current_lng = excluded.current_lng,
  active = excluded.active,
  updated_at = now();

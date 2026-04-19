-- Booking engine mirror tables (Hexagonal Phase 2)
-- Stores a unified local copy of bookings regardless of underlying provider.

create table if not exists public.booking_orders (
  id text primary key,
  public_reference text unique,
  provider text not null check (provider in ('TRANSFER_CRM', 'WAY2GO_NATIVE')),
  provider_booking_id text,
  status text not null,
  idempotency_key text not null unique,
  failover_reason text,
  request_payload jsonb not null default '{}'::jsonb,
  provider_response jsonb,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_status_events (
  id bigserial primary key,
  booking_id text not null references public.booking_orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  travel_status text,
  actor text not null default 'system',
  source text not null default 'booking_engine',
  provider text not null check (provider in ('TRANSFER_CRM', 'WAY2GO_NATIVE')),
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists booking_orders_idempotency_idx on public.booking_orders (idempotency_key);
create index if not exists booking_orders_status_idx on public.booking_orders (status);
create index if not exists booking_orders_provider_booking_idx on public.booking_orders (provider_booking_id);
create index if not exists booking_status_events_booking_id_idx on public.booking_status_events (booking_id);
create index if not exists booking_status_events_occurred_at_idx on public.booking_status_events (occurred_at desc);

alter table public.booking_orders enable row level security;
alter table public.booking_status_events enable row level security;

drop policy if exists booking_orders_service_role_all on public.booking_orders;
drop policy if exists booking_orders_admin_all on public.booking_orders;
drop policy if exists booking_status_events_service_role_all on public.booking_status_events;
drop policy if exists booking_status_events_admin_all on public.booking_status_events;

create policy booking_orders_service_role_all
  on public.booking_orders
  for all
  to service_role
  using (true)
  with check (true);

create policy booking_orders_admin_all
  on public.booking_orders
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

create policy booking_status_events_service_role_all
  on public.booking_status_events
  for all
  to service_role
  using (true)
  with check (true);

create policy booking_status_events_admin_all
  on public.booking_status_events
  for all
  to authenticated
  using (get_my_role() = 'ADMIN')
  with check (get_my_role() = 'ADMIN');

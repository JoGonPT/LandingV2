-- B2C bookings created via Nest POST /api/public/book (TransferCRM sync may succeed or leave FAILED_SYNC).

create table if not exists public.public_bookings (
  id uuid primary key,
  status text not null check (status in ('PENDING', 'SYNCED', 'FAILED_SYNC')),
  pickup text not null,
  dropoff text not null,
  trip_date date not null,
  trip_time text not null,
  datetime_raw text not null,
  passengers integer not null check (passengers >= 1),
  vehicle_type text not null,
  customer jsonb not null,
  price numeric,
  currency text,
  distance_km numeric,
  estimated_time_min integer,
  crm_booking_id text,
  crm_order_number text,
  crm_status text,
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_public_bookings_status on public.public_bookings (status);
create index if not exists idx_public_bookings_crm_booking_id on public.public_bookings (crm_booking_id);

alter table public.public_bookings enable row level security;

drop policy if exists public_bookings_service_role_all on public.public_bookings;

create policy public_bookings_service_role_all
  on public.public_bookings
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.public_bookings is 'Landing B2C booking rows; CRM id stored after successful postBook.';

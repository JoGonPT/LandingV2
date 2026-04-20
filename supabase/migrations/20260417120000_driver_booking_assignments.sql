-- Maps TransferCRM booking ids to driver keys (same value as DRIVER_TRANSFERCRM_ID or a fleet key).
-- Populated by ops / admin; driver PWA uses service_role via Next.js to read assignments.

create table if not exists public.driver_booking_assignments (
  transfercrm_booking_id text not null,
  driver_key text not null,
  created_at timestamptz not null default now(),
  primary key (transfercrm_booking_id)
);

create index if not exists idx_driver_booking_assignments_driver_key
  on public.driver_booking_assignments (driver_key);

alter table public.driver_booking_assignments enable row level security;

drop policy if exists driver_booking_assignments_service_role_all on public.driver_booking_assignments;

create policy driver_booking_assignments_service_role_all
  on public.driver_booking_assignments
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.driver_booking_assignments is 'Optional proxy: link CRM booking id to driver_key when CRM assignment fields are partner-centric.';

-- Audit queue for downstream sync failures after upstream success (manual / automated replay).

create table if not exists public.sync_errors (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  severity text not null default 'error' check (severity in ('error', 'warning')),
  context jsonb not null default '{}',
  error_message text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);

create index if not exists idx_sync_errors_unresolved on public.sync_errors (created_at desc)
  where resolved_at is null;

create index if not exists idx_sync_errors_source on public.sync_errors (source, created_at desc);

alter table public.sync_errors enable row level security;

drop policy if exists sync_errors_service_role_all on public.sync_errors;

create policy sync_errors_service_role_all
  on public.sync_errors
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.sync_errors is
  'Failed sync steps after upstream OK (e.g. public_bookings patch after CRM travel_status update).';

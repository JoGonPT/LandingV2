-- Driver PWA: map Supabase Auth user -> TransferCRM chauffeur id; allow each user to read own profile (for RLS helpers / app).

alter table public.profiles
  add column if not exists transfercrm_driver_id text;

comment on column public.profiles.transfercrm_driver_id is
  'TransferCRM chauffeur id for driver portal API scope. Set for rows with driver role; optional env DRIVER_TRANSFERCRM_ID remains rollout fallback.';

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

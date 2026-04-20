-- Holds BookingRequestDto + PaymentIntent id between create-intent and Stripe webhook (metadata size limits).

create table if not exists public.stripe_checkout_sessions (
  id uuid primary key,
  stripe_payment_intent_id text unique,
  dto jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  error_message text,
  result jsonb,
  public_booking_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stripe_checkout_sessions_pi on public.stripe_checkout_sessions (stripe_payment_intent_id);

alter table public.public_bookings
  add column if not exists stripe_payment_intent_id text;

create unique index if not exists idx_public_bookings_stripe_pi_unique
  on public.public_bookings (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

alter table public.stripe_checkout_sessions enable row level security;

drop policy if exists stripe_checkout_sessions_service_role_all on public.stripe_checkout_sessions;

create policy stripe_checkout_sessions_service_role_all
  on public.stripe_checkout_sessions
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.stripe_checkout_sessions is 'B2C Stripe Elements: stores DTO until payment_intent.succeeded webhook creates CRM booking.';

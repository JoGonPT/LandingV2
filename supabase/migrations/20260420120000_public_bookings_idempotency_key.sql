alter table public.public_bookings
  add column if not exists idempotency_key text;

create unique index if not exists idx_public_bookings_idempotency_key_unique
  on public.public_bookings (idempotency_key)
  where idempotency_key is not null;

comment on column public.public_bookings.idempotency_key is
  'Optional client Idempotency-Key (B2C) for deduplicated public book requests.';

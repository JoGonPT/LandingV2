alter table public.public_bookings
  add column if not exists payment_method text;

alter table public.public_bookings
  add column if not exists partner_slug text;

create index if not exists idx_public_bookings_partner_slug on public.public_bookings (partner_slug);

comment on column public.public_bookings.payment_method is 'e.g. account | stripe (B2B/B2C).';
comment on column public.public_bookings.partner_slug is 'B2B partner slug when booking is attributed to a partner.';

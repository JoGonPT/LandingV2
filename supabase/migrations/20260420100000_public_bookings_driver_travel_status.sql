alter table public.public_bookings
  add column if not exists driver_travel_status text;

comment on column public.public_bookings.driver_travel_status is
  'Chauffeur trip phase from driver PWA (e.g. ARRIVED, STARTED, COMPLETED); kept in sync with TransferCRM travel_status when a public_bookings row exists.';

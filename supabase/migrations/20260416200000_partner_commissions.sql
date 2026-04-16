-- Tiered commissions & B2B pricing model (EUR partner commercial terms).

alter table public.partners
  add column if not exists commission_rate numeric not null default 0
    check (commission_rate >= 0 and commission_rate <= 100),
  add column if not exists pricing_model text not null default 'MARKUP'
    check (pricing_model in ('MARKUP', 'NET_PRICE')),
  add column if not exists total_commissions_earned numeric not null default 0
    check (total_commissions_earned >= 0);

comment on column public.partners.commission_rate is 'Partner commission % applied to CRM quote (0–100).';
comment on column public.partners.pricing_model is 'MARKUP: retail = CRM * (1+rate); NET_PRICE: retail = CRM, net settlement CRM * (1-rate).';
comment on column public.partners.total_commissions_earned is 'Running total of partner earnings credited on completed bookings (EUR).';

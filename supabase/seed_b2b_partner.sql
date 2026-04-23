-- Optional: run in Supabase SQL Editor when `public.partners` has no B2B portal rows.
-- Then set the same slug + token in your app env if you authenticate via /api/partner/auth, or rely on PostgREST + service role.
-- Rotate `token` before production.

insert into public.partners (slug, name, display_name, token, is_active, partner_kind)
select
  'way2go-demo',
  'Way2Go Demo Partner',
  'Way2Go Demo Partner',
  'w2g_dev_b2b_partner_token_change_before_prod',
  true,
  'Hotel'
where not exists (
  select 1 from public.partners p where p.slug = 'way2go-demo'
);

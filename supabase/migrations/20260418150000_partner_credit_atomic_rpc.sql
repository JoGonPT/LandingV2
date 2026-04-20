-- Atomic credit consume/release for partner pay-on-account (prevents double-spend on concurrent requests).

create or replace function public.try_consume_partner_credit(p_slug text, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if p_slug is null or trim(p_slug) = '' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_slug');
  end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  end if;

  update public.partners
  set
    current_usage = current_usage + p_amount,
    updated_at = now()
  where slug = trim(p_slug)
    and credit_limit >= current_usage + p_amount
  returning
    slug,
    display_name,
    credit_limit,
    current_usage,
    commission_rate,
    pricing_model,
    total_commissions_earned
  into r;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_credit_or_missing');
  end if;

  return jsonb_build_object(
    'ok', true,
    'slug', r.slug,
    'display_name', r.display_name,
    'credit_limit', r.credit_limit,
    'current_usage', r.current_usage,
    'commission_rate', r.commission_rate,
    'pricing_model', r.pricing_model,
    'total_commissions_earned', r.total_commissions_earned
  );
end;
$$;

create or replace function public.release_partner_credit(p_slug text, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if p_slug is null or trim(p_slug) = '' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_slug');
  end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  end if;

  update public.partners
  set
    current_usage = greatest(0::numeric, current_usage - p_amount),
    updated_at = now()
  where slug = trim(p_slug)
  returning
    slug,
    display_name,
    credit_limit,
    current_usage,
    commission_rate,
    pricing_model,
    total_commissions_earned
  into r;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'partner_not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'slug', r.slug,
    'display_name', r.display_name,
    'credit_limit', r.credit_limit,
    'current_usage', r.current_usage,
    'commission_rate', r.commission_rate,
    'pricing_model', r.pricing_model,
    'total_commissions_earned', r.total_commissions_earned
  );
end;
$$;

revoke all on function public.try_consume_partner_credit(text, numeric) from public;
revoke all on function public.release_partner_credit(text, numeric) from public;
grant execute on function public.try_consume_partner_credit(text, numeric) to service_role;
grant execute on function public.release_partner_credit(text, numeric) to service_role;

comment on function public.try_consume_partner_credit is 'Atomically increases partners.current_usage if within credit_limit; used for B2B account bookings.';

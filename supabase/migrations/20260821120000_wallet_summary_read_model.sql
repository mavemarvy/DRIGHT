create or replace function public.get_wallet_summary()
returns table (
  wallet_id uuid,
  public_wallet_id text,
  currency_code text,
  status text,
  available_balance numeric,
  pending_balance numeric,
  total_balance numeric,
  pending_payout_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    w.id as wallet_id,
    w.wallet_id as public_wallet_id,
    w.currency_code,
    w.status,
    coalesce(wb.balance, 0)::numeric as available_balance,
    coalesce((select sum(p.amount) from public.payouts p where p.wallet_id = w.id and p.user_id = auth.uid() and p.status in ('pending','processing')), 0)::numeric as pending_balance,
    (coalesce(wb.balance, 0) + coalesce((select sum(p.amount) from public.payouts p where p.wallet_id = w.id and p.user_id = auth.uid() and p.status in ('pending','processing')), 0))::numeric as total_balance,
    (select count(*) from public.payouts p where p.wallet_id = w.id and p.user_id = auth.uid() and p.status in ('pending','processing')) as pending_payout_count
  from public.wallets w
  left join public.wallet_balances wb on wb.id = w.id
  where w.user_id = auth.uid()
  order by w.currency_code;
$$;

revoke all on function public.get_wallet_summary() from public;
grant execute on function public.get_wallet_summary() to authenticated;

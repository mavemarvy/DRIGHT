-- DRIGHT Phase 4A: Wallet, commission settlement, payout and referral financial foundation
-- Builds on the existing commerce/affiliate schema. No duplicate order or transaction layer.

create sequence if not exists public.wallet_public_id_seq;
create sequence if not exists public.payout_public_id_seq;
create sequence if not exists public.referral_public_id_seq;
create sequence if not exists public.referral_reward_public_id_seq;
create sequence if not exists public.wallet_entry_public_id_seq;

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  wallet_id text not null unique default ('DR-WAL-' || lpad(nextval('public.wallet_public_id_seq')::text, 8, '0')),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency_code text not null default 'USD',
  status text not null default 'active' check (status in ('active','frozen','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, currency_code)
);

create table if not exists public.wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_id text not null unique default ('DR-WTX-' || lpad(nextval('public.wallet_entry_public_id_seq')::text, 8, '0')),
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  entry_type text not null check (entry_type in ('commission','referral_reward','sale_proceeds','refund','payout','payout_reversal','adjustment','bonus','fee','chargeback')),
  direction text not null check (direction in ('credit','debit')),
  amount numeric(20,8) not null check (amount > 0),
  currency_code text not null,
  reference_type text,
  reference_id text,
  idempotency_key text unique,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists wallet_ledger_user_created_idx on public.wallet_ledger_entries(user_id, created_at desc);
create index if not exists wallet_ledger_wallet_created_idx on public.wallet_ledger_entries(wallet_id, created_at desc);
create index if not exists wallet_ledger_reference_idx on public.wallet_ledger_entries(reference_type, reference_id);

create table if not exists public.referral_programs (
  id uuid primary key default gen_random_uuid(),
  program_id text not null unique default ('DR-REF-' || lpad(nextval('public.referral_public_id_seq')::text, 8, '0')),
  name text not null,
  status text not null default 'active' check (status in ('draft','active','paused','ended')),
  level_1_percent numeric(8,4) not null default 10 check (level_1_percent between 0 and 100),
  level_2_percent numeric(8,4) not null default 5 check (level_2_percent between 0 and 100),
  level_3_percent numeric(8,4) not null default 1 check (level_3_percent between 0 and 100),
  expiration_days integer check (expiration_days is null or expiration_days >= 0),
  min_reward_amount numeric(20,8) not null default 0.05 check (min_reward_amount >= 0),
  max_reward_amount numeric(20,8) not null default 10000 check (max_reward_amount >= min_reward_amount),
  qualifying_event text not null default 'first_qualifying_purchase',
  configured_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists referral_one_active_program_idx on public.referral_programs(status) where status = 'active';

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referral_id text not null unique default ('DR-RFL-' || lpad(nextval('public.referral_public_id_seq')::text, 8, '0')),
  program_id uuid not null references public.referral_programs(id),
  referrer_user_id uuid not null references auth.users(id),
  referred_user_id uuid not null references auth.users(id),
  parent_referral_id uuid references public.referrals(id),
  level smallint not null check (level between 1 and 3),
  status text not null default 'pending' check (status in ('pending','qualified','rewarded','expired','reversed','blocked')),
  qualifying_event text,
  qualifying_order_id uuid references public.orders(id),
  expires_at timestamptz,
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (referrer_user_id <> referred_user_id),
  unique(program_id, referrer_user_id, referred_user_id, level)
);
create index if not exists referrals_referred_idx on public.referrals(referred_user_id, created_at desc);
create index if not exists referrals_referrer_idx on public.referrals(referrer_user_id, created_at desc);
create index if not exists referrals_order_idx on public.referrals(qualifying_order_id);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  reward_id text not null unique default ('DR-RWD-' || lpad(nextval('public.referral_reward_public_id_seq')::text, 8, '0')),
  referral_id uuid not null references public.referrals(id) on delete restrict,
  beneficiary_user_id uuid not null references auth.users(id),
  level smallint not null check (level between 1 and 3),
  reward_percent numeric(8,4) not null check (reward_percent between 0 and 100),
  basis_amount numeric(20,8) not null check (basis_amount >= 0),
  reward_amount numeric(20,8) not null check (reward_amount >= 0),
  currency_code text not null,
  qualifying_order_id uuid references public.orders(id),
  status text not null default 'pending' check (status in ('pending','available','paid','reversed','cancelled')),
  available_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(referral_id, beneficiary_user_id)
);
create index if not exists referral_rewards_beneficiary_idx on public.referral_rewards(beneficiary_user_id, created_at desc);
create index if not exists referral_rewards_order_idx on public.referral_rewards(qualifying_order_id);

alter table public.payouts add column if not exists payout_id text;
alter table public.payouts add column if not exists wallet_id uuid references public.wallets(id);
alter table public.payouts add column if not exists fee_amount numeric(20,8) not null default 0;
alter table public.payouts add column if not exists net_amount numeric(20,8);
alter table public.payouts add column if not exists approved_by uuid references auth.users(id);
alter table public.payouts add column if not exists approved_at timestamptz;
alter table public.payouts add column if not exists metadata jsonb not null default '{}'::jsonb;
update public.payouts set payout_id = 'DR-PAY-' || lpad(nextval('public.payout_public_id_seq')::text, 8, '0') where payout_id is null;
alter table public.payouts alter column payout_id set not null;
create unique index if not exists payouts_payout_id_unique on public.payouts(payout_id);

alter table public.commissions add column if not exists available_at timestamptz;
alter table public.commissions add column if not exists paid_at timestamptz;
alter table public.commissions add column if not exists reversed_at timestamptz;
create index if not exists commissions_affiliate_status_idx on public.commissions(affiliate_user_id, status, created_at desc);

create or replace view public.wallet_balances as
select w.id,w.wallet_id,w.user_id,w.currency_code,w.status,
coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0)::numeric(20,8) as balance
from public.wallets w left join public.wallet_ledger_entries e on e.wallet_id=w.id
group by w.id,w.wallet_id,w.user_id,w.currency_code,w.status;
alter view public.wallet_balances set (security_invoker = true);

create or replace function public.ensure_wallet(p_currency_code text default 'USD')
returns public.wallets language plpgsql security invoker set search_path=public as $$
declare v_wallet public.wallets;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.wallets(user_id,currency_code) values(auth.uid(),upper(trim(p_currency_code))) on conflict(user_id,currency_code) do nothing;
  select * into v_wallet from public.wallets where user_id=auth.uid() and currency_code=upper(trim(p_currency_code));
  return v_wallet;
end; $$;

grant execute on function public.ensure_wallet(text) to authenticated;

create or replace function public.request_wallet_payout(p_wallet_id uuid,p_payout_account_id uuid,p_amount numeric)
returns public.payouts language plpgsql security definer set search_path=public as $$
declare v_wallet public.wallets; v_balance numeric; v_payout public.payouts;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_amount <= 0 then raise exception 'Payout amount must be greater than zero'; end if;
  select * into v_wallet from public.wallets where id=p_wallet_id and user_id=auth.uid() for update;
  if not found then raise exception 'Wallet not found'; end if;
  if v_wallet.status <> 'active' then raise exception 'Wallet is not available for payouts'; end if;
  select coalesce(balance,0) into v_balance from public.wallet_balances where id=p_wallet_id;
  if p_amount < 5 then raise exception 'Minimum payout is 5'; end if;
  if p_amount > v_balance then raise exception 'Insufficient available balance'; end if;
  insert into public.payouts(user_id,payout_account_id,wallet_id,amount,currency_code,status,net_amount)
  values(auth.uid(),p_payout_account_id,p_wallet_id,p_amount,v_wallet.currency_code,'pending',p_amount) returning * into v_payout;
  insert into public.wallet_ledger_entries(wallet_id,user_id,entry_type,direction,amount,currency_code,reference_type,reference_id,idempotency_key,description)
  values(v_wallet.id,auth.uid(),'payout','debit',p_amount,v_wallet.currency_code,'payout',v_payout.id::text,'payout:'||v_payout.id::text,'Payout requested');
  return v_payout;
end; $$;
revoke all on function public.request_wallet_payout(uuid,uuid,numeric) from public,anon;
grant execute on function public.request_wallet_payout(uuid,uuid,numeric) to authenticated;

alter table public.wallets enable row level security;
alter table public.wallet_ledger_entries enable row level security;
alter table public.referral_programs enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;

create policy wallets_select_own_or_super on public.wallets for select to authenticated using ((select auth.uid())=user_id or (select public.is_super_admin((select auth.uid()))));
create policy wallet_ledger_select_own_or_super on public.wallet_ledger_entries for select to authenticated using ((select auth.uid())=user_id or (select public.is_super_admin((select auth.uid()))));
create policy referral_programs_select_active on public.referral_programs for select to authenticated using (status='active' or (select public.is_super_admin((select auth.uid()))));
create policy referrals_select_party_or_super on public.referrals for select to authenticated using ((select auth.uid()) in (referrer_user_id,referred_user_id) or (select public.is_super_admin((select auth.uid()))));
create policy referral_rewards_select_beneficiary_or_super on public.referral_rewards for select to authenticated using ((select auth.uid())=beneficiary_user_id or (select public.is_super_admin((select auth.uid()))));

insert into public.referral_programs(name,status,level_1_percent,level_2_percent,level_3_percent,expiration_days,min_reward_amount,max_reward_amount,qualifying_event)
select 'DRIGHT Standard Referral Program','active',10,5,1,14,0.05,10000,'first_qualifying_purchase'
where not exists(select 1 from public.referral_programs where status='active');

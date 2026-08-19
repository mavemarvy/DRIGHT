-- DRIGHT Phase 5C: Universal ID System
-- Stable, human-shareable IDs coexist with internal UUID primary keys.
-- Existing public IDs are preserved and registered; nothing is re-keyed.

create sequence if not exists public.universal_user_id_seq;
create sequence if not exists public.universal_listing_id_seq;
create sequence if not exists public.universal_order_id_seq;
create sequence if not exists public.universal_transaction_id_seq;
create sequence if not exists public.universal_referral_id_seq;
create sequence if not exists public.universal_affiliate_id_seq;
create sequence if not exists public.universal_community_id_seq;
create sequence if not exists public.universal_job_id_seq;
create sequence if not exists public.universal_case_id_seq;
create sequence if not exists public.universal_message_id_seq;
create sequence if not exists public.universal_report_id_seq;
create sequence if not exists public.universal_generic_id_seq;

create table if not exists public.universal_entities (
  id uuid primary key default gen_random_uuid(),
  universal_id text not null unique,
  entity_type text not null,
  source_table text not null,
  source_id text not null,
  status text not null default 'ACTIVE',
  parent_universal_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_table, source_id)
);

create index if not exists universal_entities_lookup_id_idx on public.universal_entities(universal_id);
create index if not exists universal_entities_type_idx on public.universal_entities(entity_type, created_at desc);
create index if not exists universal_entities_source_idx on public.universal_entities(source_table, source_id);

alter table public.universal_entities enable row level security;
drop policy if exists universal_entities_admin_select on public.universal_entities;
create policy universal_entities_admin_select on public.universal_entities
for select to authenticated
using (public.is_super_admin(auth.uid()));

-- Add a direct universal_id column only to core tables that already exist.
do $$
declare t text;
begin
  foreach t in array array['profiles','user_profiles','orders','transactions','order_items','order_fulfillments','refund_disputes','referrals','referral_rewards','wallets','wallet_ledger_entries','payouts','commissions'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists universal_id text', t);
      execute format('create unique index if not exists %I on public.%I(universal_id) where universal_id is not null', t || '_universal_id_unique', t);
    end if;
  end loop;
end $$;

-- Preserve existing human IDs where they already exist; generate IDs only where missing.
do $$
begin
  if to_regclass('public.profiles') is not null then
    update public.profiles set universal_id = 'DR-USR-' || lpad(nextval('public.universal_user_id_seq')::text, 6, '0') where universal_id is null;
  end if;
  if to_regclass('public.user_profiles') is not null then
    update public.user_profiles up set universal_id = p.universal_id from public.profiles p where up.user_id = p.id and up.universal_id is null;
  end if;

  if to_regclass('public.orders') is not null then
    update public.orders set universal_id = coalesce(nullif(order_id::text,''), 'DR-ORD-' || to_char(coalesce(created_at,now()),'YYYY') || '-' || lpad(nextval('public.universal_order_id_seq')::text, 6, '0')) where universal_id is null;
  end if;

  if to_regclass('public.transactions') is not null then
    update public.transactions set universal_id = coalesce(nullif(transaction_id::text,''), 'DR-TXN-' || to_char(coalesce(created_at,now()),'YYYY') || '-' || lpad(nextval('public.universal_transaction_id_seq')::text, 6, '0')) where universal_id is null;
  end if;

  if to_regclass('public.order_items') is not null then
    update public.order_items set universal_id = 'DR-OIT-' || lpad(nextval('public.universal_generic_id_seq')::text, 8, '0') where universal_id is null;
  end if;

  if to_regclass('public.order_fulfillments') is not null then
    update public.order_fulfillments set universal_id = coalesce(nullif(fulfillment_id::text,''), 'DR-FUL-' || to_char(coalesce(created_at,now()),'YYYY') || '-' || lpad(nextval('public.universal_generic_id_seq')::text, 6, '0')) where universal_id is null;
  end if;

  if to_regclass('public.refund_disputes') is not null then
    update public.refund_disputes set universal_id = coalesce(nullif(case_id::text,''), 'DR-CSE-' || to_char(coalesce(created_at,now()),'YYYY') || '-' || lpad(nextval('public.universal_case_id_seq')::text, 6, '0')) where universal_id is null;
  end if;

  if to_regclass('public.referrals') is not null then
    update public.referrals set universal_id = referral_id where universal_id is null;
  end if;
  if to_regclass('public.referral_rewards') is not null then
    update public.referral_rewards set universal_id = reward_id where universal_id is null;
  end if;
  if to_regclass('public.wallets') is not null then
    update public.wallets set universal_id = wallet_id where universal_id is null;
  end if;
  if to_regclass('public.wallet_ledger_entries') is not null then
    update public.wallet_ledger_entries set universal_id = entry_id where universal_id is null;
  end if;
  if to_regclass('public.payouts') is not null then
    update public.payouts set universal_id = payout_id where universal_id is null;
  end if;
  if to_regclass('public.commissions') is not null then
    update public.commissions set universal_id = 'DR-AFF-' || lpad(nextval('public.universal_affiliate_id_seq')::text, 6, '0') where universal_id is null;
  end if;
end $$;

-- Register all rows from the core tables. The registry is the canonical cross-entity search index.
insert into public.universal_entities(universal_id,entity_type,source_table,source_id)
select p.universal_id,'USER','profiles',p.id::text from public.profiles p where p.universal_id is not null
on conflict (source_table,source_id) do update set universal_id=excluded.universal_id,updated_at=now();

insert into public.universal_entities(universal_id,entity_type,source_table,source_id)
select o.universal_id,'ORDER','orders',o.id::text from public.orders o where o.universal_id is not null
on conflict (source_table,source_id) do update set universal_id=excluded.universal_id,updated_at=now();

insert into public.universal_entities(universal_id,entity_type,source_table,source_id)
select t.universal_id,'TRANSACTION','transactions',t.id::text from public.transactions t where t.universal_id is not null
on conflict (source_table,source_id) do update set universal_id=excluded.universal_id,updated_at=now();

insert into public.universal_entities(universal_id,entity_type,source_table,source_id)
select r.universal_id,'REFERRAL','referrals',r.id::text from public.referrals r where r.universal_id is not null
on conflict (source_table,source_id) do update set universal_id=excluded.universal_id,updated_at=now();

insert into public.universal_entities(universal_id,entity_type,source_table,source_id)
select r.universal_id,'REFERRAL_REWARD','referral_rewards',r.id::text from public.referral_rewards r where r.universal_id is not null
on conflict (source_table,source_id) do update set universal_id=excluded.universal_id,updated_at=now();

insert into public.universal_entities(universal_id,entity_type,source_table,source_id)
select f.universal_id,'FULFILLMENT','order_fulfillments',f.id::text from public.order_fulfillments f where f.universal_id is not null
on conflict (source_table,source_id) do update set universal_id=excluded.universal_id,updated_at=now();

insert into public.universal_entities(universal_id,entity_type,source_table,source_id)
select c.universal_id,'CASE','refund_disputes',c.id::text from public.refund_disputes c where c.universal_id is not null
on conflict (source_table,source_id) do update set universal_id=excluded.universal_id,updated_at=now();

insert into public.universal_entities(universal_id,entity_type,source_table,source_id)
select w.universal_id,'WALLET','wallets',w.id::text from public.wallets w where w.universal_id is not null
on conflict (source_table,source_id) do update set universal_id=excluded.universal_id,updated_at=now();

insert into public.universal_entities(universal_id,entity_type,source_table,source_id)
select p.universal_id,'PAYOUT','payouts',p.id::text from public.payouts p where p.universal_id is not null
on conflict (source_table,source_id) do update set universal_id=excluded.universal_id,updated_at=now();

-- Central resolver. Search by exact universal ID first; then source ID.
create or replace function public.resolve_universal_id(p_query text)
returns table(universal_id text,entity_type text,source_table text,source_id text,status text)
language sql security invoker stable as $$
  select e.universal_id,e.entity_type,e.source_table,e.source_id,e.status
  from public.universal_entities e
  where lower(e.universal_id)=lower(trim(p_query))
     or lower(e.source_id)=lower(trim(p_query))
  order by case when lower(e.universal_id)=lower(trim(p_query)) then 0 else 1 end, e.created_at desc
  limit 50;
$$;

create or replace function public.search_universal_entities(p_query text, p_limit integer default 25)
returns table(universal_id text,entity_type text,source_table text,source_id text,status text)
language sql security invoker stable as $$
  select e.universal_id,e.entity_type,e.source_table,e.source_id,e.status
  from public.universal_entities e
  where trim(coalesce(p_query,'')) = ''
     or e.universal_id ilike '%' || trim(p_query) || '%'
     or e.source_id ilike '%' || trim(p_query) || '%'
  order by e.created_at desc
  limit greatest(1,least(coalesce(p_limit,25),100));
$$;

revoke all on function public.resolve_universal_id(text) from public;
revoke all on function public.search_universal_entities(text,integer) from public;
grant execute on function public.resolve_universal_id(text) to authenticated;
grant execute on function public.search_universal_entities(text,integer) to authenticated;

-- Keep the registry synchronized for future inserts/updates on core tables.
create or replace function public.register_universal_entity_from_row()
returns trigger
language plpgsql security definer set search_path=public as $$
declare v_uid text; v_type text; v_source_id text;
begin
  if new.universal_id is null then return new; end if;
  v_source_id := new.id::text;
  v_type := case tg_table_name
    when 'profiles' then 'USER'
    when 'orders' then 'ORDER'
    when 'transactions' then 'TRANSACTION'
    when 'order_items' then 'ORDER_ITEM'
    when 'order_fulfillments' then 'FULFILLMENT'
    when 'refund_disputes' then 'CASE'
    when 'referrals' then 'REFERRAL'
    when 'referral_rewards' then 'REFERRAL_REWARD'
    when 'wallets' then 'WALLET'
    when 'wallet_ledger_entries' then 'WALLET_ENTRY'
    when 'payouts' then 'PAYOUT'
    when 'commissions' then 'COMMISSION'
    else upper(tg_table_name)
  end;
  insert into public.universal_entities(universal_id,entity_type,source_table,source_id)
  values(new.universal_id,v_type,tg_table_name,v_source_id)
  on conflict(source_table,source_id) do update set universal_id=excluded.universal_id,updated_at=now();
  return new;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','orders','transactions','order_items','order_fulfillments','refund_disputes','referrals','referral_rewards','wallets','wallet_ledger_entries','payouts','commissions'] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists trg_universal_id_%I on public.%I',t,t);
      execute format('create trigger trg_universal_id_%I after insert or update of universal_id on public.%I for each row execute function public.register_universal_entity_from_row()',t,t);
    end if;
  end loop;
end $$;

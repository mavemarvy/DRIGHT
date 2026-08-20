-- DRIGHT MASTER PROMPT 8
-- Financial integrity, trust, security and production hardening.
-- Forward-only, data-preserving migration. No destructive data operations.

begin;

alter table public.payment_transactions enable row level security;

drop policy if exists payment_transactions_select_participant on public.payment_transactions;
create policy payment_transactions_select_participant
on public.payment_transactions for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = payment_transactions.order_id
      and (
        o.buyer_user_id = (select auth.uid())
        or private.is_order_seller(o.id, (select auth.uid()))
        or public.is_super_admin((select auth.uid()))
      )
  )
);

-- Preserve the existing boolean API while fixing the paid-state reversal bug.
create or replace function public.finance_reverse_commission(p_commission_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path=public,private,pg_temp as $$
declare r public.commissions%rowtype; w public.wallets%rowtype; v_old_status text;
begin
 if not public.is_super_admin((select auth.uid())) then raise exception 'Finance permission denied'; end if;
 if coalesce(length(trim(p_reason)),0)<3 then raise exception 'Reason is required'; end if;
 select * into r from public.commissions where id=p_commission_id for update;
 if not found then raise exception 'Commission not found'; end if;
 v_old_status:=r.status;
 if v_old_status in ('reversed','cancelled') then return true; end if;
 if v_old_status='paid' then
   select * into w from public.wallets where user_id=r.affiliate_user_id and currency_code=r.currency_code and status='active' order by created_at limit 1;
   if not found then raise exception 'Cannot reverse paid commission without an active matching wallet'; end if;
   insert into public.wallet_ledger_entries(entry_id,wallet_id,user_id,entry_type,direction,amount,currency_code,reference_type,reference_id,idempotency_key,description,metadata)
   values('DR-LED-'||substr(gen_random_uuid()::text,1,12),w.id,w.user_id,'adjustment','debit',r.commission_amount,r.currency_code,'commission_reversal',r.id::text,'commission-reversal:'||r.id,'Commission reversal',jsonb_build_object('reason',p_reason,'source_commission',r.id))
   on conflict (idempotency_key) do nothing;
 end if;
 update public.commissions set status='reversed',reversed_at=now(),updated_at=now() where id=r.id;
 perform public.finance_record_audit('commission_reverse','commission',r.id::text,to_jsonb(r),jsonb_build_object('status','reversed'),p_reason);
 return true;
end; $$;

-- Preserve the existing boolean API while fixing the paid-state reversal bug.
create or replace function public.finance_reverse_referral_reward(p_reward_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=public,private,pg_temp as $$
declare r public.referral_rewards%rowtype; w public.wallets%rowtype; v_old_status text;
begin
 if not public.is_super_admin((select auth.uid())) then raise exception 'Finance permission denied'; end if;
 if coalesce(length(trim(p_reason)),0)<3 then raise exception 'Reason is required'; end if;
 select * into r from public.referral_rewards where id=p_reward_id for update;
 if not found then raise exception 'Referral reward not found'; end if;
 v_old_status:=r.status;
 if v_old_status in ('reversed','cancelled') then return true; end if;
 if v_old_status='paid' then
   select * into w from public.wallets where user_id=r.beneficiary_user_id and currency_code=r.currency_code and status='active' order by created_at limit 1;
   if not found then raise exception 'Cannot reverse paid referral reward without an active matching wallet'; end if;
   insert into public.wallet_ledger_entries(entry_id,wallet_id,user_id,entry_type,direction,amount,currency_code,reference_type,reference_id,idempotency_key,description,metadata)
   values('DR-LED-'||substr(gen_random_uuid()::text,1,12),w.id,w.user_id,'adjustment','debit',r.reward_amount,r.currency_code,'referral_reversal',r.id::text,'referral-reversal:'||r.id,'Referral reward reversal',jsonb_build_object('reason',p_reason,'source_reward',r.id))
   on conflict (idempotency_key) do nothing;
 end if;
 update public.referral_rewards set status='reversed',updated_at=now() where id=r.id;
 perform public.finance_record_audit('referral_reverse','referral_reward',r.id::text,to_jsonb(r),jsonb_build_object('status','reversed'),p_reason);
 return true;
end; $$;

-- Preserve existing approve/reject/fail/complete API and release reserved funds on rejection/failure.
create or replace function public.finance_review_payout(p_payout_id uuid,p_action text,p_reason text)
returns boolean language plpgsql security definer set search_path=public,private,pg_temp as $$
declare r public.payouts%rowtype; ns text; v_old_status text;
begin
 if not public.is_super_admin((select auth.uid())) then raise exception 'Finance permission denied'; end if;
 if coalesce(length(trim(p_reason)),0)<3 then raise exception 'Reason is required'; end if;
 select * into r from public.payouts where id=p_payout_id for update;
 if not found then raise exception 'Payout not found'; end if;
 v_old_status:=r.status;
 ns:=case p_action when 'approve' then 'processing' when 'reject' then 'cancelled' when 'fail' then 'failed' when 'complete' then 'paid' else null end;
 if ns is null then raise exception 'Unsupported payout action'; end if;
 if p_action='approve' and v_old_status not in ('pending') then raise exception 'Only pending payouts can be approved'; end if;
 if p_action='reject' and v_old_status not in ('pending') then raise exception 'Only pending payouts can be rejected'; end if;
 if p_action='fail' and v_old_status<>'processing' then raise exception 'Only processing payouts can fail'; end if;
 if p_action='complete' and v_old_status<>'processing' then raise exception 'Only processing payouts can complete'; end if;
 update public.payouts set status=ns,approved_by=case when p_action='approve' then (select auth.uid()) else approved_by end,approved_at=case when p_action='approve' then now() else approved_at end,processed_at=case when p_action in ('complete','fail','reject') then now() else processed_at end,failure_reason=case when p_action in ('fail','reject') then p_reason else failure_reason end where id=p_payout_id;
 if p_action in ('reject','fail') then
   insert into public.wallet_ledger_entries(entry_id,wallet_id,user_id,entry_type,direction,amount,currency_code,reference_type,reference_id,idempotency_key,description,metadata)
   values('DR-LED-'||substr(gen_random_uuid()::text,1,12),r.wallet_id,r.user_id,'payout_reversal','credit',r.amount,r.currency_code,'payout_reversal',r.payout_id,'payout-reversal:'||r.id,'Payout reservation released',jsonb_build_object('reason',p_reason,'previous_status',v_old_status))
   on conflict (idempotency_key) do nothing;
 end if;
 perform public.finance_record_audit('payout_'||p_action,'payout',p_payout_id::text,to_jsonb(r),jsonb_build_object('status',ns),p_reason);
 return true;
end; $$;

-- Read-only reconciliation endpoint for Super Admin financial integrity review.
create or replace function public.finance_reconciliation_findings()
returns table(finding_code text,severity text,entity_type text,entity_id text,detail jsonb)
language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
 if not public.is_super_admin((select auth.uid())) then raise exception 'Only super admins can run financial reconciliation'; end if;
 return query select 'NEGATIVE_WALLET_BALANCE','critical','wallet',wb.wallet_id::text,jsonb_build_object('user_id',wb.user_id,'currency_code',wb.currency_code,'balance',wb.balance) from public.wallet_balances wb where wb.balance<0;
 return query select 'PAID_COMMISSION_WITHOUT_LEDGER_CREDIT','critical','commission',c.commission_id,jsonb_build_object('amount',c.commission_amount,'currency_code',c.currency_code,'affiliate_user_id',c.affiliate_user_id) from public.commissions c where c.status='paid' and not exists(select 1 from public.wallet_ledger_entries e where e.user_id=c.affiliate_user_id and e.direction='credit' and e.reference_type='commission' and e.reference_id=c.commission_id and e.amount=c.commission_amount);
 return query select 'PAID_REFERRAL_WITHOUT_LEDGER_CREDIT','critical','referral_reward',r.reward_id,jsonb_build_object('amount',r.reward_amount,'currency_code',r.currency_code,'beneficiary_user_id',r.beneficiary_user_id) from public.referral_rewards r where r.status='paid' and not exists(select 1 from public.wallet_ledger_entries e where e.user_id=r.beneficiary_user_id and e.direction='credit' and e.reference_type='referral_reward' and e.reference_id=r.reward_id and e.amount=r.reward_amount);
 return query select 'PAID_PAYOUT_WITHOUT_LEDGER_DEBIT','critical','payout',p.payout_id,jsonb_build_object('amount',p.amount,'currency_code',p.currency_code,'user_id',p.user_id) from public.payouts p where p.status='paid' and not exists(select 1 from public.wallet_ledger_entries e where e.user_id=p.user_id and e.direction='debit' and e.reference_type='payout' and e.reference_id=p.payout_id and e.amount=p.amount);
 return query select 'FAILED_PAYOUT_WITHOUT_REVERSAL','high','payout',p.payout_id,jsonb_build_object('amount',p.amount,'currency_code',p.currency_code,'user_id',p.user_id) from public.payouts p where p.status in('failed','cancelled') and not exists(select 1 from public.wallet_ledger_entries e where e.direction='credit' and e.reference_type='payout_reversal' and e.reference_id=p.payout_id and e.amount=p.amount);
end; $$;

alter view public.affiliate_performance_summary set (security_invoker=true);
alter view public.wallet_balances set (security_invoker=true);

create index if not exists transactions_order_id_integrity_idx on public.transactions(order_id);
create index if not exists transactions_buyer_user_id_integrity_idx on public.transactions(buyer_user_id);
create index if not exists commissions_order_id_integrity_idx on public.commissions(order_id);
create index if not exists commissions_order_item_id_integrity_idx on public.commissions(order_item_id);
create index if not exists commissions_vendor_user_id_integrity_idx on public.commissions(vendor_user_id);
create index if not exists payouts_wallet_id_integrity_idx on public.payouts(wallet_id);
create index if not exists payouts_payout_account_id_integrity_idx on public.payouts(payout_account_id);
create index if not exists payouts_approved_by_integrity_idx on public.payouts(approved_by);

revoke execute on function public.finance_reverse_commission(uuid,text) from anon;
revoke execute on function public.finance_reverse_referral_reward(uuid,text) from anon;
revoke execute on function public.finance_review_payout(uuid,text,text) from anon;
revoke execute on function public.finance_reconciliation_findings() from anon;
grant execute on function public.finance_reverse_commission(uuid,text) to authenticated;
grant execute on function public.finance_reverse_referral_reward(uuid,text) to authenticated;
grant execute on function public.finance_review_payout(uuid,text,text) to authenticated;
grant execute on function public.finance_reconciliation_findings() to authenticated;

commit;

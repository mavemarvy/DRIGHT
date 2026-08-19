-- Phase 5A: centralized feature visibility and controlled status.
-- Reuses the existing public.feature_registry table.

alter table public.feature_registry drop constraint if exists feature_registry_status_check;
alter table public.feature_registry add constraint feature_registry_status_check check (status in ('enabled','disabled','coming_soon','hidden'));

insert into public.feature_registry (feature_id, feature_key, display_name, status, searchable, discoverable, config)
values
 ('FTR-TERMS','terms','Terms & Conditions','enabled',false,true,'{"signup_required":true}'::jsonb),
 ('FTR-PRIVACY','privacy','Privacy Policy','enabled',false,true,'{}'::jsonb),
 ('FTR-COOKIES','cookies','Cookie Policy','enabled',false,true,'{}'::jsonb),
 ('FTR-HELP','help','Help Center','enabled',false,true,'{}'::jsonb),
 ('FTR-ANNOUNCEMENTS','announcements','Announcements','enabled',false,true,'{}'::jsonb),
 ('FTR-MESSAGES','messages','Messages & Chat','enabled',true,true,'{}'::jsonb),
 ('FTR-REFERRALS','referrals','Referrals','enabled',true,true,'{}'::jsonb),
 ('FTR-AFFILIATE','affiliate_center','Affiliate Center','enabled',true,true,'{}'::jsonb),
 ('FTR-VENDOR','vendor_center','Vendor Center','enabled',true,true,'{}'::jsonb),
 ('FTR-WALLET','wallet','Wallet','enabled',true,true,'{}'::jsonb),
 ('FTR-ORDERS','orders','Orders','enabled',true,true,'{}'::jsonb),
 ('FTR-FOLLOWERS','followers','Followers','enabled',true,true,'{}'::jsonb),
 ('FTR-COMMUNITIES-SOCIAL','communities_social','Communities','enabled',true,true,'{}'::jsonb),
 ('FTR-PROMOTIONS','promotions','Promotions','coming_soon',true,true,'{}'::jsonb),
 ('FTR-COURSES','courses','Courses','enabled',true,true,'{}'::jsonb),
 ('FTR-JOBS','jobs','Jobs','enabled',true,true,'{}'::jsonb),
 ('FTR-PAY-PAYSTACK','payment_paystack','Paystack','enabled',false,true,'{"provider":true}'::jsonb),
 ('FTR-PAY-FLUTTERWAVE','payment_flutterwave','Flutterwave','coming_soon',false,true,'{"provider":true}'::jsonb),
 ('FTR-PAY-WISE','payment_wise','Wise','coming_soon',false,true,'{"provider":true}'::jsonb),
 ('FTR-PAY-CRYPTO','payment_crypto','Crypto Payments','coming_soon',false,true,'{"provider":true}'::jsonb)
on conflict (feature_key) do update set display_name=excluded.display_name, config=excluded.config, updated_at=now();

create or replace function public.set_feature_status(p_feature_key text, p_status text, p_visible boolean default null)
returns public.feature_registry
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.feature_registry;
  v_old text;
begin
  if not (public.is_super_admin() or public.has_permission('platform.features.manage')) then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('enabled','disabled','coming_soon','hidden') then
    raise exception 'Invalid feature status';
  end if;
  select status into v_old from public.feature_registry where feature_key=p_feature_key;
  if not found then raise exception 'Feature not found'; end if;
  update public.feature_registry
    set status=p_status,
        discoverable=coalesce(p_visible, discoverable),
        updated_at=now()
  where feature_key=p_feature_key
  returning * into v_row;
  insert into public.audit_logs(actor_user_id, action, resource_type, resource_id, metadata)
  values (auth.uid(), 'feature_status_changed', 'feature', p_feature_key,
          jsonb_build_object('previous_status',v_old,'new_status',p_status,'discoverable',v_row.discoverable));
  return v_row;
end;
$$;

revoke execute on function public.set_feature_status(text,text,boolean) from public;
grant execute on function public.set_feature_status(text,text,boolean) to authenticated;

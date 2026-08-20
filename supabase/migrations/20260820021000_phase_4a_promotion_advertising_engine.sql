-- DRIGHT Prompt 4A: Promotion + Advertising Engine
-- Additive/non-destructive migration. Existing commerce, wallet, affiliate,
-- creator-campaign, recommendation and analytics systems remain authoritative.

create table if not exists public.promotion_pricing (
  id uuid primary key default gen_random_uuid(),
  pricing_key text not null unique,
  promotion_type text not null,
  pricing_model text not null check (pricing_model in ('CPM','CPC','CPR','CPA','FIXED')),
  currency_code text not null default 'USD',
  unit_price numeric(20,8) not null default 0 check (unit_price >= 0),
  minimum_daily_budget numeric(20,8) not null default 0 check (minimum_daily_budget >= 0),
  maximum_daily_budget numeric(20,8) check (maximum_daily_budget is null or maximum_daily_budget >= minimum_daily_budget),
  minimum_total_budget numeric(20,8) not null default 0 check (minimum_total_budget >= 0),
  maximum_total_budget numeric(20,8) check (maximum_total_budget is null or maximum_total_budget >= minimum_total_budget),
  minimum_duration_days integer not null default 1 check (minimum_duration_days > 0),
  maximum_duration_days integer check (maximum_duration_days is null or maximum_duration_days >= minimum_duration_days),
  requires_admin_approval boolean not null default true,
  eligible_item_types text[] not null default '{}',
  enabled boolean not null default true,
  config jsonb not null default '{}',
  configured_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null unique default ('DR-ADS-' || lpad(nextval('universal_public_id_seq')::text, 8, '0')),
  advertiser_user_id uuid not null references auth.users(id),
  name text not null,
  description text,
  promotion_type text not null,
  pricing_id uuid references public.promotion_pricing(id),
  creator_campaign_id uuid references public.creator_campaigns(id),
  status text not null default 'draft' check (status in ('draft','pending_payment','payment_pending','pending_review','approved','scheduled','active','paused','budget_exhausted','rejected','completed','cancelled','expired','suspended')),
  approval_status text not null default 'not_required' check (approval_status in ('not_required','pending','approved','rejected','changes_requested','suspended')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','authorized','paid','partially_refunded','refunded','failed','cancelled')),
  currency_code text not null default 'USD',
  total_budget numeric(20,8) not null default 0 check (total_budget >= 0),
  daily_budget numeric(20,8) check (daily_budget is null or daily_budget >= 0),
  amount_reserved numeric(20,8) not null default 0 check (amount_reserved >= 0),
  amount_spent numeric(20,8) not null default 0 check (amount_spent >= 0),
  amount_refunded numeric(20,8) not null default 0 check (amount_refunded >= 0),
  start_at timestamptz,
  end_at timestamptz,
  targeting jsonb not null default '{}',
  placement_config jsonb not null default '{}',
  pricing_snapshot jsonb not null default '{}',
  review_notes text,
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_campaigns_dates_check check (end_at is null or start_at is null or end_at > start_at),
  constraint marketing_campaigns_budget_check check (amount_spent + amount_reserved <= total_budget + amount_refunded)
);

create table if not exists public.sponsored_listings (
  id uuid primary key default gen_random_uuid(),
  sponsored_listing_id text not null unique default ('DR-SP-' || lpad(nextval('universal_public_id_seq')::text, 8, '0')),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  listing_id uuid not null references public.marketplace_items(id),
  seller_user_id uuid not null references auth.users(id),
  status text not null default 'active' check (status in ('draft','pending_review','approved','scheduled','active','paused','completed','cancelled','expired','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id, listing_id)
);

create table if not exists public.promotion_transactions (
  id uuid primary key default gen_random_uuid(),
  promotion_transaction_id text not null unique default ('DR-PTX-' || lpad(nextval('universal_public_id_seq')::text, 8, '0')),
  campaign_id uuid not null references public.marketing_campaigns(id),
  advertiser_user_id uuid not null references auth.users(id),
  amount numeric(20,8) not null check (amount >= 0),
  currency_code text not null,
  transaction_type text not null check (transaction_type in ('authorization','charge','refund','release','adjustment')),
  status text not null default 'pending' check (status in ('pending','authorized','successful','failed','reversed','refunded','cancelled')),
  provider text,
  provider_reference text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promotion_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  listing_id uuid references public.marketplace_items(id),
  event_key text not null unique,
  event_type text not null check (event_type in ('promotion_created','promotion_submitted','promotion_approved','promotion_rejected','promotion_started','promotion_impression','promotion_click','promotion_conversion','promotion_paused','promotion_resumed','promotion_budget_exhausted','promotion_completed','promotion_cancelled')),
  user_id uuid references auth.users(id),
  session_id text,
  source text,
  position integer,
  billable boolean not null default false,
  charge_amount numeric(20,8) not null default 0 check (charge_amount >= 0),
  currency_code text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.promotion_daily_spend (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  spend_date date not null,
  amount_spent numeric(20,8) not null default 0 check (amount_spent >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  conversions bigint not null default 0 check (conversions >= 0),
  updated_at timestamptz not null default now(),
  unique(campaign_id, spend_date)
);

create table if not exists public.promotion_statistics (
  campaign_id uuid primary key references public.marketing_campaigns(id) on delete cascade,
  impressions bigint not null default 0,
  unique_impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions bigint not null default 0,
  spend numeric(20,8) not null default 0,
  revenue numeric(20,8) not null default 0,
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.promotional_banners (
  id uuid primary key default gen_random_uuid(),
  banner_id text not null unique default ('DR-BNR-' || lpad(nextval('universal_public_id_seq')::text, 8, '0')),
  campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  advertiser_user_id uuid references auth.users(id),
  title text,
  subtitle text,
  description text,
  badge text,
  desktop_image_url text,
  tablet_image_url text,
  mobile_image_url text,
  background_image_url text,
  video_url text,
  cta_label text,
  destination_url text,
  placement text not null default 'marketplace_home',
  priority integer not null default 100,
  display_order integer not null default 0,
  audience jsonb not null default '{}',
  frequency_config jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','expired','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.banner_links (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null references public.promotional_banners(id) on delete cascade,
  label text,
  destination_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.banner_analytics (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null references public.promotional_banners(id) on delete cascade,
  event_key text not null unique,
  event_type text not null check (event_type in ('impression','click','conversion')),
  user_id uuid references auth.users(id),
  session_id text,
  device_type text,
  country_code text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_campaigns_advertiser on public.marketing_campaigns(advertiser_user_id, status, created_at desc);
create index if not exists idx_marketing_campaigns_active_window on public.marketing_campaigns(status, start_at, end_at);
create index if not exists idx_marketing_campaigns_type on public.marketing_campaigns(promotion_type, status);
create index if not exists idx_sponsored_listings_listing on public.sponsored_listings(listing_id, status);
create index if not exists idx_sponsored_listings_campaign on public.sponsored_listings(campaign_id, status);
create index if not exists idx_promotion_events_campaign_time on public.promotion_events(campaign_id, created_at desc);
create index if not exists idx_promotion_events_type_time on public.promotion_events(event_type, created_at desc);
create index if not exists idx_promotion_daily_spend_date on public.promotion_daily_spend(spend_date, campaign_id);
create index if not exists idx_banner_active_window on public.promotional_banners(status, starts_at, ends_at, placement, priority);
create index if not exists idx_banner_analytics_banner_time on public.banner_analytics(banner_id, created_at desc);

-- Reuse the existing platform feature registry instead of creating another feature flag system.
insert into public.feature_registry(feature_id, feature_key, display_name, status, searchable, discoverable, config)
values ('promotions', 'promotions', 'Promotions & Advertising', 'enabled', true, true, '{"prompt":"4A","engine":"marketing_campaigns"}')
on conflict (feature_id) do update set display_name = excluded.display_name, config = public.feature_registry.config || excluded.config, updated_at = now();

insert into public.listing_feature_rules(feature_id, enabled, requires_admin_approval, allow_free_listing, platform_fee_enabled, platform_fee_percent, status, config)
values ('promotions', true, true, true, false, 0, 'enabled', '{"promotion_types":["sponsored_listing","promoted_product","promoted_service","promoted_course","promoted_job","creator_promotion","search_placement","category_placement","homepage_placement","recommendation_placement","banner","campaign_promotion"]}')
on conflict (feature_id) do update set enabled = true, requires_admin_approval = true, status = 'enabled', config = public.listing_feature_rules.config || excluded.config, updated_at = now();

create or replace function public.promotion_is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select public.can_administer(auth.uid()); $$;

revoke all on function public.promotion_is_admin() from public;
grant execute on function public.promotion_is_admin() to authenticated;

create or replace function public.promotion_transition(p_campaign_id uuid, p_next_status text, p_note text default null)
returns public.marketing_campaigns
language plpgsql security definer set search_path = ''
as $$
declare c public.marketing_campaigns;
begin
  select * into c from public.marketing_campaigns where id = p_campaign_id for update;
  if c.id is null then raise exception 'campaign_not_found'; end if;
  if auth.uid() <> c.advertiser_user_id and not public.can_administer(auth.uid()) then raise exception 'not_authorized'; end if;
  if p_next_status not in ('draft','pending_payment','payment_pending','pending_review','approved','scheduled','active','paused','budget_exhausted','rejected','completed','cancelled','expired','suspended') then raise exception 'invalid_campaign_status'; end if;
  if p_next_status = 'active' and (c.approval_status not in ('not_required','approved') or c.payment_status not in ('paid','authorized')) then raise exception 'campaign_not_ready'; end if;
  if c.status = 'completed' and p_next_status not in ('completed','cancelled') then raise exception 'invalid_transition'; end if;
  update public.marketing_campaigns set status=p_next_status, review_notes=coalesce(p_note, review_notes), updated_at=now() where id=p_campaign_id returning * into c;
  insert into public.audit_logs(actor_user_id, action, resource_type, resource_id, metadata)
  values(auth.uid(), 'promotion_status_changed', 'marketing_campaign', c.campaign_id, jsonb_build_object('from', c.status, 'to', p_next_status, 'note', p_note));
  return c;
end; $$;

revoke all on function public.promotion_transition(uuid,text,text) from public;
grant execute on function public.promotion_transition(uuid,text,text) to authenticated;

create or replace function public.record_promotion_event(
  p_campaign_id uuid,
  p_event_key text,
  p_event_type text,
  p_listing_id uuid default null,
  p_user_id uuid default null,
  p_session_id text default null,
  p_source text default null,
  p_position integer default null,
  p_billable boolean default false,
  p_charge_amount numeric default 0,
  p_currency_code text default 'USD',
  p_metadata jsonb default '{}'
)
returns public.promotion_events
language plpgsql security definer set search_path = ''
as $$
declare c public.marketing_campaigns; e public.promotion_events; daily public.promotion_daily_spend; stats public.promotion_statistics;
begin
  if exists(select 1 from public.promotion_events where event_key=p_event_key) then
    select * into e from public.promotion_events where event_key=p_event_key; return e;
  end if;
  select * into c from public.marketing_campaigns where id=p_campaign_id for update;
  if c.id is null then raise exception 'campaign_not_found'; end if;
  if not public.can_administer(auth.uid()) and c.advertiser_user_id <> auth.uid() then
    -- Public delivery events may be recorded only through this controlled RPC; billing authority remains server-side.
    if p_event_type not in ('promotion_impression','promotion_click','promotion_conversion') then raise exception 'not_authorized'; end if;
  end if;
  if p_billable and p_charge_amount < 0 then raise exception 'invalid_charge'; end if;
  if p_billable and c.amount_spent + c.amount_reserved + p_charge_amount > c.total_budget + c.amount_refunded then raise exception 'budget_exhausted'; end if;
  insert into public.promotion_events(campaign_id,listing_id,event_key,event_type,user_id,session_id,source,position,billable,charge_amount,currency_code,metadata)
  values(p_campaign_id,p_listing_id,p_event_key,p_event_type,p_user_id,p_session_id,p_source,p_position,p_billable,case when p_billable then p_charge_amount else 0 end,p_currency_code,p_metadata) returning * into e;
  insert into public.promotion_daily_spend(campaign_id,spend_date,amount_spent,impressions,clicks,conversions)
  values(p_campaign_id,current_date,case when p_billable then p_charge_amount else 0 end,case when p_event_type='promotion_impression' then 1 else 0 end,case when p_event_type='promotion_click' then 1 else 0 end,case when p_event_type='promotion_conversion' then 1 else 0 end)
  on conflict(campaign_id,spend_date) do update set amount_spent=public.promotion_daily_spend.amount_spent+excluded.amount_spent, impressions=public.promotion_daily_spend.impressions+excluded.impressions, clicks=public.promotion_daily_spend.clicks+excluded.clicks, conversions=public.promotion_daily_spend.conversions+excluded.conversions, updated_at=now();
  insert into public.promotion_statistics(campaign_id,impressions,clicks,conversions,spend,last_event_at)
  values(p_campaign_id,case when p_event_type='promotion_impression' then 1 else 0 end,case when p_event_type='promotion_click' then 1 else 0 end,case when p_event_type='promotion_conversion' then 1 else 0 end,case when p_billable then p_charge_amount else 0 end,now())
  on conflict(campaign_id) do update set impressions=public.promotion_statistics.impressions+excluded.impressions, clicks=public.promotion_statistics.clicks+excluded.clicks, conversions=public.promotion_statistics.conversions+excluded.conversions, spend=public.promotion_statistics.spend+excluded.spend, last_event_at=now(), updated_at=now();
  if p_billable then update public.marketing_campaigns set amount_spent=amount_spent+p_charge_amount, status=case when amount_spent+p_charge_amount >= total_budget+amount_refunded then 'budget_exhausted' else status end, updated_at=now() where id=p_campaign_id; end if;
  return e;
end; $$;

revoke all on function public.record_promotion_event(uuid,text,text,uuid,uuid,text,text,integer,boolean,numeric,text,jsonb) from public;
grant execute on function public.record_promotion_event(uuid,text,text,uuid,uuid,text,text,integer,boolean,numeric,text,jsonb) to anon, authenticated;

create or replace function public.get_active_promotion_banners(p_placement text, p_device_type text default 'desktop')
returns setof public.promotional_banners
language sql stable security definer set search_path = ''
as $$
  select b.* from public.promotional_banners b
  left join public.marketing_campaigns c on c.id=b.campaign_id
  where b.status='active'
    and (b.starts_at is null or b.starts_at <= now())
    and (b.ends_at is null or b.ends_at > now())
    and b.placement=p_placement
    and (c.id is null or c.status='active')
  order by b.priority asc, b.display_order asc, b.created_at desc
  limit 20;
$$;

revoke all on function public.get_active_promotion_banners(text,text) from public;
grant execute on function public.get_active_promotion_banners(text,text) to anon, authenticated;

alter table public.promotion_pricing enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.sponsored_listings enable row level security;
alter table public.promotion_transactions enable row level security;
alter table public.promotion_events enable row level security;
alter table public.promotion_daily_spend enable row level security;
alter table public.promotion_statistics enable row level security;
alter table public.promotional_banners enable row level security;
alter table public.banner_links enable row level security;
alter table public.banner_analytics enable row level security;

create policy promotion_pricing_public_read on public.promotion_pricing for select using (enabled = true or public.can_administer(auth.uid()));
create policy marketing_campaigns_owner_read on public.marketing_campaigns for select using (advertiser_user_id=auth.uid() or public.can_administer(auth.uid()) or status in ('approved','scheduled','active','completed'));
create policy marketing_campaigns_owner_insert on public.marketing_campaigns for insert with check (advertiser_user_id=auth.uid() and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.account_status in ('banned','suspended')));
create policy marketing_campaigns_owner_update on public.marketing_campaigns for update using (advertiser_user_id=auth.uid() or public.can_administer(auth.uid())) with check (advertiser_user_id=auth.uid() or public.can_administer(auth.uid()));
create policy sponsored_listing_owner_read on public.sponsored_listings for select using (seller_user_id=auth.uid() or public.can_administer(auth.uid()) or status in ('approved','scheduled','active','completed'));
create policy sponsored_listing_owner_write on public.sponsored_listings for all using (seller_user_id=auth.uid() or public.can_administer(auth.uid())) with check (seller_user_id=auth.uid() or public.can_administer(auth.uid()));
create policy promotion_transactions_owner_read on public.promotion_transactions for select using (advertiser_user_id=auth.uid() or public.can_administer(auth.uid()));
create policy promotion_events_owner_read on public.promotion_events for select using (user_id=auth.uid() or exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and c.advertiser_user_id=auth.uid()) or public.can_administer(auth.uid()));
create policy promotion_daily_spend_owner_read on public.promotion_daily_spend for select using (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and c.advertiser_user_id=auth.uid()) or public.can_administer(auth.uid()));
create policy promotion_statistics_owner_read on public.promotion_statistics for select using (exists(select 1 from public.marketing_campaigns c where c.id=campaign_id and c.advertiser_user_id=auth.uid()) or public.can_administer(auth.uid()));
create policy promotional_banners_public_read on public.promotional_banners for select using ((status in ('active','scheduled') and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or advertiser_user_id=auth.uid() or public.can_administer(auth.uid()));
create policy promotional_banners_owner_write on public.promotional_banners for all using (advertiser_user_id=auth.uid() or public.can_administer(auth.uid())) with check (advertiser_user_id=auth.uid() or public.can_administer(auth.uid()));
create policy banner_links_public_read on public.banner_links for select using (exists(select 1 from public.promotional_banners b where b.id=banner_id and (b.status in ('active','scheduled') or b.advertiser_user_id=auth.uid() or public.can_administer(auth.uid()))));
create policy banner_links_owner_write on public.banner_links for all using (exists(select 1 from public.promotional_banners b where b.id=banner_id and (b.advertiser_user_id=auth.uid() or public.can_administer(auth.uid())))) with check (exists(select 1 from public.promotional_banners b where b.id=banner_id and (b.advertiser_user_id=auth.uid() or public.can_administer(auth.uid()))));
create policy banner_analytics_owner_read on public.banner_analytics for select using (exists(select 1 from public.promotional_banners b where b.id=banner_id and b.advertiser_user_id=auth.uid()) or public.can_administer(auth.uid()));

-- Keep the existing updated_at trigger strategy if present; these functions are intentionally
-- additive and do not replace existing trigger definitions.

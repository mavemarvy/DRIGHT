-- DRIGHT Prompt 2B: Marketplace Intelligence
-- Additive/backward-compatible. Existing marketplace data and RLS are preserved.

create extension if not exists pg_trgm;

create index if not exists marketplace_items_title_trgm_idx
  on public.marketplace_items using gin (lower(title) gin_trgm_ops);
create index if not exists marketplace_items_slug_trgm_idx
  on public.marketplace_items using gin (lower(slug) gin_trgm_ops);
create index if not exists stores_name_trgm_idx
  on public.stores using gin (lower(name) gin_trgm_ops);

create table if not exists public.algorithm_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  algorithm_area text not null default 'marketplace',
  status text not null default 'draft' check (status in ('draft','active','retired','rolled_back')),
  config jsonb not null default '{}'::jsonb,
  reason text,
  expected_impact text,
  actual_impact text,
  created_by uuid references auth.users(id),
  deployed_at timestamptz,
  rollback_of uuid references public.algorithm_versions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists algorithm_versions_area_status_idx
  on public.algorithm_versions(algorithm_area,status,created_at desc);
alter table public.algorithm_versions enable row level security;
drop policy if exists "Admins view algorithm versions" on public.algorithm_versions;
create policy "Admins view algorithm versions" on public.algorithm_versions for select to authenticated
  using (is_super_admin(auth.uid()) or has_permission('recommendations.manage',auth.uid()) or has_permission('search.manage',auth.uid()));
drop policy if exists "Admins manage algorithm versions" on public.algorithm_versions;
create policy "Admins manage algorithm versions" on public.algorithm_versions for all to authenticated
  using (is_super_admin(auth.uid()) or has_permission('recommendations.manage',auth.uid()) or has_permission('search.manage',auth.uid()))
  with check (is_super_admin(auth.uid()) or has_permission('recommendations.manage',auth.uid()) or has_permission('search.manage',auth.uid()));

create table if not exists public.algorithm_experiments (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null unique,
  name text not null,
  algorithm_area text not null,
  status text not null default 'draft' check (status in ('draft','running','paused','completed','killed')),
  variants jsonb not null default '{}'::jsonb,
  traffic_percent numeric not null default 100 check (traffic_percent between 0 and 100),
  kill_switch boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists algorithm_experiments_area_status_idx
  on public.algorithm_experiments(algorithm_area,status,created_at desc);
alter table public.algorithm_experiments enable row level security;
drop policy if exists "Admins manage algorithm experiments" on public.algorithm_experiments;
create policy "Admins manage algorithm experiments" on public.algorithm_experiments for all to authenticated
  using (is_super_admin(auth.uid()) or has_permission('recommendations.manage',auth.uid()) or has_permission('search.manage',auth.uid()))
  with check (is_super_admin(auth.uid()) or has_permission('recommendations.manage',auth.uid()) or has_permission('search.manage',auth.uid()));

create table if not exists public.algorithm_experiment_assignments (
  experiment_id uuid not null references public.algorithm_experiments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  variant text not null,
  assigned_at timestamptz not null default now(),
  primary key (experiment_id,user_id)
);
create index if not exists algorithm_experiment_assignments_user_idx
  on public.algorithm_experiment_assignments(user_id,assigned_at desc);
alter table public.algorithm_experiment_assignments enable row level security;
drop policy if exists "Users view own experiment assignments" on public.algorithm_experiment_assignments;
create policy "Users view own experiment assignments" on public.algorithm_experiment_assignments for select to authenticated
  using (user_id=auth.uid() or is_super_admin(auth.uid()));

create table if not exists public.marketplace_intelligence_scores (
  item_id uuid primary key references public.marketplace_items(id) on delete cascade,
  algorithm_version_id uuid references public.algorithm_versions(id),
  quality_score numeric not null default 0,
  engagement_score numeric not null default 0,
  conversion_score numeric not null default 0,
  freshness_score numeric not null default 0,
  velocity_score numeric not null default 0,
  trust_score numeric not null default 0,
  personalization_score numeric not null default 0,
  price_competitiveness_score numeric not null default 0,
  final_score numeric not null default 0,
  score_breakdown jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now()
);
create index if not exists marketplace_intelligence_scores_final_idx
  on public.marketplace_intelligence_scores(final_score desc,computed_at desc);
alter table public.marketplace_intelligence_scores enable row level security;
drop policy if exists "Admins view intelligence scores" on public.marketplace_intelligence_scores;
create policy "Admins view intelligence scores" on public.marketplace_intelligence_scores for select to authenticated
  using (is_super_admin(auth.uid()) or has_permission('recommendations.manage',auth.uid()) or has_permission('search.manage',auth.uid()));

insert into public.permissions(name,slug,description,resource,action) values
 ('Manage Search','search.manage','Manage marketplace search configuration','search','manage'),
 ('View Search Analytics','search.analytics','View marketplace search and discovery analytics','search','analytics'),
 ('Manage Recommendations','recommendations.manage','Manage marketplace recommendation configuration','recommendations','manage')
on conflict (slug) do update set name=excluded.name,description=excluded.description,resource=excluded.resource,action=excluded.action;

insert into public.algorithm_versions(version,algorithm_area,status,config,reason,expected_impact,deployed_at)
values ('2B.1','marketplace','active',
 '{"weights":{"relevance":0.30,"quality":0.15,"engagement":0.12,"conversion":0.12,"freshness":0.08,"velocity":0.05,"personalization":0.10,"trust":0.05,"price_competitiveness":0.03},"decay":{"engagement_days":30,"velocity_days":7,"freshness_days":90},"diversity":{"seller_cap":3,"category_cap":8}}'::jsonb,
 'Initial production marketplace intelligence layer built on the existing Phase 2A discovery foundation.',
 'Improve search relevance, personalization, quality and diversity without changing marketplace eligibility or existing records.',now())
on conflict(version) do update set status='active',config=excluded.config,updated_at=now(),deployed_at=coalesce(public.algorithm_versions.deployed_at,excluded.deployed_at);

create or replace function public.search_marketplace_intelligent(
  p_query text default '', p_item_type text default null, p_category_id uuid default null,
  p_min_price numeric default null, p_max_price numeric default null, p_currency text default null,
  p_limit integer default 24, p_offset integer default 0
) returns table (
  id uuid, public_id text, title text, description text, item_type text, price numeric, currency_code character,
  category_id uuid, category_name text, store_id uuid, store_name text, store_public_id text,
  store_verification_badge boolean, image_url text, relevance_score real, quality_score numeric,
  engagement_score numeric, conversion_score numeric, personalization_score numeric, freshness_score numeric,
  velocity_score numeric, trust_score numeric, price_competitiveness_score numeric, final_score numeric,
  recommendation_reason text, algorithm_version text
)
language sql stable security invoker
as $$
with params as (select nullif(trim(coalesce(p_query,'')),'') q),
candidates as (
  select mi.id,mi.public_id,mi.title,mi.description,mi.item_type,mi.price,mi.currency_code,mi.category_id,
    mc.name category_name,mi.store_id,s.name store_name,s.public_id store_public_id,
    coalesce(s.verification_badge,false) store_verification_badge,
    nullif(mi.metadata->>'image_url','') image_url,mi.created_at,
    case when p.q is null then 0::real else greatest(
      ts_rank_cd(coalesce(mi.search_vector,to_tsvector('simple','')),websearch_to_tsquery('simple',p.q)),
      similarity(lower(mi.title),lower(p.q))
    ) end relevance_score
  from public.marketplace_items mi cross join params p
  left join public.marketplace_categories mc on mc.id=mi.category_id and mc.is_active=true
  left join public.stores s on s.id=mi.store_id and s.status='approved' and s.public_visibility=true
  where mi.status='published' and mi.visibility='public'
    and (p.q is null or mi.search_vector @@ websearch_to_tsquery('simple',p.q)
      or lower(mi.public_id)=lower(p.q) or lower(mi.slug)=lower(p.q)
      or lower(coalesce(s.name,'')) like '%'||lower(p.q)||'%'
      or similarity(lower(mi.title),lower(p.q))>=0.18)
    and (p_item_type is null or p_item_type='' or (p_item_type='product' and mi.item_type in ('physical_product','digital_product')) or mi.item_type=p_item_type)
    and (p_category_id is null or mi.category_id=p_category_id)
    and (p_min_price is null or mi.price>=p_min_price)
    and (p_max_price is null or mi.price<=p_max_price)
    and (p_currency is null or mi.currency_code=upper(p_currency))
), events as (
  select de.entity_id,count(*) engagement_raw,
    count(*) filter(where de.created_at>=now()-interval '7 days') velocity_7,
    count(*) filter(where de.event_type='purchase') purchases,
    count(*) filter(where de.event_type in ('open','click')) opens
  from public.discovery_events de join candidates c on c.id=de.entity_id
  where de.created_at>=now()-interval '30 days' group by de.entity_id
), scored as (
  select c.*,
    least(1.0,(case when length(coalesce(c.title,''))>=10 then 0.25 else 0.10 end)
      +(case when length(coalesce(c.description,''))>=100 then 0.30 when length(coalesce(c.description,''))>=40 then 0.20 else 0.05 end)
      +(case when c.image_url is not null then 0.20 else 0 end)
      +(case when c.category_id is not null then 0.15 else 0 end)
      +(case when c.price is not null or c.item_type in ('service','job') then 0.10 else 0 end)) quality_score,
    least(1.0,coalesce(e.engagement_raw,0)::numeric/50.0) engagement_score,
    least(1.0,case when coalesce(e.opens,0)>0 then coalesce(e.purchases,0)::numeric/e.opens*5 else 0 end) conversion_score,
    least(1.0,coalesce(e.velocity_7,0)::numeric/greatest(1,coalesce(e.engagement_raw,0)::numeric/4.0)) velocity_score,
    exp(-greatest(0,extract(epoch from(now()-c.created_at))/86400.0)/90.0)::numeric freshness_score,
    case when c.store_verification_badge then 1.0 else 0.45 end trust_score
  from candidates c left join events e on e.entity_id=c.id
), personalized as (
  select s.*,case when auth.uid() is null then 0.0 else least(1.0,
    (case when exists(select 1 from public.recently_viewed_items rv join public.marketplace_items v on v.id=rv.item_id where rv.user_id=auth.uid() and v.category_id=s.category_id) then 0.5 else 0 end)
    +(case when exists(select 1 from public.marketplace_item_favorites f join public.marketplace_items v on v.id=f.item_id where f.user_id=auth.uid() and v.category_id=s.category_id) then 0.3 else 0 end)
    +(case when exists(select 1 from public.recently_viewed_items rv join public.marketplace_items v on v.id=rv.item_id where rv.user_id=auth.uid() and v.store_id=s.store_id) then 0.2 else 0 end)) end personalization_score
  from scored s
), finalized as (
  select p.*,0.5::numeric price_competitiveness_score,
    least(1.0,greatest(0.0,p.relevance_score*0.30+p.quality_score*0.15+p.engagement_score*0.12+p.conversion_score*0.12+p.freshness_score*0.08+p.velocity_score*0.05+p.personalization_score*0.10+p.trust_score*0.05+0.5*0.03)) final_score
  from personalized p
)
select f.id,f.public_id,f.title,f.description,f.item_type,f.price,f.currency_code,f.category_id,f.category_name,f.store_id,f.store_name,f.store_public_id,f.store_verification_badge,f.image_url,f.relevance_score,f.quality_score,f.engagement_score,f.conversion_score,f.personalization_score,f.freshness_score,f.velocity_score,f.trust_score,f.price_competitiveness_score,f.final_score,
  case when f.personalization_score>=0.5 then 'Based on your recent DRIGHT activity' when f.relevance_score>=0.55 then 'Strong match for your search' when f.engagement_score>=0.6 then 'Popular with buyers' when f.freshness_score>=0.8 then 'Newly published' when f.trust_score>=0.8 then 'From a verified seller' else 'Recommended by DRIGHT marketplace intelligence' end,
  '2B.1'
from finalized f order by f.final_score desc,f.relevance_score desc,f.created_at desc,f.id
limit greatest(coalesce(p_limit,24),1) offset greatest(coalesce(p_offset,0),0);
$$;
grant execute on function public.search_marketplace_intelligent(text,text,uuid,numeric,numeric,text,integer,integer) to anon,authenticated;

create or replace function public.get_similar_marketplace_items(p_item_id uuid,p_limit integer default 12)
returns table(id uuid,public_id text,title text,item_type text,price numeric,currency_code character,similarity_score numeric,recommendation_reason text)
language sql stable security invoker as $$
with source as (select * from public.marketplace_items where id=p_item_id and status='published' and visibility='public')
select mi.id,mi.public_id,mi.title,mi.item_type,mi.price,mi.currency_code,
  (case when mi.category_id=s.category_id then 0.55 else 0 end)+greatest(similarity(lower(mi.title),lower(s.title)),similarity(lower(coalesce(mi.description,'')),lower(coalesce(s.description,''))))*0.45,
  case when mi.category_id=s.category_id then 'Similar in your category' else 'Similar listing content' end
from public.marketplace_items mi cross join source s
where mi.id<>s.id and mi.status='published' and mi.visibility='public'
order by 7 desc,mi.created_at desc,mi.id limit greatest(coalesce(p_limit,12),1);
$$;
grant execute on function public.get_similar_marketplace_items(uuid,integer) to anon,authenticated;

create or replace function public.get_marketplace_trending(p_window text default '7d',p_limit integer default 20)
returns table(id uuid,public_id text,title text,item_type text,price numeric,currency_code character,trend_score numeric,velocity_score numeric,engagement_score numeric)
language sql stable security invoker as $$
with bounds as (select case lower(coalesce(p_window,'7d')) when '1h' then interval '1 hour' when '24h' then interval '24 hours' when '30d' then interval '30 days' else interval '7 days' end period),agg as (
 select mi.id,mi.public_id,mi.title,mi.item_type,mi.price,mi.currency_code,count(de.id)::numeric engagement,
 count(de.id) filter(where de.created_at>=now()-(select period from bounds)/2)::numeric recent,
 count(de.id) filter(where de.created_at>=now()-(select period from bounds))::numeric total
 from public.marketplace_items mi left join public.discovery_events de on de.entity_id=mi.id and de.created_at>=now()-(select period from bounds)
 where mi.status='published' and mi.visibility='public' group by mi.id,mi.public_id,mi.title,mi.item_type,mi.price,mi.currency_code)
select a.id,a.public_id,a.title,a.item_type,a.price,a.currency_code,
 least(1.0,(a.engagement/50.0)*0.55+(case when a.total>0 then greatest(0,least(1,a.recent/greatest(1,a.total/2.0))) else 0 end)*0.45),
 case when a.total>0 then greatest(0,least(1,a.recent/greatest(1,a.total/2.0))) else 0 end,
 least(1.0,a.engagement/50.0)
from agg a order by 7 desc,a.recent desc,a.id limit greatest(coalesce(p_limit,20),1);
$$;
grant execute on function public.get_marketplace_trending(text,integer) to anon,authenticated;

create or replace function public.get_algorithm_dashboard_metrics(p_days integer default 30)
returns table(algorithm_version text,searches bigint,zero_result_searches bigint,search_ctr numeric,search_conversion_rate numeric,recommendation_impressions bigint,recommendation_clicks bigint,recommendation_ctr numeric,recommendation_conversions bigint,recommendation_conversion_rate numeric,avg_search_position numeric,personalization_coverage numeric,discovery_events bigint)
language plpgsql stable security definer set search_path=public as $$
declare actor uuid:=auth.uid(); days integer:=least(greatest(coalesce(p_days,30),1),90);
begin
 if actor is null or not (is_super_admin(actor) or has_permission('search.analytics',actor) or has_permission('recommendations.manage',actor)) then raise exception 'insufficient permission'; end if;
 return query with q as (select count(*)::bigint searches,count(*) filter(where result_count=0)::bigint zero_results from public.search_queries where created_at>=now()-(days||' days')::interval),de as (select count(*) filter(where event_type='impression')::bigint impressions,count(*) filter(where event_type in ('click','open'))::bigint clicks,count(*) filter(where event_type='purchase')::bigint purchases,count(*)::bigint total from public.discovery_events where created_at>=now()-(days||' days')::interval),av as (select coalesce(version,'2B.1') version from public.algorithm_versions where algorithm_area='marketplace' and status='active' order by created_at desc limit 1)
 select av.version,q.searches,q.zero_results,case when q.searches>0 then round(((q.searches-q.zero_results)::numeric/q.searches)*100,2) else 0 end,case when q.searches>0 then round((de.purchases::numeric/greatest(q.searches,1))*100,2) else 0 end,de.impressions,de.clicks,case when de.impressions>0 then round((de.clicks::numeric/de.impressions)*100,2) else 0 end,de.purchases,case when de.clicks>0 then round((de.purchases::numeric/de.clicks)*100,2) else 0 end,null::numeric,0::numeric,de.total from q cross join de cross join av;
end; $$;
revoke execute on function public.get_algorithm_dashboard_metrics(integer) from anon,public;
grant execute on function public.get_algorithm_dashboard_metrics(integer) to authenticated;

create or replace function public.audit_algorithm_version_change() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,metadata) values(auth.uid(),case when tg_op='INSERT' then 'algorithm.version.created' else 'algorithm.version.updated' end,'algorithm_version',new.id::text,jsonb_build_object('version',new.version,'status',new.status,'algorithm_area',new.algorithm_area,'config',new.config,'reason',new.reason)); return new; end; $$;
drop trigger if exists audit_algorithm_version_change on public.algorithm_versions;
create trigger audit_algorithm_version_change after insert or update on public.algorithm_versions for each row execute function public.audit_algorithm_version_change();

create or replace function public.admin_activate_algorithm_version(p_version text,p_config jsonb,p_reason text default null) returns public.algorithm_versions language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); row public.algorithm_versions;
begin if actor is null or not (is_super_admin(actor) or has_permission('recommendations.manage',actor) or has_permission('search.manage',actor)) then raise exception 'insufficient permission'; end if;
 update public.algorithm_versions set status='retired',updated_at=now() where algorithm_area='marketplace' and status='active';
 insert into public.algorithm_versions(version,algorithm_area,status,config,reason,created_by,deployed_at) values(p_version,'marketplace','active',coalesce(p_config,'{}'::jsonb),p_reason,actor,now()) returning * into row; return row; end; $$;
revoke execute on function public.admin_activate_algorithm_version(text,jsonb,text) from anon,public;
grant execute on function public.admin_activate_algorithm_version(text,jsonb,text) to authenticated;

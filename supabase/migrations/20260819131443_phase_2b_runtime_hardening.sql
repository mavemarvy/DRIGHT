-- DRIGHT Prompt 2B runtime hardening: make active algorithm configuration executable,
-- add trustworthy discovery event recording, personalized recommendations, and supporting indexes.

create index if not exists discovery_events_entity_created_idx
  on public.discovery_events(entity_id, created_at desc);
create index if not exists search_queries_user_created_idx
  on public.search_queries(user_id, created_at desc);
create index if not exists recently_viewed_items_user_viewed_idx
  on public.recently_viewed_items(user_id, last_viewed_at desc);

create or replace function public.record_discovery_event(
  p_entity_id uuid,
  p_event_type text,
  p_source text default 'marketplace',
  p_position integer default null,
  p_session_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns public.discovery_events
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  actor uuid := auth.uid();
  row public.discovery_events;
  normalized text := lower(trim(coalesce(p_event_type,'')));
begin
  if actor is null then raise exception 'authentication required'; end if;
  if normalized not in ('impression','open','click','like','save','share','follow','hide','less_like_this','not_interested') then
    raise exception 'unsupported discovery event';
  end if;
  if not exists (select 1 from public.marketplace_items mi where mi.id=p_entity_id and mi.status='published' and mi.visibility='public') then
    raise exception 'listing is not discoverable';
  end if;
  if exists (
    select 1 from public.discovery_events de
    where de.user_id=actor and de.entity_id=p_entity_id and de.event_type=normalized
      and de.source=coalesce(nullif(trim(p_source),''),'marketplace')
      and de.created_at >= now() - interval '2 seconds'
  ) then
    return null;
  end if;
  insert into public.discovery_events(user_id,entity_id,event_type,source,position,session_id,metadata)
  values(actor,p_entity_id,normalized,coalesce(nullif(trim(p_source),''),'marketplace'),p_position,p_session_id,coalesce(p_metadata,'{}'::jsonb))
  returning * into row;
  return row;
end;
$$;
revoke execute on function public.record_discovery_event(uuid,text,text,integer,text,jsonb) from public, anon;
grant execute on function public.record_discovery_event(uuid,text,text,integer,text,jsonb) to authenticated;

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
set search_path = public, extensions, pg_catalog
as $$
with params as (select nullif(trim(coalesce(p_query,'')),'') q),
active as (
  select version, config,
    coalesce((config #>> '{weights,relevance}')::numeric,0.30) w_relevance,
    coalesce((config #>> '{weights,quality}')::numeric,0.15) w_quality,
    coalesce((config #>> '{weights,engagement}')::numeric,0.12) w_engagement,
    coalesce((config #>> '{weights,conversion}')::numeric,0.12) w_conversion,
    coalesce((config #>> '{weights,freshness}')::numeric,0.08) w_freshness,
    coalesce((config #>> '{weights,velocity}')::numeric,0.05) w_velocity,
    coalesce((config #>> '{weights,personalization}')::numeric,0.10) w_personalization,
    coalesce((config #>> '{weights,trust}')::numeric,0.05) w_trust,
    coalesce((config #>> '{weights,price_competitiveness}')::numeric,0.03) w_price,
    greatest(1,coalesce((config #>> '{diversity,seller_cap}')::integer,3)) seller_cap,
    greatest(1,coalesce((config #>> '{diversity,category_cap}')::integer,8)) category_cap,
    greatest(1,coalesce((config #>> '{decay,engagement_days}')::numeric,30)) engagement_days,
    greatest(1,coalesce((config #>> '{decay,velocity_days}')::numeric,7)) velocity_days,
    greatest(1,coalesce((config #>> '{decay,freshness_days}')::numeric,90)) freshness_days
  from public.algorithm_versions
  where algorithm_area='marketplace' and status='active'
  order by created_at desc limit 1
),
candidates as (
  select mi.id,mi.public_id,mi.title,mi.description,mi.item_type,mi.price,mi.currency_code,mi.category_id,
    mc.name category_name,mi.store_id,s.name store_name,s.public_id store_public_id,
    coalesce(s.verification_badge,false) store_verification_badge,
    nullif(mi.metadata->>'image_url','') image_url,mi.created_at,
    case when p.q is null then 0::real else greatest(
      ts_rank_cd(coalesce(mi.search_vector,to_tsvector('simple','')),websearch_to_tsquery('simple',p.q)),
      extensions.similarity(lower(mi.title),lower(p.q)),
      case when lower(mi.public_id)=lower(p.q) or lower(mi.slug)=lower(p.q) then 1.0 else 0 end
    ) end relevance_score
  from public.marketplace_items mi cross join params p
  left join public.marketplace_categories mc on mc.id=mi.category_id and mc.is_active=true
  left join public.stores s on s.id=mi.store_id and s.status='approved' and s.public_visibility=true
  where mi.status='published' and mi.visibility='public'
    and (p.q is null or mi.search_vector @@ websearch_to_tsquery('simple',p.q)
      or lower(mi.public_id)=lower(p.q) or lower(mi.slug)=lower(p.q)
      or lower(coalesce(s.name,'')) like '%'||lower(p.q)||'%'
      or extensions.similarity(lower(mi.title),lower(p.q))>=0.18)
    and (p_item_type is null or p_item_type='' or (p_item_type='product' and mi.item_type in ('physical_product','digital_product')) or mi.item_type=p_item_type)
    and (p_category_id is null or mi.category_id=p_category_id)
    and (p_min_price is null or mi.price>=p_min_price)
    and (p_max_price is null or mi.price<=p_max_price)
    and (p_currency is null or mi.currency_code=upper(p_currency))
),
events as (
  select de.entity_id,
    count(*) filter(where de.event_type in ('open','click','like','save','share','follow')) engagement_raw,
    count(*) filter(where de.created_at>=now()-(select velocity_days from active)*interval '1 day') velocity_raw,
    count(*) filter(where de.event_type='click') clicks,
    count(*) filter(where de.event_type='purchase') purchases
  from public.discovery_events de join candidates c on c.id=de.entity_id
  where de.created_at>=now()-(select engagement_days from active)*interval '1 day'
  group by de.entity_id
),
scored as (
  select c.*,
    least(1.0,(case when length(coalesce(c.title,''))>=10 then 0.25 else 0.10 end)
      +(case when length(coalesce(c.description,''))>=100 then 0.30 when length(coalesce(c.description,''))>=40 then 0.20 else 0.05 end)
      +(case when c.image_url is not null then 0.20 else 0 end)
      +(case when c.category_id is not null then 0.15 else 0 end)
      +(case when c.price is not null or c.item_type in ('service','job') then 0.10 else 0 end)) quality_score,
    least(1.0,coalesce(e.engagement_raw,0)::numeric/50.0) engagement_score,
    least(1.0,case when coalesce(e.clicks,0)>0 then coalesce(e.purchases,0)::numeric/e.clicks*5 else 0 end) conversion_score,
    least(1.0,coalesce(e.velocity_raw,0)::numeric/25.0) velocity_score,
    exp(-greatest(0,extract(epoch from(now()-c.created_at))/86400.0)/(select freshness_days from active))::numeric freshness_score,
    case when c.store_verification_badge then 1.0 else 0.45 end trust_score,
    case when c.price is null then 0.5 else least(1.0,greatest(0.0,1.0-abs(c.price-coalesce(avg(c.price) over(partition by c.category_id,c.item_type,c.currency_code),c.price))/greatest(coalesce(avg(c.price) over(partition by c.category_id,c.item_type,c.currency_code),c.price),1))) end price_competitiveness_score
  from candidates c left join events e on e.entity_id=c.id
),
personalized as (
  select s.*,case when auth.uid() is null then 0.0 else least(1.0,
    (case when exists(select 1 from public.recently_viewed_items rv join public.marketplace_items v on v.id=rv.item_id where rv.user_id=auth.uid() and v.category_id=s.category_id) then 0.5 else 0 end)
    +(case when exists(select 1 from public.marketplace_item_favorites f join public.marketplace_items v on v.id=f.item_id where f.user_id=auth.uid() and v.category_id=s.category_id) then 0.3 else 0 end)
    +(case when exists(select 1 from public.recently_viewed_items rv join public.marketplace_items v on v.id=rv.item_id where rv.user_id=auth.uid() and v.store_id=s.store_id) then 0.2 else 0 end)) end personalization_score
  from scored s
),
finalized as (
  select p.*,a.version,
    least(1.0,greatest(0.0,
      p.relevance_score*a.w_relevance+p.quality_score*a.w_quality+p.engagement_score*a.w_engagement+
      p.conversion_score*a.w_conversion+p.freshness_score*a.w_freshness+p.velocity_score*a.w_velocity+
      p.personalization_score*a.w_personalization+p.trust_score*a.w_trust+p.price_competitiveness_score*a.w_price
    )) final_score,
    row_number() over(partition by p.store_id order by
      p.relevance_score*a.w_relevance+p.quality_score*a.w_quality+p.engagement_score*a.w_engagement+p.conversion_score*a.w_conversion+p.freshness_score*a.w_freshness+p.velocity_score*a.w_velocity+p.personalization_score*a.w_personalization+p.trust_score*a.w_trust+p.price_competitiveness_score*a.w_price desc,p.id) seller_rank,
    row_number() over(partition by p.category_id order by
      p.relevance_score*a.w_relevance+p.quality_score*a.w_quality+p.engagement_score*a.w_engagement+p.conversion_score*a.w_conversion+p.freshness_score*a.w_freshness+p.velocity_score*a.w_velocity+p.personalization_score*a.w_personalization+p.trust_score*a.w_trust+p.price_competitiveness_score*a.w_price desc,p.id) category_rank,
    a.seller_cap,a.category_cap
  from personalized p cross join active a
)
select f.id,f.public_id,f.title,f.description,f.item_type,f.price,f.currency_code,f.category_id,f.category_name,f.store_id,f.store_name,f.store_public_id,f.store_verification_badge,f.image_url,f.relevance_score,f.quality_score,f.engagement_score,f.conversion_score,f.personalization_score,f.freshness_score,f.velocity_score,f.trust_score,f.price_competitiveness_score,f.final_score,
  case when f.personalization_score>=0.5 then 'Based on your recent DRIGHT activity' when f.relevance_score>=0.55 then 'Strong match for your search' when f.engagement_score>=0.6 then 'Popular with buyers' when f.freshness_score>=0.8 then 'Newly published' when f.trust_score>=0.8 then 'From a verified seller' else 'Recommended by DRIGHT marketplace intelligence' end,
  f.version
from finalized f
where f.seller_rank<=f.seller_cap and f.category_rank<=f.category_cap
order by f.final_score desc,f.relevance_score desc,f.created_at desc,f.id
limit greatest(coalesce(p_limit,24),1) offset greatest(coalesce(p_offset,0),0);
$$;

grant execute on function public.search_marketplace_intelligent(text,text,uuid,numeric,numeric,text,integer,integer) to anon,authenticated;

create or replace function public.get_marketplace_recommendations(p_limit integer default 12,p_exclude_item_id uuid default null)
returns table(id uuid,public_id text,title text,item_type text,price numeric,currency_code character,final_score numeric,recommendation_reason text,algorithm_version text)
language sql stable security invoker
set search_path = public, extensions, pg_catalog
as $$
select r.id,r.public_id,r.title,r.item_type,r.price,r.currency_code,r.final_score,r.recommendation_reason,r.algorithm_version
from public.search_marketplace_intelligent('',null,null,null,null,null,greatest(coalesce(p_limit,12)*3,12),0) r
where p_exclude_item_id is null or r.id<>p_exclude_item_id
order by r.final_score desc,r.id
limit greatest(coalesce(p_limit,12),1);
$$;
grant execute on function public.get_marketplace_recommendations(integer,uuid) to anon,authenticated;

create or replace function public.get_algorithm_dashboard_metrics(p_days integer default 30)
returns table(algorithm_version text, searches bigint, zero_result_searches bigint, search_ctr numeric, search_conversion_rate numeric, recommendation_impressions bigint, recommendation_clicks bigint, recommendation_ctr numeric, recommendation_conversions bigint, recommendation_conversion_rate numeric, avg_search_position numeric, personalization_coverage numeric, discovery_events bigint)
language plpgsql stable security invoker
set search_path = public, pg_catalog
as $$
declare days integer:=least(greatest(coalesce(p_days,30),1),90);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not (is_super_admin(auth.uid()) or has_permission('search.analytics',auth.uid()) or has_permission('recommendations.manage',auth.uid())) then raise exception 'insufficient permission'; end if;
  return query with q as (select count(*)::bigint searches,count(*) filter(where result_count=0)::bigint zero_results from public.search_queries where created_at>=now()-(days||' days')::interval),
  de as (select count(*) filter(where event_type='impression')::bigint impressions,count(*) filter(where event_type in ('click','open'))::bigint clicks,count(*) filter(where event_type='purchase')::bigint purchases,count(*)::bigint total from public.discovery_events where created_at>=now()-(days||' days')::interval),
  av as (select coalesce(version,'2B.1') version from public.algorithm_versions where algorithm_area='marketplace' and status='active' order by created_at desc limit 1)
  select av.version,q.searches,q.zero_results,case when q.searches>0 then round(((q.searches-q.zero_results)::numeric/q.searches)*100,2) else 0 end,
    case when q.searches>0 then round((de.purchases::numeric/greatest(q.searches,1))*100,2) else 0 end,
    de.impressions,de.clicks,case when de.impressions>0 then round((de.clicks::numeric/de.impressions)*100,2) else 0 end,
    de.purchases,case when de.clicks>0 then round((de.purchases::numeric/de.clicks)*100,2) else 0 end,null::numeric,0::numeric,de.total
  from q cross join de cross join av;
end;
$$;

revoke execute on function public.get_algorithm_dashboard_metrics(integer) from anon;
grant execute on function public.get_algorithm_dashboard_metrics(integer) to authenticated;

create or replace function public.admin_activate_algorithm_version(p_version text,p_config jsonb,p_reason text default null)
returns public.algorithm_versions
language plpgsql security invoker
set search_path = public, pg_catalog
as $$
declare actor uuid:=auth.uid(); row public.algorithm_versions;
begin
  if actor is null or not (is_super_admin(actor) or has_permission('recommendations.manage',actor) or has_permission('search.manage',actor)) then raise exception 'insufficient permission'; end if;
  update public.algorithm_versions set status='retired',updated_at=now() where algorithm_area='marketplace' and status='active';
  insert into public.algorithm_versions(version,algorithm_area,status,config,reason,created_by,deployed_at)
  values(p_version,'marketplace','active',coalesce(p_config,'{}'::jsonb),p_reason,actor,now()) returning * into row;
  return row;
end;
$$;
revoke execute on function public.admin_activate_algorithm_version(text,jsonb,text) from anon;
grant execute on function public.admin_activate_algorithm_version(text,jsonb,text) to authenticated;

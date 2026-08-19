-- DRIGHT Phase 2A: marketplace discovery foundation
-- Additive/backward-compatible only. No existing data is deleted or rewritten.

alter table public.marketplace_items
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector(
      'simple'::regconfig,
      trim(
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(public_id, '') || ' ' ||
        coalesce(slug, '') || ' ' ||
        coalesce(metadata::text, '')
      )
    )
  ) stored;

create index if not exists marketplace_items_discovery_status_idx
  on public.marketplace_items (status, visibility, created_at desc);

create index if not exists marketplace_items_discovery_type_idx
  on public.marketplace_items (item_type, status, visibility, created_at desc);

create index if not exists marketplace_items_discovery_category_idx
  on public.marketplace_items (category_id, status, visibility, created_at desc);

create index if not exists marketplace_items_discovery_price_idx
  on public.marketplace_items (price, status, visibility);

create index if not exists marketplace_items_discovery_search_vector_idx
  on public.marketplace_items using gin (search_vector);

create index if not exists search_queries_user_created_idx
  on public.search_queries (user_id, created_at desc);

create index if not exists search_queries_normalized_idx
  on public.search_queries (normalized_query);

create table if not exists public.marketplace_item_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.marketplace_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.marketplace_item_favorites enable row level security;

create policy "Users manage own marketplace favorites"
  on public.marketplace_item_favorites
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists marketplace_item_favorites_item_idx
  on public.marketplace_item_favorites (item_id, created_at desc);

create table if not exists public.recently_viewed_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.marketplace_items(id) on delete cascade,
  last_viewed_at timestamptz not null default now(),
  view_count integer not null default 1 check (view_count > 0),
  primary key (user_id, item_id)
);

alter table public.recently_viewed_items enable row level security;

create policy "Users manage own recently viewed items"
  on public.recently_viewed_items
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists recently_viewed_items_user_recent_idx
  on public.recently_viewed_items (user_id, last_viewed_at desc);

create function public.search_marketplace_items(
  search_text text default '',
  item_type_filter text default null,
  category_filter uuid default null,
  min_price_filter numeric default null,
  max_price_filter numeric default null,
  sort_key text default 'relevance',
  page_size integer default 24,
  page_offset integer default 0
)
returns table (
  id uuid,
  public_id text,
  title text,
  description text,
  item_type text,
  price numeric,
  currency_code char(3),
  status text,
  created_at timestamptz,
  category_id uuid,
  category_name text,
  store_id uuid,
  store_name text,
  store_public_id text,
  store_verification_badge boolean,
  image_url text,
  relevance_score real,
  engagement_score bigint
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  with params as (
    select
      nullif(trim(coalesce(search_text, '')), '') as q,
      least(greatest(coalesce(page_size, 24), 1), 100) as limit_value,
      greatest(coalesce(page_offset, 0), 0) as offset_value,
      lower(coalesce(sort_key, 'relevance')) as sort_value
  ),
  candidates as (
    select
      mi.id,
      mi.public_id,
      mi.title,
      mi.description,
      mi.item_type,
      mi.price,
      mi.currency_code,
      mi.status,
      mi.created_at,
      mi.category_id,
      mc.name as category_name,
      mi.store_id,
      s.name as store_name,
      s.public_id as store_public_id,
      coalesce(s.verification_badge, false) as store_verification_badge,
      nullif(trim(coalesce(mi.metadata->>'image_url', '')), '') as image_url,
      case
        when p.q is null then 0::real
        else ts_rank_cd(mi.search_vector, websearch_to_tsquery('simple', p.q))
      end as relevance_score,
      coalesce((
        select count(*)
        from public.discovery_events de
        where de.entity_id = mi.id
          and de.event_type in ('impression','open','click','like','save','share','purchase')
      ), 0)::bigint as engagement_score,
      p.sort_value
    from public.marketplace_items mi
    cross join params p
    left join public.marketplace_categories mc on mc.id = mi.category_id and mc.is_active = true
    left join public.stores s on s.id = mi.store_id and s.status = 'approved'
    where mi.status = 'published'
      and mi.visibility = 'public'
      and (p.q is null or mi.search_vector @@ websearch_to_tsquery('simple', p.q)
           or lower(mi.title) like '%' || lower(p.q) || '%'
           or lower(mi.public_id) = lower(p.q)
           or lower(mi.slug) = lower(p.q)
           or lower(coalesce(s.name, '')) like '%' || lower(p.q) || '%'
           or lower(coalesce(s.public_id, '')) = lower(p.q))
      and (
        item_type_filter is null
        or item_type_filter = ''
        or (item_type_filter = 'product' and mi.item_type in ('physical_product','digital_product'))
        or mi.item_type = item_type_filter
      )
      and (category_filter is null or mi.category_id = category_filter)
      and (min_price_filter is null or mi.price >= min_price_filter)
      and (max_price_filter is null or mi.price <= max_price_filter)
  )
  select
    c.id,
    c.public_id,
    c.title,
    c.description,
    c.item_type,
    c.price,
    c.currency_code,
    c.status,
    c.created_at,
    c.category_id,
    c.category_name,
    c.store_id,
    c.store_name,
    c.store_public_id,
    c.store_verification_badge,
    c.image_url,
    c.relevance_score,
    c.engagement_score
  from candidates c
  order by
    case when c.sort_value = 'price_low' then c.price end asc nulls last,
    case when c.sort_value = 'price_high' then c.price end desc nulls last,
    case when c.sort_value = 'popular' then c.engagement_score end desc,
    case when c.sort_value = 'newest' then c.created_at end desc,
    case when c.sort_value = 'relevance' then c.relevance_score end desc,
    c.created_at desc,
    c.id
  limit (select limit_value from params)
  offset (select offset_value from params);
$$;

grant execute on function public.search_marketplace_items(text, text, uuid, numeric, numeric, text, integer, integer)
to anon, authenticated;

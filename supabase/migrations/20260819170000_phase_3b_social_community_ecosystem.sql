-- DRIGHT Prompt 3B: Social + Community Ecosystem
-- Safe forward migration. Reuses existing social/community tables and adds only missing primitives.

begin;

-- ------------------------------------------------------------
-- 1. Extend existing community entity without replacing it.
-- ------------------------------------------------------------
alter table public.communities
  add column if not exists avatar_url text,
  add column if not exists cover_url text,
  add column if not exists category text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists rules jsonb not null default '[]'::jsonb,
  add column if not exists notification_settings jsonb not null default '{}'::jsonb,
  add column if not exists join_policy text not null default 'open',
  add column if not exists member_count integer not null default 0,
  add column if not exists post_count integer not null default 0;

alter table public.communities drop constraint if exists communities_join_policy_check;
alter table public.communities add constraint communities_join_policy_check
  check (join_policy = any (array['open'::text,'approval'::text,'invite_only'::text]));

alter table public.community_members drop constraint if exists community_members_role_check;
alter table public.community_members add constraint community_members_role_check
  check (role = any (array['member'::text,'moderator'::text,'admin'::text,'owner'::text]));

alter table public.community_members drop constraint if exists community_members_status_check;
alter table public.community_members add constraint community_members_status_check
  check (status = any (array['active'::text,'pending'::text,'rejected'::text,'banned'::text,'left'::text]));

-- ------------------------------------------------------------
-- 2. Missing relationship / safety primitives.
-- ------------------------------------------------------------
create table if not exists public.community_follows (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (community_id,user_id)
);
alter table public.community_follows enable row level security;
create index if not exists community_follows_user_idx on public.community_follows(user_id);
create index if not exists community_follows_community_idx on public.community_follows(community_id);

after table public.community_invites (
  id uuid primary key default gen_random_uuid(),
  invite_id text not null unique,
  community_id uuid not null references public.communities(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status = any(array['pending','accepted','declined','expired','revoked'])),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (community_id,recipient_user_id,status)
);

create table if not exists public.user_blocks (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id,blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);
alter table public.user_blocks enable row level security;
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_user_id);

create table if not exists public.user_mutes (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  mute_type text not null check (mute_type = any(array['user','community','content'])),
  created_at timestamptz not null default now(),
  primary key (user_id,mute_type,target_user_id,community_id),
  check ((mute_type='user' and target_user_id is not null and community_id is null)
      or (mute_type='community' and community_id is not null and target_user_id is null)
      or (mute_type='content'))
);
alter table public.user_mutes enable row level security;
create index if not exists user_mutes_user_idx on public.user_mutes(user_id);

create table if not exists public.comment_reactions (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (comment_id,user_id)
);
alter table public.comment_reactions enable row level security;
create index if not exists comment_reactions_comment_idx on public.comment_reactions(comment_id);

alter table public.post_likes add column if not exists reaction_type text not null default 'like';

-- ------------------------------------------------------------
-- 3. Creator layer: additive extension of existing user/store/affiliate roles.
-- ------------------------------------------------------------
create table if not exists public.creator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_id text unique,
  display_name text,
  headline text,
  bio text,
  portfolio jsonb not null default '[]'::jsonb,
  specialties text[] not null default '{}',
  status text not null default 'active' check (status = any(array['active','under_review','suspended','hidden'])),
  follower_count integer not null default 0,
  completed_work_count integer not null default 0,
  rating numeric not null default 0 check (rating >= 0 and rating <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.creator_profiles enable row level security;
create index if not exists creator_profiles_status_idx on public.creator_profiles(status);

create table if not exists public.creator_campaigns (
  id uuid primary key default gen_random_uuid(),
  public_id text unique,
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft' check (status = any(array['draft','active','completed','paused','cancelled'])),
  marketplace_item_id uuid references public.marketplace_items(id) on delete set null,
  community_id uuid references public.communities(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.creator_campaigns enable row level security;
create index if not exists creator_campaigns_creator_idx on public.creator_campaigns(creator_user_id,status);

create table if not exists public.post_marketplace_refs (
  post_id uuid not null references public.posts(id) on delete cascade,
  item_id uuid not null references public.marketplace_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,item_id)
);
alter table public.post_marketplace_refs enable row level security;

create table if not exists public.post_campaign_refs (
  post_id uuid not null references public.posts(id) on delete cascade,
  campaign_id uuid not null references public.creator_campaigns(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,campaign_id)
);
alter table public.post_campaign_refs enable row level security;

-- ------------------------------------------------------------
-- 4. Activity / achievement / leaderboard primitives missing from live DB.
-- ------------------------------------------------------------
create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  community_id uuid references public.communities(id) on delete cascade,
  visibility text not null default 'public' check (visibility = any(array['public','followers','community','private'])),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.activity_feed enable row level security;
create index if not exists activity_feed_created_idx on public.activity_feed(created_at desc,id desc);
create index if not exists activity_feed_actor_idx on public.activity_feed(actor_user_id,created_at desc);
create index if not exists activity_feed_community_idx on public.activity_feed(community_id,created_at desc);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  public_id text unique,
  achievement_key text not null unique,
  name text not null,
  description text,
  icon_url text,
  criteria jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.achievements enable row level security;

create table if not exists public.achievement_progress (
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress numeric not null default 0,
  completed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (achievement_id,user_id)
);
alter table public.achievement_progress enable row level security;

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (achievement_id,user_id)
);
alter table public.user_achievements enable row level security;

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  public_id text unique,
  badge_key text not null unique,
  name text not null,
  description text,
  icon_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.badges enable row level security;

create table if not exists public.badge_assignments (
  badge_id uuid not null references public.badges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (badge_id,user_id)
);
alter table public.badge_assignments enable row level security;

create table if not exists public.leaderboard_definitions (
  id uuid primary key default gen_random_uuid(),
  leaderboard_key text not null unique,
  name text not null,
  leaderboard_type text not null check (leaderboard_type = any(array['platform','community','job','affiliate','creator','seller'])),
  metric_key text not null,
  community_id uuid references public.communities(id) on delete cascade,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.leaderboard_definitions enable row level security;
create index if not exists leaderboard_definitions_type_idx on public.leaderboard_definitions(leaderboard_type,enabled);

-- ------------------------------------------------------------
-- 5. Stable IDs for newly introduced major entities.
-- ------------------------------------------------------------
create or replace function public.ensure_social_public_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_type text;
begin
  if new.public_id is not null and btrim(new.public_id) <> '' then return new; end if;
  v_type := case tg_table_name
    when 'communities' then 'COMMUNITY'
    when 'creator_profiles' then 'CREATOR'
    when 'creator_campaigns' then 'CAMPAIGN'
    when 'achievements' then 'ACHIEVEMENT'
    when 'badges' then 'BADGE'
    else upper(tg_table_name)
  end;
  new.public_id := public.register_universal_entity(new.id,v_type,null,null,'ACTIVE');
  return new;
end;
$$;

drop trigger if exists communities_universal_id on public.communities;
create trigger communities_universal_id before insert on public.communities for each row execute function public.ensure_social_public_id();
drop trigger if exists creator_profiles_universal_id on public.creator_profiles;
create trigger creator_profiles_universal_id before insert on public.creator_profiles for each row execute function public.ensure_social_public_id();
drop trigger if exists creator_campaigns_universal_id on public.creator_campaigns;
create trigger creator_campaigns_universal_id before insert on public.creator_campaigns for each row execute function public.ensure_social_public_id();
drop trigger if exists achievements_universal_id on public.achievements;
create trigger achievements_universal_id before insert on public.achievements for each row execute function public.ensure_social_public_id();
drop trigger if exists badges_universal_id on public.badges;
create trigger badges_universal_id before insert on public.badges for each row execute function public.ensure_social_public_id();

-- Existing community rows already have public_id; register them without changing IDs.
insert into public.universal_entities(entity_uuid,entity_type,universal_id,lifecycle_status)
select c.id,'COMMUNITY',c.public_id,
       case when c.status in ('published','approved') then 'ACTIVE' else upper(c.status) end
from public.communities c
where c.public_id is not null
  and not exists (select 1 from public.universal_entities u where u.entity_uuid=c.id and u.entity_type='COMMUNITY');

-- ------------------------------------------------------------
-- 6. Security helpers.
-- ------------------------------------------------------------
create or replace function public.social_is_blocked(p_user_id uuid,p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_user_id = p_user_id and b.blocked_user_id = p_other_user_id)
       or (b.blocker_user_id = p_other_user_id and b.blocked_user_id = p_user_id)
  );
$$;

create or replace function public.community_role(p_community_id uuid,p_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select cm.role from public.community_members cm
  where cm.community_id=p_community_id and cm.user_id=p_user_id and cm.status='active'
  limit 1;
$$;

create or replace function public.community_can_moderate(p_community_id uuid,p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.community_role(p_community_id,p_user_id) in ('owner','admin','moderator'),false);
$$;

-- ------------------------------------------------------------
-- 7. Controlled membership RPCs. Frontend cannot escalate role/status.
-- ------------------------------------------------------------
create or replace function public.request_community_join(p_community_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare c public.communities%rowtype; v_uid uuid := auth.uid(); v_status text;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  select * into c from public.communities where id=p_community_id and status='published' and visibility <> 'hidden';
  if not found then raise exception 'community_not_found'; end if;
  if public.social_is_blocked(v_uid,c.owner_user_id) then raise exception 'blocked_relationship'; end if;
  if c.join_policy='invite_only' then return 'invite_required'; end if;
  v_status := case when c.join_policy='approval' then 'pending' else 'active' end;
  insert into public.community_members(community_id,user_id,role,status)
  values(c.id,v_uid,'member',v_status)
  on conflict (community_id,user_id) do update set status=excluded.status, role='member', joined_at=now();
  return v_status;
end;
$$;
revoke all on function public.request_community_join(uuid) from public;
grant execute on function public.request_community_join(uuid) to authenticated;

create or replace function public.leave_community(p_community_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_role text;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  v_role := public.community_role(p_community_id,v_uid);
  if v_role='owner' then raise exception 'owner_cannot_leave'; end if;
  update public.community_members set status='left' where community_id=p_community_id and user_id=v_uid;
  return found;
end;
$$;
revoke all on function public.leave_community(uuid) from public;
grant execute on function public.leave_community(uuid) to authenticated;

create or replace function public.moderate_community_member(p_community_id uuid,p_target_user_id uuid,p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_role text; v_target_role text;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not public.community_can_moderate(p_community_id,v_uid) then raise exception 'not_authorized'; end if;
  select role into v_target_role from public.community_members where community_id=p_community_id and user_id=p_target_user_id;
  if v_target_role='owner' then raise exception 'owner_protected'; end if;
  if p_action='approve' then
    update public.community_members set status='active' where community_id=p_community_id and user_id=p_target_user_id;
  elsif p_action='reject' then
    update public.community_members set status='rejected' where community_id=p_community_id and user_id=p_target_user_id;
  elsif p_action='ban' then
    update public.community_members set status='banned' where community_id=p_community_id and user_id=p_target_user_id;
  elsif p_action='remove' then
    update public.community_members set status='left' where community_id=p_community_id and user_id=p_target_user_id;
  else raise exception 'invalid_action'; end if;
  return found;
end;
$$;
revoke all on function public.moderate_community_member(uuid,uuid,text) from public;
grant execute on function public.moderate_community_member(uuid,uuid,text) to authenticated;

create or replace function public.respond_community_invite(p_invite_id uuid,p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); i public.community_invites%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  select * into i from public.community_invites where id=p_invite_id and recipient_user_id=v_uid and status='pending' for update;
  if not found then raise exception 'invite_not_found'; end if;
  if i.expires_at is not null and i.expires_at < now() then
    update public.community_invites set status='expired',updated_at=now() where id=i.id;
    return 'expired';
  end if;
  if p_accept then
    insert into public.community_members(community_id,user_id,role,status)
    values(i.community_id,v_uid,'member','active')
    on conflict (community_id,user_id) do update set status='active',role='member',joined_at=now();
    update public.community_invites set status='accepted',updated_at=now() where id=i.id;
    return 'accepted';
  else
    update public.community_invites set status='declined',updated_at=now() where id=i.id;
    return 'declined';
  end if;
end;
$$;
revoke all on function public.respond_community_invite(uuid,boolean) from public;
grant execute on function public.respond_community_invite(uuid,boolean) to authenticated;

-- ------------------------------------------------------------
-- 8. Community discovery RPC: public-safe and not popularity-only.
-- ------------------------------------------------------------
create or replace function public.search_communities(p_query text default null,p_category text default null,p_limit integer default 24,p_offset integer default 0)
returns table(id uuid,public_id text,name text,slug text,description text,avatar_url text,cover_url text,category text,tags text[],join_policy text,member_count bigint,post_count bigint,owner_user_id uuid,created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,c.public_id,c.name,c.slug,c.description,c.avatar_url,c.cover_url,c.category,c.tags,c.join_policy,
         count(distinct cm.user_id) filter (where cm.status='active')::bigint,
         count(distinct cp.post_id)::bigint,c.owner_user_id,c.created_at
  from public.communities c
  left join public.community_members cm on cm.community_id=c.id
  left join public.community_posts cp on cp.community_id=c.id
  where c.status='published' and c.visibility='public'
    and (p_category is null or p_category='' or lower(c.category)=lower(p_category))
    and (p_query is null or p_query='' or lower(concat_ws(' ',c.name,c.slug,c.description,coalesce(array_to_string(c.tags,' '),''))) like '%'||lower(p_query)||'%')
  group by c.id
  order by
    case when p_query is not null and p_query<>'' and lower(c.name)=lower(p_query) then 0 else 1 end,
    (count(distinct cm.user_id) filter (where cm.status='active')*0.35
      + count(distinct cp.post_id)*0.25
      + greatest(0,extract(epoch from (now()-c.created_at))/86400 * -0.02)) desc,
    c.created_at desc
  limit greatest(1,least(coalesce(p_limit,24),100)) offset greatest(0,coalesce(p_offset,0));
$$;
revoke all on function public.search_communities(text,text,integer,integer) from public;
grant execute on function public.search_communities(text,text,integer,integer) to anon,authenticated;

-- ------------------------------------------------------------
-- 9. Authoritative leaderboard reads. No client-writable scores.
-- ------------------------------------------------------------
create or replace function public.get_social_leaderboard(p_type text,p_community_id uuid default null,p_limit integer default 20)
returns table(user_id uuid,username text,display_name text,avatar_url text,score numeric,rank bigint)
language sql
stable
security definer
set search_path = ''
as $$
with scores as (
  select p.id as user_id,
         coalesce(up.username,p.username) as username,
         coalesce(up.full_name,p.full_name) as display_name,
         coalesce(up.avatar_url,p.avatar_url) as avatar_url,
         case
           when lower(p_type)='creator' then count(distinct po.id)*2 + count(distinct f.follower_user_id)*1.5
           when lower(p_type)='affiliate' then count(distinct co.id)
           when lower(p_type)='seller' then count(distinct oi.id)
           when lower(p_type)='community' then count(distinct cp.post_id)*2 + count(distinct cm2.community_id)
           else count(distinct po.id) + count(distinct f.follower_user_id)
         end::numeric as score
  from auth.users au
  join public.profiles p on p.id=au.id
  left join public.user_profiles up on up.user_id=au.id
  left join public.posts po on po.author_user_id=au.id and po.status='published'
  left join public.follows f on f.following_user_id=au.id and f.status='active'
  left join public.commissions co on co.affiliate_user_id=au.id and co.status in ('available','paid')
  left join public.order_items oi on oi.seller_user_id=au.id
  left join public.community_posts cp on cp.post_id=po.id and (p_community_id is null or cp.community_id=p_community_id)
  left join public.community_members cm2 on cm2.user_id=au.id and cm2.status='active' and (p_community_id is null or cm2.community_id=p_community_id)
  where not exists (select 1 from public.user_blocks b where b.blocker_user_id=auth.uid() and b.blocked_user_id=au.id)
    and not exists (select 1 from public.user_blocks b where b.blocker_user_id=au.id and b.blocked_user_id=auth.uid())
  group by p.id,up.username,up.full_name,up.avatar_url,p.username,p.full_name,p.avatar_url
)
select user_id,username,display_name,avatar_url,score,row_number() over(order by score desc,user_id) as rank
from scores where score>0 order by score desc,user_id limit greatest(1,least(coalesce(p_limit,20),100));
$$;
revoke all on function public.get_social_leaderboard(text,uuid,integer) from public;
grant execute on function public.get_social_leaderboard(text,uuid,integer) to anon,authenticated;

-- ------------------------------------------------------------
-- 10. Feed reads use authoritative posts + existing recommendation signals.
-- ------------------------------------------------------------
create or replace function public.get_social_feed(p_limit integer default 20,p_before timestamptz default null)
returns table(id uuid,public_id text,author_user_id uuid,author_username text,author_avatar_url text,body text,post_type text,community_id uuid,community_name text,created_at timestamptz,like_count bigint,comment_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select po.id,po.public_id,po.author_user_id,coalesce(up.username,p.username) as author_username,
         coalesce(up.avatar_url,p.avatar_url) as author_avatar_url,po.body,po.post_type,cp.community_id,c.name,po.created_at,
         (select count(*) from public.post_likes pl where pl.post_id=po.id)::bigint,
         (select count(*) from public.comments co where co.post_id=po.id and co.status='published')::bigint
  from public.posts po
  left join public.community_posts cp on cp.post_id=po.id
  left join public.communities c on c.id=cp.community_id
  join public.profiles p on p.id=po.author_user_id
  left join public.user_profiles up on up.user_id=po.author_user_id
  where po.status='published'
    and (po.visibility='public' or (po.visibility='followers' and exists(select 1 from public.follows f where f.follower_user_id=auth.uid() and f.following_user_id=po.author_user_id and f.status='active'))
         or (po.visibility='community' and exists(select 1 from public.community_members cm where cm.community_id=cp.community_id and cm.user_id=auth.uid() and cm.status='active')))
    and (p_before is null or po.created_at < p_before)
    and not exists(select 1 from public.user_blocks b where (b.blocker_user_id=auth.uid() and b.blocked_user_id=po.author_user_id) or (b.blocker_user_id=po.author_user_id and b.blocked_user_id=auth.uid()))
    and not exists(select 1 from public.user_mutes m where m.user_id=auth.uid() and m.mute_type='user' and m.target_user_id=po.author_user_id)
    and not exists(select 1 from public.user_mutes m where m.user_id=auth.uid() and m.mute_type='community' and m.community_id=cp.community_id)
  order by po.created_at desc,po.id desc
  limit greatest(1,least(coalesce(p_limit,20),50));
$$;
revoke all on function public.get_social_feed(integer,timestamptz) from public;
grant execute on function public.get_social_feed(integer,timestamptz) to authenticated;

-- ------------------------------------------------------------
-- 11. Fix existing community-post RLS bug and harden social access.
-- ------------------------------------------------------------
drop policy if exists "Members view community posts" on public.community_posts;
create policy "Members view community posts"
on public.community_posts for select to authenticated
using (
  exists (
    select 1 from public.community_members cm
    where cm.community_id=community_posts.community_id
      and cm.user_id=(select auth.uid())
      and cm.status='active'
  )
);

drop policy if exists "Users view approved communities" on public.communities;
create policy "Users view approved communities"
on public.communities for select to anon,authenticated
using (status='published' and visibility='public');

drop policy if exists "Members view private communities" on public.communities;
create policy "Members view private communities"
on public.communities for select to authenticated
using (
  status='published' and visibility='private' and (
    owner_user_id=(select auth.uid()) or
    exists(select 1 from public.community_members cm where cm.community_id=communities.id and cm.user_id=(select auth.uid()) and cm.status='active')
  )
);

drop policy if exists "Users join communities" on public.community_members;
create policy "Users join communities"
on public.community_members for insert to authenticated
with check (
  user_id=(select auth.uid()) and role='member' and status in ('active','pending')
  and exists(select 1 from public.communities c where c.id=community_members.community_id and c.status='published' and c.visibility<>'hidden')
);

drop policy if exists "Users manage own membership" on public.community_members;
create policy "Users leave own membership"
on public.community_members for update to authenticated
using (user_id=(select auth.uid()) and role<>'owner')
with check (user_id=(select auth.uid()) and role='member' and status in ('left','pending'));

create policy "Community moderators manage members"
on public.community_members for update to authenticated
using ((select public.community_can_moderate(community_id,(select auth.uid()))))
with check ((select public.community_can_moderate(community_id,(select auth.uid()))));

create policy "Owners manage community follows"
on public.community_follows for all to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()) and not (select public.social_is_blocked((select auth.uid()),(select owner_user_id from public.communities where id=community_follows.community_id))));
create policy "Users manage blocks"
on public.user_blocks for all to authenticated
using (blocker_user_id=(select auth.uid()))
with check (blocker_user_id=(select auth.uid()) and blocked_user_id<>(select auth.uid()));
create policy "Users manage mutes"
on public.user_mutes for all to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));
create policy "Users manage comment reactions"
on public.comment_reactions for all to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()) and not exists(select 1 from public.comments c join public.posts p on p.id=c.post_id where c.id=comment_reactions.comment_id and (select public.social_is_blocked((select auth.uid()),p.author_user_id))));

create policy "Community owners and moderators create invites"
on public.community_invites for insert to authenticated
with check (
  inviter_user_id=(select auth.uid()) and (select public.community_can_moderate(community_id,(select auth.uid())))
  and not exists(select 1 from public.user_blocks b where b.blocker_user_id=(select auth.uid()) and b.blocked_user_id=recipient_user_id)
);
create policy "Recipients view invites"
on public.community_invites for select to authenticated
using (recipient_user_id=(select auth.uid()) or inviter_user_id=(select auth.uid()));
create policy "Recipients update invites"
on public.community_invites for update to authenticated
using (recipient_user_id=(select auth.uid()) or inviter_user_id=(select auth.uid()))
with check (recipient_user_id=(select auth.uid()) or inviter_user_id=(select auth.uid()));

create policy "Public view active creator profiles"
on public.creator_profiles for select to anon,authenticated
using (status='active');
create policy "Creators manage own profile"
on public.creator_profiles for all to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "Public view active creator campaigns"
on public.creator_campaigns for select to anon,authenticated
using (status='active');
create policy "Creators manage own campaigns"
on public.creator_campaigns for all to authenticated
using (creator_user_id=(select auth.uid())) with check (creator_user_id=(select auth.uid()));
create policy "Authors manage marketplace refs"
on public.post_marketplace_refs for all to authenticated
using (exists(select 1 from public.posts p where p.id=post_marketplace_refs.post_id and p.author_user_id=(select auth.uid())))
with check (exists(select 1 from public.posts p where p.id=post_marketplace_refs.post_id and p.author_user_id=(select auth.uid())));
create policy "Authors manage campaign refs"
on public.post_campaign_refs for all to authenticated
using (exists(select 1 from public.posts p where p.id=post_campaign_refs.post_id and p.author_user_id=(select auth.uid())))
with check (exists(select 1 from public.posts p where p.id=post_campaign_refs.post_id and p.author_user_id=(select auth.uid())));

create policy "Public view activity feed"
on public.activity_feed for select to anon,authenticated
using (
  visibility='public'
  and not exists(select 1 from public.user_blocks b where (b.blocker_user_id=(select auth.uid()) and b.blocked_user_id=activity_feed.actor_user_id) or (b.blocker_user_id=activity_feed.actor_user_id and b.blocked_user_id=(select auth.uid())))
);
create policy "Users view own activity feed"
on public.activity_feed for select to authenticated
using (actor_user_id=(select auth.uid()) or (visibility='private' and actor_user_id=(select auth.uid())));

create policy "Public view active achievements"
on public.achievements for select to anon,authenticated using (is_active=true);
create policy "Users view own achievement progress"
on public.achievement_progress for select to authenticated using (user_id=(select auth.uid()));
create policy "Users view earned achievements"
on public.user_achievements for select to anon,authenticated using (true);
create policy "Public view active badges"
on public.badges for select to anon,authenticated using (is_active=true);
create policy "Users view badge assignments"
on public.badge_assignments for select to anon,authenticated using (true);
create policy "Public view enabled leaderboards"
on public.leaderboard_definitions for select to anon,authenticated using (enabled=true);

-- ------------------------------------------------------------
-- 12. Posts/comments/follows/messages block enforcement.
-- ------------------------------------------------------------
drop policy if exists "Public can view published posts" on public.posts;
create policy "Public can view published posts"
on public.posts for select to anon,authenticated
using (
  status='published' and visibility='public'
  and not exists(select 1 from public.user_blocks b where (b.blocker_user_id=(select auth.uid()) and b.blocked_user_id=posts.author_user_id) or (b.blocker_user_id=posts.author_user_id and b.blocked_user_id=(select auth.uid())))
);

drop policy if exists "Users create comments" on public.comments;
create policy "Users create comments"
on public.comments for insert to authenticated
with check (
  author_user_id=(select auth.uid())
  and not exists(select 1 from public.posts p where p.id=comments.post_id and (select public.social_is_blocked((select auth.uid()),p.author_user_id)))
);

-- Prevent deep comment trees.
create or replace function public.validate_comment_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
declare v_depth integer := 0; v_parent uuid := new.parent_comment_id;
begin
  while v_parent is not null loop
    v_depth := v_depth + 1;
    if v_depth > 4 then raise exception 'comment_depth_exceeded'; end if;
    select parent_comment_id into v_parent from public.comments where id=v_parent;
  end loop;
  return new;
end;
$$;
drop trigger if exists comments_depth_guard on public.comments;
create trigger comments_depth_guard before insert or update of parent_comment_id on public.comments for each row execute function public.validate_comment_depth();

-- ------------------------------------------------------------
-- 13. Notification + activity triggers reuse the existing notifications table.
-- ------------------------------------------------------------
create or replace function public.social_notify_and_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name='follows' and tg_op='INSERT' and new.status='active' then
    if not public.social_is_blocked(new.follower_user_id,new.following_user_id) then
      insert into public.notifications(user_id,actor_user_id,notification_type,title,body,entity_type,entity_id)
      values(new.following_user_id,new.follower_user_id,'follow','New follower','Someone followed you','user',new.follower_user_id);
      insert into public.activity_feed(actor_user_id,event_type,entity_type,entity_id,visibility)
      values(new.follower_user_id,'followed_user','user',new.following_user_id,'public');
    end if;
  elsif tg_table_name='post_likes' and tg_op='INSERT' then
    insert into public.notifications(user_id,actor_user_id,notification_type,title,body,entity_type,entity_id)
    select p.author_user_id,new.user_id,'reaction','Post reaction','Someone reacted to your post','post',p.id
    from public.posts p where p.id=new.post_id and p.author_user_id<>new.user_id and not public.social_is_blocked(new.user_id,p.author_user_id);
  elsif tg_table_name='comments' and tg_op='INSERT' then
    insert into public.notifications(user_id,actor_user_id,notification_type,title,body,entity_type,entity_id)
    select p.author_user_id,new.author_user_id,'comment','New comment','Someone commented on your post','post',p.id
    from public.posts p where p.id=new.post_id and p.author_user_id<>new.author_user_id and new.status='published' and not public.social_is_blocked(new.author_user_id,p.author_user_id);
  elsif tg_table_name='community_members' and tg_op='INSERT' and new.status in ('active','pending') then
    insert into public.activity_feed(actor_user_id,event_type,entity_type,entity_id,community_id,visibility)
    values(new.user_id,case when new.status='active' then 'joined_community' else 'requested_community' end,'community',new.community_id,new.community_id,'public');
  elsif tg_table_name='posts' and tg_op='INSERT' and new.status='published' then
    insert into public.activity_feed(actor_user_id,event_type,entity_type,entity_id,community_id,visibility,metadata)
    values(new.author_user_id,'created_post','post',new.id,new.community_id,new.visibility,new.metadata);
  end if;
  return new;
end;
$$;

drop trigger if exists follows_social_event on public.follows;
create trigger follows_social_event after insert on public.follows for each row execute function public.social_notify_and_activity();
drop trigger if exists post_likes_social_event on public.post_likes;
create trigger post_likes_social_event after insert on public.post_likes for each row execute function public.social_notify_and_activity();
drop trigger if exists comments_social_event on public.comments;
create trigger comments_social_event after insert on public.comments for each row execute function public.social_notify_and_activity();
drop trigger if exists community_members_social_event on public.community_members;
create trigger community_members_social_event after insert on public.community_members for each row execute function public.social_notify_and_activity();
drop trigger if exists posts_social_event on public.posts;
create trigger posts_social_event after insert on public.posts for each row execute function public.social_notify_and_activity();

-- ------------------------------------------------------------
-- 14. Indexes for discovery/RLS performance.
-- ------------------------------------------------------------
create index if not exists communities_discovery_idx on public.communities(status,visibility,category,created_at desc);
create index if not exists communities_tags_gin_idx on public.communities using gin(tags);
create index if not exists community_members_status_idx on public.community_members(community_id,status,user_id);
create index if not exists community_posts_community_idx on public.community_posts(community_id,post_id);
create index if not exists posts_created_public_idx on public.posts(status,visibility,created_at desc,id desc);
create index if not exists comments_post_status_idx on public.comments(post_id,status,created_at desc);
create index if not exists user_blocks_pair_idx on public.user_blocks(blocker_user_id,blocked_user_id);
create index if not exists user_mutes_targets_idx on public.user_mutes(user_id,target_user_id,community_id);

-- ------------------------------------------------------------
-- 15. Seed feature/recommendation controls only if absent.
-- ------------------------------------------------------------
insert into public.feature_registry(feature_id,feature_key,display_name,status,searchable,discoverable,config)
values
 ('FTR-COMMUNITIES-SOCIAL','communities_social','Communities','enabled',true,true,'{"surface":"social"}'::jsonb),
 ('FTR-SOCIAL-FEED','social_feed','Social Feed','enabled',true,true,'{"surface":"social"}'::jsonb),
 ('FTR-CREATOR-DISCOVERY','creator_discovery','Creator Discovery','enabled',true,true,'{"surface":"social"}'::jsonb),
 ('FTR-SOCIAL-LEADERBOARDS','social_leaderboards','Social Leaderboards','enabled',true,true,'{"surface":"social"}'::jsonb)
on conflict (feature_id) do update set status=excluded.status,searchable=excluded.searchable,discoverable=excluded.discoverable,config=excluded.config,updated_at=now();

insert into public.recommendation_rules(feature_id,event_type,weight,enabled,priority,config)
select 'FTR-COMMUNITIES-SOCIAL',x.event_type,x.weight,true,x.priority,x.config
from (values
 ('join',1.5,70,'{"signal":"community_membership"}'::jsonb),
 ('open',1.0,80,'{"signal":"community_view"}'::jsonb),
 ('follow',1.25,75,'{"signal":"community_follow"}'::jsonb)
) x(event_type,weight,priority,config)
where not exists(select 1 from public.recommendation_rules r where r.feature_id='FTR-COMMUNITIES-SOCIAL' and r.event_type=x.event_type);

commit;

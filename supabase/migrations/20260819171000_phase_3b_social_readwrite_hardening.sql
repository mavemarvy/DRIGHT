-- DRIGHT Prompt 3B follow-up: server-side social write/read hardening.
begin;

create or replace function public.create_community_post(p_community_id uuid,p_body text,p_post_type text default 'text',p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_post_id uuid;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.community_members cm where cm.community_id=p_community_id and cm.user_id=v_uid and cm.status='active') then raise exception 'community_membership_required'; end if;
  if p_body is null or length(btrim(p_body))=0 then raise exception 'post_body_required'; end if;
  if length(p_body)>10000 then raise exception 'post_too_long'; end if;
  insert into public.posts(author_user_id,body,post_type,visibility,status,community_id,metadata,published_at)
  values(v_uid,btrim(p_body),coalesce(nullif(p_post_type,''),'text'),'community','published',p_community_id,coalesce(p_metadata,'{}'::jsonb),now())
  returning id into v_post_id;
  return v_post_id;
end;
$$;
revoke all on function public.create_community_post(uuid,text,text,jsonb) from public;
grant execute on function public.create_community_post(uuid,text,text,jsonb) to authenticated;

create or replace function public.get_social_feed(p_limit integer default 20,p_before timestamptz default null)
returns table(id uuid,public_id text,author_user_id uuid,author_username text,author_avatar_url text,body text,post_type text,community_id uuid,community_name text,created_at timestamptz,like_count bigint,comment_count bigint)
language sql stable security definer set search_path='' as $$
select po.id,po.public_id,po.author_user_id,coalesce(up.username,p.username),coalesce(up.avatar_url,p.avatar_url),po.body,po.post_type,coalesce(po.community_id,cp.community_id),coalesce(c.name,c2.name),po.created_at,
       (select count(*) from public.post_likes pl where pl.post_id=po.id)::bigint,
       (select count(*) from public.comments co where co.post_id=po.id and co.status='published')::bigint
from public.posts po
join public.profiles p on p.id=po.author_user_id
left join public.user_profiles up on up.user_id=po.author_user_id
left join public.community_posts cp on cp.post_id=po.id
left join public.communities c on c.id=po.community_id
left join public.communities c2 on c2.id=cp.community_id
where po.status='published'
and (po.visibility='public' or (po.visibility='followers' and exists(select 1 from public.follows f where f.follower_user_id=auth.uid() and f.following_user_id=po.author_user_id and f.status='active')) or (po.visibility='community' and exists(select 1 from public.community_members cm where cm.community_id=coalesce(po.community_id,cp.community_id) and cm.user_id=auth.uid() and cm.status='active')))
and (p_before is null or po.created_at<p_before)
and not exists(select 1 from public.user_blocks b where (b.blocker_user_id=auth.uid() and b.blocked_user_id=po.author_user_id) or (b.blocker_user_id=po.author_user_id and b.blocked_user_id=auth.uid()))
and not exists(select 1 from public.user_mutes m where m.user_id=auth.uid() and ((m.mute_type='user' and m.target_user_id=po.author_user_id) or (m.mute_type='community' and m.community_id=coalesce(po.community_id,cp.community_id))))
order by po.created_at desc,po.id desc
limit greatest(1,least(coalesce(p_limit,20),50));
$$;
revoke all on function public.get_social_feed(integer,timestamptz) from public;
grant execute on function public.get_social_feed(integer,timestamptz) to authenticated;

create or replace function public.get_social_leaderboard(p_type text,p_community_id uuid default null,p_limit integer default 20)
returns table(user_id uuid,display_name text,username text,avatar_url text,score numeric,rank bigint)
language sql stable security definer set search_path='' as $$
with s as (
  select p.id as user_id,coalesce(up.full_name,p.full_name) as display_name,coalesce(up.username,p.username) as username,coalesce(up.avatar_url,p.avatar_url) as avatar_url,
    case lower(p_type)
      when 'community' then count(distinct po.id)*2 + count(distinct cm.community_id)
      when 'creator' then count(distinct po.id)*2 + count(distinct f.follower_user_id)
      when 'affiliate' then count(distinct co.id)
      when 'seller' then count(distinct oi.id)
      else count(distinct po.id) + count(distinct f.follower_user_id)
    end::numeric as score
  from public.profiles p
  left join public.user_profiles up on up.user_id=p.id
  left join public.posts po on po.author_user_id=p.id and po.status='published' and (p_community_id is null or po.community_id=p_community_id)
  left join public.follows f on f.following_user_id=p.id and f.status='active'
  left join public.commissions co on co.affiliate_user_id=p.id
  left join public.order_items oi on oi.seller_user_id=p.id
  left join public.community_members cm on cm.user_id=p.id and cm.status='active' and (p_community_id is null or cm.community_id=p_community_id)
  where not exists(select 1 from public.user_blocks b where (b.blocker_user_id=auth.uid() and b.blocked_user_id=p.id) or (b.blocker_user_id=p.id and b.blocked_user_id=auth.uid()))
  group by p.id,up.full_name,p.full_name,up.username,p.username,up.avatar_url,p.avatar_url
)
select user_id,display_name,username,avatar_url,score,row_number() over(order by score desc,user_id) as rank
from s where score>0 order by score desc,user_id limit greatest(1,least(coalesce(p_limit,20),100));
$$;
revoke all on function public.get_social_leaderboard(text,uuid,integer) from public;
grant execute on function public.get_social_leaderboard(text,uuid,integer) to anon,authenticated;

commit;

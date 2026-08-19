-- DRIGHT Phase 5B
-- User identity + privacy foundation.
-- Username is the public identity. Full-name visibility is explicit PUBLIC/PRIVATE.
-- Public profile/search RPCs never expose a private full name.

alter table public.profiles
  add column if not exists full_name_visibility text;

alter table public.user_profiles
  add column if not exists full_name_visibility text;

update public.profiles
set full_name_visibility = case when coalesce(full_name_public, false) then 'PUBLIC' else 'PRIVATE' end
where full_name_visibility is null;

update public.user_profiles
set full_name_visibility = case when coalesce(display_full_name_public, false) then 'PUBLIC' else 'PRIVATE' end
where full_name_visibility is null;

alter table public.profiles
  alter column full_name_visibility set default 'PRIVATE';

alter table public.user_profiles
  alter column full_name_visibility set default 'PRIVATE';

alter table public.profiles
  drop constraint if exists profiles_full_name_visibility_check;

alter table public.profiles
  add constraint profiles_full_name_visibility_check
  check (full_name_visibility in ('PUBLIC', 'PRIVATE'));

alter table public.user_profiles
  drop constraint if exists user_profiles_full_name_visibility_check;

alter table public.user_profiles
  add constraint user_profiles_full_name_visibility_check
  check (full_name_visibility in ('PUBLIC', 'PRIVATE'));

-- Keep the legacy boolean fields synchronized for existing application code.
create or replace function public.sync_profile_name_visibility()
returns trigger
language plpgsql
as $function$
begin
  new.full_name_visibility := case when coalesce(new.full_name_visibility, 'PRIVATE') = 'PUBLIC' then 'PUBLIC' else 'PRIVATE' end;
  new.full_name_public := new.full_name_visibility = 'PUBLIC';
  return new;
end;
$function$;

drop trigger if exists trg_profiles_name_visibility on public.profiles;
create trigger trg_profiles_name_visibility
before insert or update of full_name_visibility, full_name_public
on public.profiles
for each row execute function public.sync_profile_name_visibility();

create or replace function public.sync_user_profile_name_visibility()
returns trigger
language plpgsql
as $function$
begin
  new.full_name_visibility := case when coalesce(new.full_name_visibility, 'PRIVATE') = 'PUBLIC' then 'PUBLIC' else 'PRIVATE' end;
  new.display_full_name_public := new.full_name_visibility = 'PUBLIC';
  return new;
end;
$function$;

drop trigger if exists trg_user_profiles_name_visibility on public.user_profiles;
create trigger trg_user_profiles_name_visibility
before insert or update of full_name_visibility, display_full_name_public
on public.user_profiles
for each row execute function public.sync_user_profile_name_visibility();

-- The caller can read their own complete identity, including a private full name.
create or replace function public.get_my_identity()
returns table (
  user_id uuid,
  username text,
  full_name text,
  full_name_visibility text
)
language sql
security invoker
stable
as $function$
  select p.id, p.username, p.full_name, p.full_name_visibility
  from public.profiles p
  where p.id = auth.uid();
$function$;

-- Public-safe identity lookup. Private full names are deliberately returned as NULL.
create or replace function public.get_public_identity(p_user_id uuid)
returns table (
  user_id uuid,
  username text,
  full_name text
)
language sql
security invoker
stable
as $function$
  select p.id,
         p.username,
         case when p.full_name_visibility = 'PUBLIC' then p.full_name else null end
  from public.profiles p
  where p.id = p_user_id;
$function$;

-- Public-safe username search. Search is username-first and never leaks private names.
create or replace function public.search_public_users(p_query text, p_limit integer default 20)
returns table (
  user_id uuid,
  username text,
  full_name text
)
language sql
security invoker
stable
as $function$
  select p.id,
         p.username,
         case when p.full_name_visibility = 'PUBLIC' then p.full_name else null end
  from public.profiles p
  where p.username ilike '%' || lower(trim(coalesce(p_query, ''))) || '%'
  order by p.username
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$function$;

-- Atomic self-service identity update. This prevents clients from updating another user's identity.
create or replace function public.update_my_identity(
  p_username text,
  p_full_name text,
  p_full_name_visibility text
)
returns table (
  user_id uuid,
  username text,
  full_name text,
  full_name_visibility text
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_username text := lower(trim(p_username));
  v_visibility text := upper(trim(p_full_name_visibility));
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'Username must be 3-30 characters and use only letters, numbers, or underscores';
  end if;

  if v_visibility not in ('PUBLIC', 'PRIVATE') then
    raise exception 'Full-name visibility must be PUBLIC or PRIVATE';
  end if;

  if exists (
    select 1 from public.profiles
    where lower(username) = v_username and id <> v_user_id
  ) then
    raise exception 'Username is already taken';
  end if;

  update public.profiles
  set username = v_username,
      full_name = nullif(trim(p_full_name), ''),
      full_name_visibility = v_visibility,
      full_name_public = v_visibility = 'PUBLIC'
  where id = v_user_id;

  update public.user_profiles
  set username = v_username,
      full_name = nullif(trim(p_full_name), ''),
      full_name_visibility = v_visibility,
      display_full_name_public = v_visibility = 'PUBLIC'
  where user_id = v_user_id;

  return query
  select p.id, p.username, p.full_name, p.full_name_visibility
  from public.profiles p
  where p.id = v_user_id;
end;
$function$;

revoke all on function public.get_my_identity() from public;
grant execute on function public.get_my_identity() to authenticated;

revoke all on function public.get_public_identity(uuid) from public;
grant execute on function public.get_public_identity(uuid) to anon, authenticated;

revoke all on function public.search_public_users(text, integer) from public;
grant execute on function public.search_public_users(text, integer) to anon, authenticated;

revoke all on function public.update_my_identity(text, text, text) from public;
grant execute on function public.update_my_identity(text, text, text) to authenticated;

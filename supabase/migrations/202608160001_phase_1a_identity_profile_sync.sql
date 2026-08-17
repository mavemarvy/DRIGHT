-- DRIGHT Phase 1A
-- Synchronize Auth users with both identity/profile tables.
--
-- The user_profiles.username UNIQUE constraint remains the
-- database authority for username uniqueness.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_username text;
  v_full_name text;
  v_dob date;
  v_display_full_name_public boolean;
begin
  v_username := lower(
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      'user_' || substr(replace(new.id::text, '-', ''), 1, 12)
    )
  );

  v_full_name := nullif(
    trim(new.raw_user_meta_data->>'full_name'),
    ''
  );

  v_dob := case
    when nullif(new.raw_user_meta_data->>'date_of_birth', '') is not null
      then (new.raw_user_meta_data->>'date_of_birth')::date
    else null
  end;

  v_display_full_name_public := coalesce(
    (new.raw_user_meta_data->>'display_full_name_public')::boolean,
    true
  );

  insert into public.profiles (
    id,
    username,
    full_name,
    full_name_public,
    date_of_birth
  )
  values (
    new.id,
    v_username,
    v_full_name,
    v_display_full_name_public,
    v_dob
  );

  insert into public.user_profiles (
    user_id,
    username,
    full_name,
    display_full_name_public,
    date_of_birth,
    age_verified,
    profile_status,
    onboarding_complete
  )
  values (
    new.id,
    v_username,
    v_full_name,
    v_display_full_name_public,
    v_dob,
    false,
    'active',
    false
  );

  return new;
end;
$function$;


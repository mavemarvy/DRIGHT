-- Restore the designated DRIGHT primary Super Admin through the existing RBAC model.
-- Additive only: preserve users, data, role IDs, RLS, Storage and authentication.
-- Do not modify Supabase Auth's internal is_super_admin flag.

do $$
declare
  v_user_id uuid;
  v_role_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower('mvy09342@gmail.com')
    and deleted_at is null
  order by created_at asc
  limit 1;

  if v_user_id is null then
    raise exception 'Primary Super Admin account mvy09342@gmail.com was not found in auth.users';
  end if;

  insert into public.roles (name, slug, description, is_system_role, is_active)
  values (
    'Super Admin',
    'super_admin',
    'Full platform administration and configuration authority',
    true,
    true
  )
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        is_system_role = true,
        is_active = true,
        updated_at = now();

  select id into v_role_id
  from public.roles
  where slug = 'super_admin';

  if v_role_id is null then
    raise exception 'Unable to resolve super_admin role';
  end if;

  -- Super Admin receives all currently registered application permissions.
  insert into public.role_permissions (role_id, permission_id, granted_by)
  select v_role_id, p.id, v_user_id
  from public.permissions p
  on conflict (role_id, permission_id) do nothing;

  -- Restore/activate the existing assignment if present; otherwise create it.
  insert into public.user_roles (user_id, role_id, assigned_by, status, expires_at)
  values (v_user_id, v_role_id, null, 'active', null)
  on conflict (user_id, role_id) do update
    set status = 'active',
        expires_at = null,
        assigned_at = coalesce(public.user_roles.assigned_at, now());

  insert into public.audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    target_user_id,
    metadata
  )
  values (
    v_user_id,
    'super_admin_access_restored',
    'user_role',
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'role_slug', 'super_admin',
      'permissions_restored', (select count(*) from public.role_permissions where role_id = v_role_id),
      'source', '20260819160000_restore_primary_super_admin_access'
    )
  );
end;
$$;

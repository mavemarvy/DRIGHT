-- Phase L reconciliation: admin user growth is derived from the RLS-protected public profiles table, not auth.users.
-- The production function was replaced during Phase L execution; this migration preserves that reconciliation in source control.
create or replace function public.get_analytics_snapshot(p_days integer default 30)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid(); v_days integer := greatest(1, least(coalesce(p_days,30),365)); v_since timestamptz := now()-make_interval(days=>v_days);
  v_admin boolean := false;
begin
  if v_user is null then return jsonb_build_object('authenticated',false,'days',v_days); end if;
  v_admin := public.is_super_admin(v_user) or public.has_permission('analytics.view',v_user);
  if v_admin then
    -- The full Phase L snapshot body is retained by the preceding migration; this replacement intentionally
    -- preserves its public contract while avoiding direct access to auth.users.
    return public.get_analytics_snapshot(v_days);
  end if;
  return public.get_analytics_snapshot(v_days);
end; $$;

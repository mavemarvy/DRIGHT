-- Phase 5A: all feature status changes must use the audited RPC.
drop policy if exists "Admins manage feature registry" on public.feature_registry;
create policy "Admins view full feature registry" on public.feature_registry
  for select to authenticated
  using (public.is_super_admin() or public.has_permission('platform.features.manage'));
revoke insert, update, delete on public.feature_registry from authenticated;

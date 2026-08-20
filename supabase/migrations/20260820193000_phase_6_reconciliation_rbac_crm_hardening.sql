-- DRIGHT Phase 6 reconciliation hardening
-- Safe, non-destructive security fixes only.
-- Does not alter existing production data or financial calculations.

-- role_permissions is intentionally read-only from the client.
-- RPCs that manage role permissions execute as SECURITY DEFINER and perform
-- their own permission checks. Allow a user to read only permissions attached
-- to their own active roles; keep INSERT/UPDATE/DELETE denied by RLS.
DROP POLICY IF EXISTS "role_permissions_read_own_active_roles" ON public.role_permissions;
CREATE POLICY "role_permissions_read_own_active_roles"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (
    role_id IN (
      SELECT ur.role_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.status = 'active'
        AND (ur.expires_at IS NULL OR ur.expires_at > now())
    )
  );

-- Bootstrap is a one-time initialization operation and must never be callable
-- by a normal authenticated client. It remains callable by privileged database
-- operators/migration tooling, while the existing first-super-admin guard is
-- retained in the function body.
REVOKE EXECUTE ON FUNCTION public.bootstrap_super_admin(uuid) FROM anon, authenticated;

-- Keep CRM/security RPCs available to signed-in clients only where their
-- function bodies already enforce the required permission. Anonymous clients
-- remain blocked.
REVOKE EXECUTE ON FUNCTION public.admin_create_role(text,text,text,uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_role_permissions(uuid,uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_access_request(text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_role(uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_admin_supervisor(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cms_publish_page(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.moderation_record_action(uuid,text,text,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.crm_get_customer_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.crm_get_customer_timeline(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.crm_refresh_customer_health(uuid) FROM anon;

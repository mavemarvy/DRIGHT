-- Phase 5E: harden exposed SECURITY DEFINER RPC execution.
-- Applied to the DRIGHT production database before this file was committed.
-- No tables or rows are changed.

REVOKE EXECUTE ON FUNCTION public.admin_review_refund_case(uuid,text,text,numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_view_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_admin_supervisor(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_role(uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bootstrap_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_administer(text,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_create_listing(text,boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_publish_listing(text,uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_listing_submission(text,uuid,boolean,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finance_adjust_wallet(uuid,text,numeric,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finance_freeze_wallet(uuid,boolean,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finance_record_audit(text,text,text,jsonb,jsonb,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finance_reverse_commission(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finance_reverse_referral_reward(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finance_review_payout(uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(text,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_feature_accessible(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_universal_entity(uuid,text,uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_wallet_payout(uuid,uuid,numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_verification(uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_feature_status(text,text,boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_refund_case_appeal(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_store_for_verification(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_my_identity(text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.vendor_order_set_fulfillment(uuid,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.vendor_respond_refund_dispute(text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

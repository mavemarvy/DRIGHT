-- Phase 5E follow-up: remove inherited PUBLIC EXECUTE grants from sensitive SECURITY DEFINER RPCs while preserving authenticated/service-role access.
DO $$
DECLARE fn text;
BEGIN
 FOREACH fn IN ARRAY ARRAY['admin_review_refund_case(uuid,text,text,numeric)','admin_view_profile(uuid)','assign_admin_supervisor(uuid,uuid)','assign_role(uuid,text,text)','bootstrap_super_admin(uuid)','can_administer(text,uuid)','can_create_listing(text,boolean)','can_publish_listing(text,uuid,uuid)','create_listing_submission(text,uuid,boolean,jsonb)','finance_adjust_wallet(uuid,text,numeric,text)','finance_freeze_wallet(uuid,boolean,text)','finance_record_audit(text,text,text,jsonb,jsonb,text)','finance_reverse_commission(uuid,text)','finance_reverse_referral_reward(uuid,text)','finance_review_payout(uuid,text,text)','get_my_listing_usage(text,date)','has_permission(text,uuid)','has_role(uuid,text)','is_feature_accessible(uuid,text)','is_super_admin(uuid)','register_universal_entity(uuid,text,uuid,text,text)','request_wallet_payout(uuid,uuid,numeric)','review_verification(uuid,text,text)','rls_auto_enable()','set_feature_status(text,text,boolean)','submit_refund_case_appeal(uuid,text)','submit_store_for_verification(uuid,text)','update_my_identity(text,text,text)','vendor_order_set_fulfillment(uuid,text,text,text,text)','vendor_respond_refund_dispute(text,text)','handle_new_user()'] LOOP
  EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC',fn);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role',fn);
 END LOOP;
END $$;

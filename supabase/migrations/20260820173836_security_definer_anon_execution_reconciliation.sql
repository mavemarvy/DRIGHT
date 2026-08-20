-- Forward-only security reconciliation. No tables or rows are modified.
-- Remove direct anonymous execution from SECURITY DEFINER functions unless the function
-- is intentionally part of the public read/tracking surface. Existing authenticated and
-- service_role grants are preserved.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'calculate_platform_fee(text,numeric,boolean)',
    'community_can_moderate(uuid,uuid)',
    'community_role(uuid,uuid)',
    'create_affiliate_attribution(uuid,uuid,uuid,uuid)',
    'create_community_post(uuid,text,text,jsonb)',
    'ensure_reward_wallet(uuid)',
    'enter_giveaway(uuid,uuid,jsonb)',
    'expire_reward_balances()',
    'finance_reconciliation_findings()',
    'generate_gift_code(numeric,text,integer,timestamptz,uuid)',
    'get_affiliate_summary(uuid)',
    'get_my_listing_usage(text,date)',
    'get_referral_summary(uuid)',
    'is_reward_admin(uuid)',
    'issue_reward(uuid,text,numeric,text,text,text,uuid,timestamptz,text)',
    'leave_community(uuid)',
    'moderate_community_member(uuid,uuid,text)',
    'redeem_coupon(text,uuid,uuid,numeric,text,uuid[])',
    'redeem_gift_code(text,uuid)',
    'request_community_join(uuid)',
    'select_giveaway_winner(uuid)',
    'social_is_blocked(uuid,uuid)',
    'spend_reward(uuid,text,numeric,text,text,text,uuid,uuid)',
    'validate_coupon(text,uuid,numeric,text,uuid[])'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon', fn);
  END LOOP;

  -- Trigger-only SECURITY DEFINER functions must not be directly callable through the API.
  FOREACH fn IN ARRAY ARRAY[
    'emit_chat_message_notification()',
    'enforce_coupon_creation_rules()',
    'ensure_social_public_id()',
    'social_notify_event()',
    'touch_chat_conversation()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon, authenticated', fn);
  END LOOP;
END $$;

-- Restore visibility for existing user-facing navigation features.
-- No data is deleted or recreated; this only changes feature presentation state.
update public.feature_registry
set status = 'enabled',
    discoverable = true,
    updated_at = now()
where feature_key in (
  'messages',
  'referrals',
  'affiliate_center',
  'vendor_center',
  'wallet',
  'orders',
  'communities_social',
  'courses',
  'jobs',
  'announcements',
  'help',
  'promotions'
)
and status = 'hidden';

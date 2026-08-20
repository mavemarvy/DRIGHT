# DRIGHT Prompt 5 — Production Start Record

Date: 2026-08-20

## Production discovery

- GitHub repository: `mavemarvy/DRIGHT`
- Supabase project: `DRIGHT` (`atnvdzwpvoiergxdkofr`), `eu-west-1`, PostgreSQL 17.6.1.155
- Vercel project: `dright` (`prj_FF88IPd8rS6g7kyexDRTK6JmFwEa`), Next.js, Node 24.x
- Live Supabase migration history was inspected before modification.
- The live database contains substantially more migration history than the older repository snapshot/manifest; production was not reset or reconciled destructively.

## Existing authoritative systems discovered

Affiliate: `affiliate_profiles`, `affiliate_links`, `affiliate_clicks`, `affiliate_attributions`, `commission_rules`, `commissions`, `listing_affiliate_settings`.

Referral: `referral_programs`, `referrals`, `referral_rewards`.

Finance: `wallets`, `wallet_balances`, `wallet_ledger_entries`, `commerce_ledger`, `payouts`, `payout_accounts`, `transactions`, `payment_transactions`, `platform_fee_rules`.

Sales team: `sales_team_config`, `sales_team_profiles`, `sales_team_tiers`, `sales_team_contracts`.

Promotion/reward: `marketing_campaigns`, `promotion_transactions`, `promotion_pricing`, `reward_rules`, `reward_transactions`, `reward_wallets`.

## Production changes applied

1. Added configurable `monetization_settings` without replacing existing financial tables.
2. Added configurable `role_switch_fee_rules` and preserved the intended USD annual role-switch fees where no existing authoritative implementation was found.
3. Added a general subscription foundation (`subscription_plans`, `user_subscriptions`, `subscription_events`) because no general platform subscription engine was present; existing learning subscriptions remain untouched.
4. Added stable `commission_id` identifiers to `commissions`.
5. Added `referral_rewards.expires_at` for auditable reward expiration.
6. Added RLS read policies for affiliate clicks and attributions; writes remain server-side controlled.
7. Added a unique commission attribution/order-item constraint for concurrency-safe duplicate prevention.
8. Corrected the authoritative `process_order_financials` engine so affiliate attribution accepts the actual existing attribution lifecycle (`pending`/`confirmed`) instead of nonexistent statuses.
9. Made first-purchase referral rewards one-time by processing only pending referral relationships.
10. Made commission holding days configurable while preserving the existing 14-day behavior as the default.
11. Made withdrawal minimum configurable while preserving the existing $5 minimum as the default.
12. Hardened payout requests to require an authenticated owner and verified payout account.
13. Restricted direct execution of sensitive financial reversal/admin RPCs from anonymous and ordinary authenticated callers.
14. Updated the affiliate commission UI to use the authoritative `commission_amount` and new stable `commission_id` fields and added pending/available/paid summaries.

## Data preservation

At the time of the Prompt 5 production start, the following relevant tables contained zero application rows: affiliate profiles/links/clicks/attributions, commissions, referrals/rewards, sales-team profiles/contracts, orders/transactions/payment transactions, wallets/ledger entries and payouts. No existing production records were deleted or altered.

## Remaining Prompt 5 work

Prompt 5 is NOT yet complete. Remaining work includes the full affiliate/referral dashboards, sales-team UI and progression integration, admin monetization center, complete subscription/payment webhook lifecycle, affiliate click/attribution RPCs, referral fraud/risk integration, analytics, broader refund/dispute reversal integration, comprehensive tests, and final production verification.

Do not start Prompt 6 until Prompt 5 is explicitly completed and signed off.

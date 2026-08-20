# DRIGHT Prompt 6B — CRM, Customer Success, Support & Sales

## Scope implemented

This phase upgrades the existing DRIGHT architecture rather than replacing core marketplace, payment, messaging, notification, affiliate, promotion, or sales systems.

## Database

Applied to the connected Supabase project as forward-only migrations:

- `phase_6b_crm_customer_success_support_sales_v2`
- `phase_6b_crm_function_execute_hardening`

New CRM domain tables:

- `crm_customer_profiles`
- `crm_customer_tags`
- `crm_customer_tag_assignments`
- `crm_customer_notes`
- `crm_contact_preferences`
- `crm_segments`
- `crm_support_teams`
- `crm_support_team_members`
- `crm_support_tickets`
- `crm_ticket_events`
- `crm_sales_leads`
- `crm_sales_activities`
- `crm_admin_alerts`

Read models/functions:

- `crm_customer_summary`
- `crm_customer_timeline`
- `crm_get_customer_summary()`
- `crm_get_customer_timeline(uuid)`
- `crm_refresh_customer_health(uuid)`

The customer timeline references authoritative orders, transactions, subscriptions, profiles and CRM ticket records instead of copying the underlying business records. Support tickets optionally reference the existing `chat_conversations` architecture through `conversation_id`.

## Security

All CRM tables have RLS enabled. Administrative access is permission-gated through the existing `can_administer()` / `is_super_admin()` authorization layer.

CRM RPC functions that expose customer data are executable by `authenticated` only and explicitly revoked from `anon`/`public`.

## Web application

Added:

- `/admin/crm` — permission-aware CRM/customer-success control center with customer search, health/risk summary, support queue and sales pipeline views.
- `/support` — customer self-service ticket creation and ticket list.

Updated:

- `src/components/admin-shell.tsx` — adds permission-aware CRM navigation and support access while preserving the existing admin shell.

## Source-of-truth rules

Marketplace purchases remain authoritative in existing order/transaction tables. Subscription state remains authoritative in the existing subscription system. Customer conversations remain in the existing messaging/chat architecture. CRM stores workflow metadata, classification and references rather than duplicate message/order/payment bodies.

## Remaining Prompt 6B work

The following should be treated as subsequent hardening/extension inside the same phase before declaring the CRM domain fully enterprise-complete: configurable SLA management UI, ticket-to-chat conversation creation/reply workflow, advanced segmentation execution/materialization, consent-aware campaign orchestration, export UI with audit trail, CSAT capture, automated recovery jobs, AI support integration, executive/customer-success analytics dashboards, attachment workflow, and comprehensive automated RBAC/RLS test coverage.

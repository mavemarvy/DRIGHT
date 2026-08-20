# DRIGHT Prompt 6A — Enterprise Admin Intelligence, RBAC, CMS, Moderation & Governance

Implemented against the existing production DRIGHT architecture without resetting or replacing the database.

## Existing systems reused
- `roles`, `permissions`, `role_permissions`, `user_roles`, `admin_supervision`
- `audit_logs`
- listing review/reporting workflow (`listing_submissions`, `listing_reviews`, `listing_reports`, `reports`)
- `verification_requirements`, `verification_submissions`
- `feature_registry`
- existing promotional banner/analytics system
- existing centralized theme token system
- existing Supabase authorization helpers (`is_super_admin`, `has_permission`, `can_administer`)

## Database additions
- `admin_access_requests`
- CMS: `cms_pages`, `cms_blocks`, `cms_page_versions`, `cms_media`, `cms_navigation`
- moderation: `moderation_policy_rules`, `moderation_actions`
- centralized `platform_theme_settings`
- additive activation/agreement/verification fields on `admin_supervision`

## Security
- RLS enabled on all new governance tables.
- Admin access uses the existing server-side `can_administer()` model.
- New privileged operations use SECURITY DEFINER RPCs with explicit permission checks.
- No service-role or payment secrets are exposed to the client.

## RPCs
- `admin_has_permission`
- `admin_submit_access_request`
- `admin_review_access_request`
- `admin_set_role_permissions`
- `cms_publish_page`
- `moderation_record_action`

## UI
- Permission-aware admin shell/navigation
- Enterprise admin overview with operational counts
- Administrator activation console
- Roles & Permissions console
- CMS console with versioned publishing
- Moderation queue
- Theme administration
- Audit log viewer

All new interfaces use the existing DRIGHT design tokens and responsive layouts.

## Verification
- Supabase production schema inspected before changes.
- Existing migrations inspected before additive migrations.
- GitHub repository and existing admin implementation inspected before edits.
- Vercel production deployment pipeline inspected; an initial shell typing build failure was identified and corrected before the final shell replacement.
- No existing user, order, transaction, financial, moderation, CMS or storage records were deleted.

Prompt 6B/7/8 are intentionally not started.

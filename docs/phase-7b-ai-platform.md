# DRIGHT Prompt 7B — AI Platform Implementation

## Baseline
- Branch: `phase-7b-ai-platform`
- Base: `6cf63d9`
- Scope: additive AI foundation and authenticated AI assistant integration.
- Existing financial, authentication, notification, chat, CRM, marketplace and governance systems are preserved.

## Existing-system audit findings
- Supabase currently had no dedicated `ai_*` tables before Prompt 7B.
- Existing Supabase Edge Functions are payment-related (`paystack-*`); no AI Edge Function was present.
- The Next.js app already had a DRIGHT Gen.ai navigation target in `AppShell`, so Prompt 7B adds the missing `/gen-ai` implementation rather than creating a competing navigation item.
- Server Supabase access already uses the existing SSR client.
- Provider credentials are not present in source. AI credentials remain server-side environment configuration only.

## Implemented
- Central AI provider router with OpenAI, Grok and Gemini adapters.
- Configurable provider/model preference and ordered fallback.
- Authenticated `/api/ai/chat` endpoint.
- User-owned conversation persistence.
- Context-aware support/assistant data from existing CRM, orders and subscriptions where authorized.
- Marketplace lookup context using existing published marketplace data.
- Admin task context guarded by existing role data.
- AI request timeout and per-user in-memory rate limiting.
- AI usage/cost/latency logging.
- AI response feedback endpoint.
- Conversation list/archive/delete API.
- DRIGHT Gen.ai UI at `/gen-ai`.
- Prompt-injection and sensitive-data handling instructions at the router boundary.
- AI database tables with RLS and user isolation.
- Server-managed prompt version table with browser read access removed.
- AI provider environment documentation without secrets.

## Database changes
Created additive forward-only migrations:
- `20260820060000_phase_7b_ai_platform_foundation.sql`
- `20260820060100_phase_7b_ai_usage_insert_policy.sql`
- `20260820060200_phase_7b_prompt_privacy_hardening.sql`

No existing tables were reset, truncated or replaced.

## Not yet provider-enabled
Image, voice and video generation are represented as future-compatible architecture only. No paid media provider was added because no provider credentials/configuration were discovered in the current source/environment configuration.

## Validation
The branch's first Vercel deployment was blocked by the pre-existing `notifications/page.tsx` apostrophe lint error because the branch was based on `6cf63d9`, not the later `a4fa596` notification fix. That blocker was corrected on this branch with `You&apos;re` and no notification functionality was otherwise changed.

The Vercel project subsequently reported a build-rate-limit status on the latest commit, so a fresh Vercel build could not yet be observed from this environment. The latest known clean Vercel baseline remains the user's `a4fa596` deployment.

## Security notes
- Provider API keys are never referenced by client code.
- AI tables are RLS protected.
- AI conversations/messages are user-owned.
- AI usage inserts are restricted to the authenticated user's own `user_id`.
- Prompt versions are server-managed and not exposed through a client SELECT policy.
- No service-role key or arbitrary SQL tool is exposed to the model.
- Financial actions remain outside the AI route's authority.

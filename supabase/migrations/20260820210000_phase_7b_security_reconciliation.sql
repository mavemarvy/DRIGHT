-- DRIGHT Phase 7B security reconciliation
-- Forward-only, additive hardening for the live Supabase/RBAC lineage.
-- No destructive data operations.

-- Compatibility wrapper: the live RBAC lineage may expose can_administer(text, uuid),
-- while the Phase 7B branch uses the auth.uid()-scoped one-argument form.
-- Keep authorization server-side and bind the decision to the current session user.
create or replace function public.can_administer(p_permission_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_administer(p_permission_slug, auth.uid());
$$;

revoke execute on function public.can_administer(text) from public, anon;
grant execute on function public.can_administer(text) to authenticated;

-- AI conversations must always be user-owned.
drop policy if exists ai_conversations_insert_own on public.ai_conversations;
create policy ai_conversations_insert_own
  on public.ai_conversations for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists ai_conversations_update_own on public.ai_conversations;
create policy ai_conversations_update_own
  on public.ai_conversations for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- AI messages may only be written into a conversation owned by the same user.
-- The application route remains responsible for producing assistant messages;
-- RLS prevents cross-user/cross-conversation injection.
drop policy if exists ai_messages_insert_own on public.ai_messages;
create policy ai_messages_insert_own
  on public.ai_messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.ai_conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
        and c.status <> 'deleted'
    )
  );

drop policy if exists ai_messages_select_own on public.ai_messages;
create policy ai_messages_select_own
  on public.ai_messages for select
  to authenticated
  using (auth.uid() = user_id);

-- Feedback can only reference the caller's own AI message.
drop policy if exists ai_feedback_insert_own on public.ai_feedback;
create policy ai_feedback_insert_own
  on public.ai_feedback for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      message_id is null
      or exists (
        select 1
        from public.ai_messages m
        where m.id = message_id
          and m.user_id = auth.uid()
      )
    )
  );

-- Usage records are user-scoped and, when attached to a conversation,
-- must reference the caller's own conversation.
drop policy if exists ai_usage_insert_own on public.ai_usage;
create policy ai_usage_insert_own
  on public.ai_usage for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      conversation_id is null
      or exists (
        select 1
        from public.ai_conversations c
        where c.id = conversation_id
          and c.user_id = auth.uid()
      )
    )
  );

-- Generation jobs are user-owned. Prevent a client from masquerading as an
-- already-completed provider job; processing/completion is server/admin work.
drop policy if exists ai_generation_jobs_own_write on public.ai_generation_jobs;
create policy ai_generation_jobs_own_write
  on public.ai_generation_jobs for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'queued'
  );

-- Keep provider configuration free of secrets and admin-controlled.
drop policy if exists ai_provider_configs_admin_select on public.ai_provider_configs;
create policy ai_provider_configs_admin_select
  on public.ai_provider_configs for select
  to authenticated
  using (public.can_administer('ai.manage'));

drop policy if exists ai_provider_configs_admin_write on public.ai_provider_configs;
create policy ai_provider_configs_admin_write
  on public.ai_provider_configs for all
  to authenticated
  using (public.can_administer('ai.manage'))
  with check (public.can_administer('ai.manage'));

-- AI feature policy is an authorization boundary, not user configuration.
drop policy if exists ai_feature_policies_admin_select on public.ai_feature_policies;
create policy ai_feature_policies_admin_select
  on public.ai_feature_policies for select
  to authenticated
  using (public.can_administer('ai.manage'));

drop policy if exists ai_feature_policies_admin_write on public.ai_feature_policies;
create policy ai_feature_policies_admin_write
  on public.ai_feature_policies for all
  to authenticated
  using (public.can_administer('ai.manage'))
  with check (public.can_administer('ai.manage'));

-- Prompt versions must remain server-managed and unreadable to browser clients.
drop policy if exists ai_prompt_versions_select_active on public.ai_prompt_versions;
drop policy if exists ai_prompt_versions_select_own on public.ai_prompt_versions;

comment on function public.can_administer(text) is 'DRIGHT compatibility authorization wrapper; delegates to the current user-bound RBAC function.';
comment on table public.ai_messages is 'DRIGHT AI messages; access is user-scoped and conversation-bound by RLS.';
comment on table public.ai_feedback is 'DRIGHT AI feedback; references are restricted to the caller-owned message.';

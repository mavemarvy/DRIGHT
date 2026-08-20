-- DRIGHT Phase 7B final AI RLS/privacy hardening.
-- Forward-only; no destructive data operations.

drop policy if exists ai_prompt_versions_select_active on public.ai_prompt_versions;
drop policy if exists ai_prompt_versions_select_own on public.ai_prompt_versions;

drop policy if exists ai_messages_insert_own on public.ai_messages;
create policy ai_messages_insert_user_only
  on public.ai_messages for insert to authenticated
  with check (
    auth.uid() = user_id
    and role = 'user'
    and status = 'completed'
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid() and c.status <> 'deleted'
    )
  );

drop policy if exists ai_usage_insert_own on public.ai_usage;

drop policy if exists ai_generation_jobs_own_write on public.ai_generation_jobs;
create policy ai_generation_jobs_own_insert
  on public.ai_generation_jobs for insert to authenticated
  with check (auth.uid() = user_id and status = 'queued');

drop policy if exists ai_cache_own_write on public.ai_cache;
drop policy if exists ai_moderation_events_admin_write on public.ai_moderation_events;

drop policy if exists ai_provider_configs_admin_select on public.ai_provider_configs;
create policy ai_provider_configs_admin_select
  on public.ai_provider_configs for select to authenticated
  using (public.can_administer('ai.manage'));
drop policy if exists ai_provider_configs_admin_write on public.ai_provider_configs;
create policy ai_provider_configs_admin_write
  on public.ai_provider_configs for all to authenticated
  using (public.can_administer('ai.manage'))
  with check (public.can_administer('ai.manage'));

drop policy if exists ai_feature_policies_admin_select on public.ai_feature_policies;
create policy ai_feature_policies_admin_select
  on public.ai_feature_policies for select to authenticated
  using (public.can_administer('ai.manage'));
drop policy if exists ai_feature_policies_admin_write on public.ai_feature_policies;
create policy ai_feature_policies_admin_write
  on public.ai_feature_policies for all to authenticated
  using (public.can_administer('ai.manage'))
  with check (public.can_administer('ai.manage'));

drop policy if exists ai_rate_limit_buckets_none on public.ai_rate_limit_buckets;
create policy ai_rate_limit_buckets_none
  on public.ai_rate_limit_buckets for all to authenticated
  using (false) with check (false);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.ai_prompt_versions enable row level security;
alter table public.ai_provider_configs enable row level security;
alter table public.ai_feature_policies enable row level security;
alter table public.ai_rate_limit_buckets enable row level security;
alter table public.ai_cache enable row level security;
alter table public.ai_generation_jobs enable row level security;
alter table public.ai_moderation_events enable row level security;

revoke all on function public.consume_ai_rate_limit(text, integer) from public, anon;
grant execute on function public.consume_ai_rate_limit(text, integer) to authenticated;
revoke all on function public.get_ai_runtime_config(text) from public, anon;
grant execute on function public.get_ai_runtime_config(text) to authenticated;

comment on table public.ai_prompt_versions is 'DRIGHT server-managed prompt templates. Browser clients have no SELECT policy.';
comment on table public.ai_usage is 'DRIGHT authoritative AI usage ledger. Browser clients cannot insert fabricated usage.';
comment on table public.ai_cache is 'DRIGHT user-scoped AI cache. Browser clients cannot write model output.';

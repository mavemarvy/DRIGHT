-- DRIGHT Phase 7B hardening: additive AI control plane and observability.
-- Forward-only. Does not delete or rewrite existing AI data.

create table if not exists public.ai_provider_configs (
  provider text primary key,
  enabled boolean not null default false,
  priority integer not null default 100 check (priority >= 0 and priority <= 10000),
  default_model text,
  allowed_tasks text[] not null default '{}',
  max_requests_per_minute integer not null default 20 check (max_requests_per_minute > 0),
  daily_budget_usd numeric(18,8) check (daily_budget_usd is null or daily_budget_usd >= 0),
  metadata jsonb not null default '{}',
  configured_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_feature_policies (
  task_type text primary key,
  enabled boolean not null default true,
  max_requests_per_minute integer not null default 20 check (max_requests_per_minute > 0),
  max_input_chars integer not null default 12000 check (max_input_chars between 100 and 100000),
  max_output_tokens integer check (max_output_tokens is null or max_output_tokens between 16 and 200000),
  allowed_roles text[] not null default '{}',
  required_permission text,
  metadata jsonb not null default '{}',
  configured_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_rate_limit_buckets (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_type text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, task_type, window_start)
);

create table if not exists public.ai_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cache_key text not null,
  task_type text not null,
  response jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(user_id, cache_key)
);

create table if not exists public.ai_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('DR-AIG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_type text not null check (generation_type in ('text','image','audio','voice','video')),
  task_type text not null,
  provider text,
  model text,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','cancelled','moderated')),
  prompt text,
  input_assets jsonb not null default '[]',
  output_assets jsonb not null default '[]',
  estimated_cost numeric(18,8),
  actual_cost numeric(18,8),
  error_code text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_moderation_events (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('DR-AIM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  user_id uuid references auth.users(id) on delete set null,
  target_type text not null,
  target_id text,
  classification text not null check (classification in ('safe','suspicious','potentially_prohibited','requires_human_review','blocked')),
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  action_taken text,
  provider text,
  model text,
  human_review_required boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.ai_usage add column if not exists request_id text;
create unique index if not exists ai_usage_request_id_uidx on public.ai_usage(request_id) where request_id is not null;
create index if not exists ai_provider_configs_priority_idx on public.ai_provider_configs(enabled, priority);
create index if not exists ai_cache_expiry_idx on public.ai_cache(expires_at);
create index if not exists ai_generation_jobs_user_created_idx on public.ai_generation_jobs(user_id, created_at desc);
create index if not exists ai_generation_jobs_status_idx on public.ai_generation_jobs(status, created_at desc);
create index if not exists ai_moderation_events_target_idx on public.ai_moderation_events(target_type, target_id, created_at desc);
create index if not exists ai_moderation_events_user_idx on public.ai_moderation_events(user_id, created_at desc);

alter table public.ai_provider_configs enable row level security;
alter table public.ai_feature_policies enable row level security;
alter table public.ai_rate_limit_buckets enable row level security;
alter table public.ai_cache enable row level security;
alter table public.ai_generation_jobs enable row level security;
alter table public.ai_moderation_events enable row level security;

drop policy if exists ai_provider_configs_admin_select on public.ai_provider_configs;
create policy ai_provider_configs_admin_select on public.ai_provider_configs for select using (public.can_administer('ai.manage'));
drop policy if exists ai_provider_configs_admin_write on public.ai_provider_configs;
create policy ai_provider_configs_admin_write on public.ai_provider_configs for all using (public.can_administer('ai.manage')) with check (public.can_administer('ai.manage'));

drop policy if exists ai_feature_policies_admin_select on public.ai_feature_policies;
create policy ai_feature_policies_admin_select on public.ai_feature_policies for select using (public.can_administer('ai.manage'));
drop policy if exists ai_feature_policies_admin_write on public.ai_feature_policies;
create policy ai_feature_policies_admin_write on public.ai_feature_policies for all using (public.can_administer('ai.manage')) with check (public.can_administer('ai.manage'));

drop policy if exists ai_rate_limit_buckets_none on public.ai_rate_limit_buckets;
create policy ai_rate_limit_buckets_none on public.ai_rate_limit_buckets for all using (false) with check (false);

drop policy if exists ai_cache_own_select on public.ai_cache;
create policy ai_cache_own_select on public.ai_cache for select using (auth.uid() = user_id);
drop policy if exists ai_cache_own_write on public.ai_cache;
create policy ai_cache_own_write on public.ai_cache for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ai_generation_jobs_own_select on public.ai_generation_jobs;
create policy ai_generation_jobs_own_select on public.ai_generation_jobs for select using (auth.uid() = user_id);
drop policy if exists ai_generation_jobs_own_write on public.ai_generation_jobs;
create policy ai_generation_jobs_own_write on public.ai_generation_jobs for insert with check (auth.uid() = user_id);
drop policy if exists ai_generation_jobs_admin_update on public.ai_generation_jobs;
create policy ai_generation_jobs_admin_update on public.ai_generation_jobs for update using (public.can_administer('ai.manage')) with check (public.can_administer('ai.manage'));

drop policy if exists ai_moderation_events_owner_select on public.ai_moderation_events;
create policy ai_moderation_events_owner_select on public.ai_moderation_events for select using (auth.uid() = user_id or public.can_administer('moderation.view'));
drop policy if exists ai_moderation_events_admin_write on public.ai_moderation_events;
create policy ai_moderation_events_admin_write on public.ai_moderation_events for all using (public.can_administer('moderation.manage')) with check (public.can_administer('moderation.manage'));

drop policy if exists ai_prompt_versions_select_active on public.ai_prompt_versions;
create policy ai_prompt_versions_select_active on public.ai_prompt_versions for select to authenticated using (is_active = true);

create or replace function public.get_ai_runtime_config(p_task_type text)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'policy', coalesce((select jsonb_build_object('enabled', enabled, 'max_requests_per_minute', max_requests_per_minute, 'max_input_chars', max_input_chars, 'max_output_tokens', max_output_tokens, 'allowed_roles', to_jsonb(allowed_roles), 'required_permission', required_permission) from public.ai_feature_policies where task_type = p_task_type), '{}'::jsonb),
    'providers', coalesce((select jsonb_agg(jsonb_build_object('provider', provider, 'enabled', enabled, 'priority', priority, 'default_model', default_model, 'allowed_tasks', to_jsonb(allowed_tasks)) order by priority asc, provider asc) from public.ai_provider_configs where enabled = true and (cardinality(allowed_tasks) = 0 or p_task_type = any(allowed_tasks))), '[]'::jsonb)
  );
$$;

create or replace function public.consume_ai_rate_limit(p_task_type text, p_limit integer)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_window timestamptz := date_trunc('minute', now());
  v_count integer;
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 1000));
begin
  if v_user is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_task_type || ':' || v_window::text, 0));
  insert into public.ai_rate_limit_buckets(user_id, task_type, window_start, request_count) values (v_user, p_task_type, v_window, 1)
  on conflict (user_id, task_type, window_start) do update set request_count = public.ai_rate_limit_buckets.request_count + 1, updated_at = now()
  returning request_count into v_count;
  return v_count <= v_limit;
end;
$$;

revoke execute on function public.get_ai_runtime_config(text) from anon;
revoke execute on function public.consume_ai_rate_limit(text, integer) from anon;
grant execute on function public.get_ai_runtime_config(text) to authenticated;
grant execute on function public.consume_ai_rate_limit(text, integer) to authenticated;

insert into public.ai_feature_policies(task_type, enabled, max_requests_per_minute, max_input_chars) values
('assistant', true, 20, 12000),('support', true, 20, 12000),('seller', true, 20, 12000),('affiliate', true, 20, 12000),('creator', true, 15, 12000),('admin', true, 30, 12000),('moderation', true, 30, 12000),('search', true, 30, 8000)
on conflict (task_type) do nothing;

comment on table public.ai_provider_configs is 'DRIGHT AI provider routing policy; contains no provider secrets.';
comment on table public.ai_feature_policies is 'DRIGHT AI feature-level authorization, input and rate policies.';
comment on table public.ai_rate_limit_buckets is 'DRIGHT server-managed per-user AI rate-limit state.';
comment on table public.ai_cache is 'DRIGHT user-scoped AI cache; never shared across users.';
comment on table public.ai_generation_jobs is 'DRIGHT unified future-safe AI media/text generation job history.';
comment on table public.ai_moderation_events is 'DRIGHT AI moderation decisions and human-review audit trail.';

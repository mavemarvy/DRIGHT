-- DRIGHT Phase 7B: AI platform foundation
-- Forward-only, additive migration. Preserves existing data and RLS.

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('DR-AIC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New AI conversation',
  conversation_type text not null default 'assistant' check (conversation_type in ('assistant','support','seller','affiliate','creator','admin','moderation')),
  status text not null default 'active' check (status in ('active','archived','deleted')),
  summary text,
  language_code text not null default 'en-US',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('system','user','assistant','tool')),
  content text not null,
  model text,
  provider text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  status text not null default 'completed' check (status in ('pending','completed','failed','blocked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  provider text not null,
  model text not null,
  task_type text not null,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric(18,8),
  latency_ms integer,
  success boolean not null default true,
  error_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.ai_messages(id) on delete set null,
  rating smallint not null check (rating in (-1, 1)),
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null,
  version integer not null,
  prompt_text text not null,
  task_type text not null,
  is_active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(prompt_key, version)
);

create index if not exists ai_conversations_user_updated_idx on public.ai_conversations(user_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx on public.ai_messages(conversation_id, created_at asc);
create index if not exists ai_usage_user_created_idx on public.ai_usage(user_id, created_at desc);
create index if not exists ai_usage_task_created_idx on public.ai_usage(task_type, created_at desc);
create index if not exists ai_feedback_message_idx on public.ai_feedback(message_id);
create index if not exists ai_prompt_versions_active_idx on public.ai_prompt_versions(prompt_key, is_active);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.ai_prompt_versions enable row level security;

-- Users can access only their own AI conversations/messages/usage/feedback.
drop policy if exists ai_conversations_select_own on public.ai_conversations;
create policy ai_conversations_select_own on public.ai_conversations for select using (auth.uid() = user_id);
drop policy if exists ai_conversations_insert_own on public.ai_conversations;
create policy ai_conversations_insert_own on public.ai_conversations for insert with check (auth.uid() = user_id);
drop policy if exists ai_conversations_update_own on public.ai_conversations;
create policy ai_conversations_update_own on public.ai_conversations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ai_messages_select_own on public.ai_messages;
create policy ai_messages_select_own on public.ai_messages for select using (auth.uid() = user_id);
drop policy if exists ai_messages_insert_own on public.ai_messages;
create policy ai_messages_insert_own on public.ai_messages for insert with check (auth.uid() = user_id);

drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage for select using (auth.uid() = user_id);

drop policy if exists ai_feedback_select_own on public.ai_feedback;
create policy ai_feedback_select_own on public.ai_feedback for select using (auth.uid() = user_id);
drop policy if exists ai_feedback_insert_own on public.ai_feedback;
create policy ai_feedback_insert_own on public.ai_feedback for insert with check (auth.uid() = user_id);

-- Prompt versions are server-managed. No client write policy is created.
drop policy if exists ai_prompt_versions_select_active on public.ai_prompt_versions;
create policy ai_prompt_versions_select_active on public.ai_prompt_versions for select using (is_active = true);

create or replace function public.touch_ai_conversation_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_conversations_touch_updated_at on public.ai_conversations;
create trigger ai_conversations_touch_updated_at
before update on public.ai_conversations
for each row execute function public.touch_ai_conversation_updated_at();

comment on table public.ai_conversations is 'DRIGHT Phase 7B AI conversation state; user-owned and RLS protected.';
comment on table public.ai_messages is 'DRIGHT Phase 7B AI messages; user-owned and RLS protected.';
comment on table public.ai_usage is 'DRIGHT Phase 7B AI usage and cost observability records.';
comment on table public.ai_feedback is 'DRIGHT Phase 7B AI quality feedback.';
comment on table public.ai_prompt_versions is 'DRIGHT Phase 7B centrally versioned AI prompts.';

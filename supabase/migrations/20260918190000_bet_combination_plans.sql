-- DRIGHT correct-score planner cloud-sync schema.
-- This migration is intentionally isolated from marketplace/order/payment tables.
-- The UI currently falls back to device-local persistence when Supabase is unavailable.

create table if not exists public.bet_combination_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Correct Score Combination Planner',
  stake_ngn numeric(12,2) not null default 10 check (stake_ngn > 0),
  match_a jsonb not null,
  match_b jsonb not null,
  statuses jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bet_combination_plans_user_id_idx
  on public.bet_combination_plans(user_id);

alter table public.bet_combination_plans enable row level security;

drop policy if exists "Users can read own bet combination plans" on public.bet_combination_plans;
create policy "Users can read own bet combination plans"
  on public.bet_combination_plans
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own bet combination plans" on public.bet_combination_plans;
create policy "Users can create own bet combination plans"
  on public.bet_combination_plans
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own bet combination plans" on public.bet_combination_plans;
create policy "Users can update own bet combination plans"
  on public.bet_combination_plans
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own bet combination plans" on public.bet_combination_plans;
create policy "Users can delete own bet combination plans"
  on public.bet_combination_plans
  for delete
  to authenticated
  using (auth.uid() = user_id);

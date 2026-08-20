-- DRIGHT Phase 7B follow-up: permit the authenticated AI route to record usage for its own user.
drop policy if exists ai_usage_insert_own on public.ai_usage;
create policy ai_usage_insert_own on public.ai_usage for insert with check (auth.uid() = user_id);

-- AI system prompts are sensitive configuration and must not be readable by browser clients.
drop policy if exists ai_prompt_versions_select_active on public.ai_prompt_versions;

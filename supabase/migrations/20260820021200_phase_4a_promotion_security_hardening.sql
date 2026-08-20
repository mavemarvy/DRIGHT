-- Prompt 4A security hardening: keep SECURITY DEFINER functions off the anonymous API.
revoke execute on function public.promotion_is_admin() from anon,authenticated;
grant execute on function public.promotion_is_admin() to authenticated;
revoke execute on function public.promotion_transition(uuid,text,text) from anon;
grant execute on function public.promotion_transition(uuid,text,text) to authenticated;
revoke execute on function public.record_promotion_event(uuid,text,text,uuid,uuid,text,text,integer,boolean,numeric,text,jsonb) from anon;
grant execute on function public.record_promotion_event(uuid,text,text,uuid,uuid,text,text,integer,boolean,numeric,text,jsonb) to authenticated;
revoke execute on function public.get_active_promotion_banners(text,text) from anon,authenticated;
grant execute on function public.get_active_promotion_banners(text,text) to authenticated;

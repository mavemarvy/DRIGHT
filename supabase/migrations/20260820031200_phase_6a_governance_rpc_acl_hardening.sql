-- Explicit ACL hardening for Prompt 6A governance RPCs.
revoke execute on function public.admin_create_role(text,text,text,uuid[]) from anon, public;
grant execute on function public.admin_create_role(text,text,text,uuid[]) to authenticated;
revoke execute on function public.admin_set_role_permissions(uuid,uuid[]) from anon, public;
grant execute on function public.admin_set_role_permissions(uuid,uuid[]) to authenticated;
revoke execute on function public.moderation_record_action(uuid,text,text,jsonb) from anon, public;
grant execute on function public.moderation_record_action(uuid,text,text,jsonb) to authenticated;
revoke execute on function public.cms_publish_page(uuid,text) from anon, public;
grant execute on function public.cms_publish_page(uuid,text) to authenticated;
revoke execute on function public.admin_review_access_request(text,text,text) from anon, public;
grant execute on function public.admin_review_access_request(text,text,text) to authenticated;

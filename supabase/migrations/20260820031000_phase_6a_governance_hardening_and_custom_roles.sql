-- DRIGHT Prompt 6A additive hardening. No destructive table/data operations.

insert into public.permissions (name, slug, description, resource, action) values
 ('Delete Users','users.delete','Delete users where policy permits','users','delete'),
 ('Approve Listings','listings.approve','Approve marketplace listings','listings','approve'),
 ('Reject Listings','listings.reject','Reject marketplace listings','listings','reject'),
 ('Edit Listings','listings.edit','Edit marketplace listings','listings','edit'),
 ('Remove Listings','listings.remove','Remove or archive marketplace listings','listings','remove'),
 ('View Payments','payments.view','View payment records','payments','view'),
 ('Manage User Roles','users.roles.manage','Manage user role assignments','users','roles.manage'),
 ('Manage Admin Verification','admins.verify','Review administrator verification','admins','verify'),
 ('Manage Admin Agreements','admins.agreements.manage','Manage administrator agreement requirements','admins','agreements.manage')
on conflict (slug) do update set name=excluded.name, description=excluded.description, resource=excluded.resource, action=excluded.action;

alter table public.reports add column if not exists category text;
alter table public.reports add column if not exists severity text default 'medium';
alter table public.reports add column if not exists priority integer default 100;
alter table public.reports add column if not exists assigned_at timestamptz;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists version integer not null default 1;

do $$ begin alter table public.reports drop constraint if exists reports_severity_check; exception when undefined_object then null; end $$;
alter table public.reports add constraint reports_severity_check check (severity in ('low','medium','high','critical'));
do $$ begin alter table public.reports drop constraint if exists reports_status_check; exception when undefined_object then null; end $$;
alter table public.reports add constraint reports_status_check check (status in ('submitted','under_review','actioned','dismissed','resolved','closed','escalated'));
create index if not exists reports_moderation_queue_idx on public.reports (status, priority, severity, created_at desc);
create index if not exists reports_assigned_admin_idx on public.reports (assigned_admin_id, status, created_at desc);

create or replace function public.admin_create_role(p_name text,p_slug text,p_description text default null,p_permission_ids uuid[] default '{}') returns public.roles language plpgsql security definer set search_path = public as $$
declare v_role public.roles;
begin
 if not public.can_administer('roles.manage') then raise exception 'Permission denied'; end if;
 if p_name is null or length(trim(p_name)) < 2 then raise exception 'Role name is required'; end if;
 if p_slug is null or p_slug !~ '^[a-z0-9_]+$' then raise exception 'Invalid role slug'; end if;
 if exists(select 1 from public.roles where slug=p_slug) then raise exception 'Role slug already exists'; end if;
 insert into public.roles(name,slug,description,is_system_role,is_active) values(trim(p_name),p_slug,p_description,false,true) returning * into v_role;
 insert into public.role_permissions(role_id,permission_id,granted_by) select v_role.id,x,auth.uid() from unnest(coalesce(p_permission_ids,'{}'::uuid[])) x on conflict do nothing;
 insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,metadata) values(auth.uid(),'role.created','role',v_role.slug,jsonb_build_object('role_id',v_role.id,'permission_count',coalesce(array_length(p_permission_ids,1),0)));
 return v_role;
end; $$;
revoke all on function public.admin_create_role(text,text,text,uuid[]) from public;
grant execute on function public.admin_create_role(text,text,text,uuid[]) to authenticated;

create or replace function public.admin_set_role_permissions(p_role_id uuid,p_permission_ids uuid[]) returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer; v_role public.roles;
begin
 if not public.can_administer('roles.manage') then raise exception 'Permission denied'; end if;
 select * into v_role from public.roles where id=p_role_id for update;
 if v_role.id is null then raise exception 'Role not found'; end if;
 if v_role.is_system_role and not public.is_super_admin(auth.uid()) then raise exception 'System roles are protected'; end if;
 delete from public.role_permissions where role_id=p_role_id;
 insert into public.role_permissions(role_id,permission_id,granted_by) select p_role_id,x,auth.uid() from unnest(coalesce(p_permission_ids,'{}'::uuid[])) x on conflict do nothing;
 get diagnostics v_count=row_count;
 insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,metadata) values(auth.uid(),'role_permissions_updated','role',v_role.slug,jsonb_build_object('role_id',p_role_id,'permission_count',v_count));
 return v_count;
end; $$;
revoke all on function public.admin_set_role_permissions(uuid,uuid[]) from public;
grant execute on function public.admin_set_role_permissions(uuid,uuid[]) to authenticated;

create or replace function public.moderation_record_action(p_report_id uuid,p_action text,p_reason text default null,p_metadata jsonb default '{}') returns public.moderation_actions language plpgsql security definer set search_path = public as $$
declare v_report public.reports; v_action public.moderation_actions; v_new_status text;
begin
 if not public.can_administer('moderation.manage') then raise exception 'Permission denied'; end if;
 if p_action not in ('dismiss','resolve','warn','request_changes','restrict','suspend','remove','escalate') then raise exception 'Invalid moderation action'; end if;
 select * into v_report from public.reports where id=p_report_id for update;
 if v_report.id is null then raise exception 'Report not found'; end if;
 if v_report.status in ('resolved','dismissed','closed') then raise exception 'Report is already closed'; end if;
 v_new_status := case when p_action='dismiss' then 'dismissed' when p_action='resolve' then 'resolved' when p_action='escalate' then 'escalated' else 'actioned' end;
 insert into public.moderation_actions(report_id,target_type,target_id,actor_user_id,action,reason,metadata) values(p_report_id,v_report.target_type,v_report.target_id,auth.uid(),p_action,p_reason,coalesce(p_metadata,'{}'::jsonb)) returning * into v_action;
 update public.reports set status=v_new_status,assigned_admin_id=auth.uid(),assigned_at=coalesce(assigned_at,now()),resolved_at=case when v_new_status in ('resolved','dismissed') then now() else null end,version=version+1,updated_at=now() where id=v_report.id;
 insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,metadata) values(auth.uid(),'moderation_action','report',v_report.report_id,jsonb_build_object('action',p_action,'reason',p_reason,'previous_status',v_report.status,'new_status',v_new_status));
 return v_action;
end; $$;
revoke all on function public.moderation_record_action(uuid,text,text,jsonb) from public;
grant execute on function public.moderation_record_action(uuid,text,text,jsonb) to authenticated;

create or replace function public.cms_publish_page(p_page_id uuid,p_change_summary text default null) returns public.cms_pages language plpgsql security definer set search_path = public as $$
declare v_page public.cms_pages; v_snapshot jsonb; v_version integer;
begin
 if not public.can_administer('cms.publish') then raise exception 'Permission denied'; end if;
 select * into v_page from public.cms_pages where id=p_page_id for update;
 if v_page.id is null then raise exception 'CMS page not found'; end if;
 v_version := greatest(coalesce(v_page.current_version,0),coalesce(v_page.published_version,0)) + 1;
 v_snapshot := jsonb_build_object('page',to_jsonb(v_page),'blocks',coalesce((select jsonb_agg(to_jsonb(b) order by b.sort_order) from public.cms_blocks b where b.page_id=v_page.id),'[]'::jsonb));
 insert into public.cms_page_versions(page_id,version,snapshot,change_summary,created_by) values(v_page.id,v_version,v_snapshot,p_change_summary,auth.uid());
 update public.cms_pages set status='published',current_version=v_version,published_version=v_version,updated_by=auth.uid(),updated_at=now() where id=v_page.id returning * into v_page;
 insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,metadata) values(auth.uid(),'cms_page_published','cms_page',v_page.page_id,jsonb_build_object('version',v_version));
 return v_page;
end; $$;
revoke all on function public.cms_publish_page(uuid,text) from public;
grant execute on function public.cms_publish_page(uuid,text) to authenticated;

create or replace function public.admin_review_access_request(p_request_id text,p_decision text,p_notes text default null) returns public.admin_access_requests language plpgsql security definer set search_path = public as $$
declare v_req public.admin_access_requests; v_role public.roles; v_previous_role text; v_existing boolean;
begin
 if not public.can_administer('admins.manage') then raise exception 'Permission denied'; end if;
 if p_decision not in ('approved','rejected','suspended','deactivated') then raise exception 'Invalid decision'; end if;
 select * into v_req from public.admin_access_requests where request_id=p_request_id for update;
 if v_req.id is null then raise exception 'Request not found'; end if;
 if v_req.status <> 'pending' then raise exception 'Request is no longer pending'; end if;
 select * into v_role from public.roles where id=v_req.requested_role_id;
 select r.slug into v_previous_role from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=v_req.applicant_user_id and ur.status='active' and r.is_system_role=false order by ur.assigned_at desc limit 1;
 update public.admin_access_requests set status=p_decision,reviewed_by=auth.uid(),review_notes=p_notes,reviewed_at=now(),updated_at=now() where id=v_req.id returning * into v_req;
 if p_decision='approved' then
   select exists(select 1 from public.user_roles where user_id=v_req.applicant_user_id and role_id=v_req.requested_role_id) into v_existing;
   if v_existing then update public.user_roles set status='active',assigned_by=auth.uid(),assigned_at=now() where user_id=v_req.applicant_user_id and role_id=v_req.requested_role_id;
   else insert into public.user_roles(user_id,role_id,assigned_by,status) values(v_req.applicant_user_id,v_req.requested_role_id,auth.uid(),'active'); end if;
   insert into public.admin_supervision(admin_user_id,assigned_by,assigned_at,status,activation_requested_at,activated_at,agreement_version,agreement_accepted_at,verification_status) values(v_req.applicant_user_id,auth.uid(),now(),'active',v_req.submitted_at,now(),v_req.agreement_version,v_req.agreement_accepted_at,'not_required') on conflict(admin_user_id) do update set status='active',assigned_by=excluded.assigned_by,activated_at=now(),agreement_version=excluded.agreement_version,agreement_accepted_at=excluded.agreement_accepted_at;
 else
   update public.admin_supervision set status=p_decision,deactivated_at=case when p_decision='deactivated' then now() else deactivated_at end,deactivation_reason=p_notes where admin_user_id=v_req.applicant_user_id;
 end if;
 insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,target_user_id,metadata) values(auth.uid(),'admin_access_reviewed','admin_access_request',v_req.request_id,v_req.applicant_user_id,jsonb_build_object('decision',p_decision,'previous_role',v_previous_role,'new_role',case when p_decision='approved' then v_role.slug else null end,'notes',p_notes));
 return v_req;
end; $$;
revoke all on function public.admin_review_access_request(text,text,text) from public;
grant execute on function public.admin_review_access_request(text,text,text) to authenticated;

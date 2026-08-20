create or replace function public.review_listing_submission(p_submission_id uuid, p_decision text, p_reason text default null, p_internal_notes text default null)
returns public.listing_submissions
language plpgsql
security definer
set search_path = public
as $$
declare actor uuid := auth.uid(); submission public.listing_submissions; decision_status text; item_status text;
begin
 if actor is null then raise exception 'authentication required'; end if;
 if not (public.is_super_admin(actor) or public.has_permission('moderation.manage', actor)) then raise exception 'insufficient permission'; end if;
 if p_decision not in ('approved','rejected','changes_requested') then raise exception 'invalid listing decision'; end if;
 select * into submission from public.listing_submissions where id=p_submission_id for update;
 if not found then raise exception 'listing submission not found'; end if;
 if not exists (select 1 from public.marketplace_items where id=submission.entity_id) then raise exception 'marketplace item not found'; end if;
 decision_status:=p_decision; item_status:=case p_decision when 'approved' then 'published' when 'rejected' then 'rejected' else 'draft' end;
 update public.listing_submissions set submission_status=decision_status,review_message=coalesce(p_reason,review_message),reviewed_by=actor,reviewed_at=now(),updated_at=now() where id=p_submission_id returning * into submission;
 update public.marketplace_items set status=item_status,review_notes=coalesce(p_reason,review_notes),reviewed_by=actor,reviewed_at=now(),published_at=case when p_decision='approved' then coalesce(published_at,now()) else published_at end,updated_at=now() where id=submission.entity_id;
 insert into public.listing_reviews(submission_id,reviewer_user_id,decision,reason,internal_notes) values(p_submission_id,actor,p_decision,p_reason,p_internal_notes);
 insert into public.listing_publish_events(submission_id,actor_user_id,event_type,metadata) values(p_submission_id,actor,case p_decision when 'approved' then 'approved' when 'rejected' then 'rejected' else 'changes_requested' end,jsonb_build_object('reason',p_reason));
 return submission;
end; $$;
grant execute on function public.review_listing_submission(uuid,text,text,text) to authenticated;

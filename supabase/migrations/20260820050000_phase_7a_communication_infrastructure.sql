begin;

alter table public.chat_conversations add column if not exists public_id text, add column if not exists status text not null default 'active', add column if not exists metadata jsonb not null default '{}'::jsonb, add column if not exists listing_id uuid, add column if not exists transaction_id uuid, add column if not exists community_id uuid, add column if not exists support_case_id uuid, add column if not exists dispute_id uuid, add column if not exists last_message_at timestamptz, add column if not exists archived_at timestamptz;
update public.chat_conversations set public_id=coalesce(public_id,next_universal_id('CONVERSATION')) where public_id is null;
alter table public.chat_conversations alter column public_id set not null;
create unique index if not exists chat_conversations_public_id_uidx on public.chat_conversations(public_id);
create index if not exists chat_conversations_updated_idx on public.chat_conversations(updated_at desc);
alter table public.chat_conversations drop constraint if exists chat_conversations_conversation_type_check;
alter table public.chat_conversations add constraint chat_conversations_conversation_type_check check(conversation_type in ('direct','marketplace','order','support','dispute','community','creator','affiliate','admin','system','ai_assisted'));

alter table public.chat_participants add column if not exists last_delivered_at timestamptz, add column if not exists is_muted boolean not null default false, add column if not exists muted_until timestamptz, add column if not exists is_archived boolean not null default false, add column if not exists notification_level text not null default 'all';
alter table public.chat_participants drop constraint if exists chat_participants_notification_level_check;
alter table public.chat_participants add constraint chat_participants_notification_level_check check(notification_level in ('all','mentions','none'));
create index if not exists chat_participants_user_idx on public.chat_participants(user_id,conversation_id);

alter table public.chat_messages add column if not exists public_id text, add column if not exists message_type text not null default 'text', add column if not exists message_status text not null default 'sent', add column if not exists reply_to_message_id uuid, add column if not exists metadata jsonb not null default '{}'::jsonb, add column if not exists moderation_status text not null default 'clear', add column if not exists moderated_at timestamptz;
update public.chat_messages set public_id=coalesce(public_id,next_universal_id('MESSAGE')) where public_id is null;
alter table public.chat_messages alter column public_id set not null;
create unique index if not exists chat_messages_public_id_uidx on public.chat_messages(public_id);
create index if not exists chat_messages_conversation_created_idx on public.chat_messages(conversation_id,created_at desc);
create index if not exists chat_messages_search_idx on public.chat_messages using gin(to_tsvector('simple',coalesce(body,'')));
alter table public.chat_messages drop constraint if exists chat_messages_message_type_check;
alter table public.chat_messages add constraint chat_messages_message_type_check check(message_type in ('text','emoji','link','image','video','audio','voice','file','system'));
alter table public.chat_messages drop constraint if exists chat_messages_message_status_check;
alter table public.chat_messages add constraint chat_messages_message_status_check check(message_status in ('sending','sent','delivered','read','failed','deleted','moderated'));
alter table public.chat_messages drop constraint if exists chat_messages_moderation_status_check;
alter table public.chat_messages add constraint chat_messages_moderation_status_check check(moderation_status in ('clear','flagged','under_review','restricted','hidden','approved'));
alter table public.chat_messages drop constraint if exists chat_messages_reply_to_message_id_fkey;
alter table public.chat_messages add constraint chat_messages_reply_to_message_id_fkey foreign key(reply_to_message_id) references public.chat_messages(id) on delete set null;

create table if not exists public.chat_message_attachments(id uuid primary key default gen_random_uuid(),public_id text not null unique default next_universal_id('MESSAGE_ATTACHMENT'),message_id uuid not null references public.chat_messages(id) on delete cascade,uploader_user_id uuid not null references auth.users(id),storage_bucket text not null default 'message-attachments',storage_path text not null,mime_type text not null,byte_size bigint not null check(byte_size>=0),original_filename text,media_type text not null default 'file' check(media_type in ('image','video','audio','voice','document','file')),scan_status text not null default 'pending' check(scan_status in ('pending','clean','flagged','rejected')),metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
alter table public.chat_message_attachments enable row level security;
create index if not exists chat_message_attachments_message_idx on public.chat_message_attachments(message_id);

create table if not exists public.chat_message_reactions(message_id uuid not null references public.chat_messages(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,reaction_type text not null,created_at timestamptz not null default now(),primary key(message_id,user_id,reaction_type));
alter table public.chat_message_reactions enable row level security;
create table if not exists public.chat_message_mentions(message_id uuid not null references public.chat_messages(id) on delete cascade,mentioned_user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(message_id,mentioned_user_id));
alter table public.chat_message_mentions enable row level security;

create table if not exists public.notification_deliveries(id uuid primary key default gen_random_uuid(),notification_id uuid not null references public.notifications(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,channel text not null check(channel in ('in_app','realtime','email','push')),status text not null default 'pending' check(status in ('pending','sent','delivered','failed','skipped')),provider text,provider_message_id text,error_code text,error_message text,attempted_at timestamptz,delivered_at timestamptz,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),unique(notification_id,channel));
alter table public.notification_deliveries enable row level security;

alter table public.notifications add column if not exists public_id text, add column if not exists category text not null default 'system', add column if not exists priority text not null default 'normal', add column if not exists action_url text, add column if not exists group_key text, add column if not exists read_at timestamptz, add column if not exists metadata jsonb not null default '{}'::jsonb;
update public.notifications set public_id=coalesce(public_id,next_universal_id('NOTIFICATION')) where public_id is null;
alter table public.notifications alter column public_id set not null;
create unique index if not exists notifications_public_id_uidx on public.notifications(public_id);
create index if not exists notifications_user_unread_idx on public.notifications(user_id,is_read,created_at desc);

alter table public.crm_contact_preferences add column if not exists timezone text not null default 'UTC', add column if not exists category_preferences jsonb not null default '{}'::jsonb;
insert into storage.buckets(id,name,public) values('message-attachments','message-attachments',false) on conflict(id) do nothing;

create policy chat_conversations_select_creator on public.chat_conversations for select to authenticated using(created_by=auth.uid());
create policy chat_participants_update_self on public.chat_participants for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy chat_message_reactions_select_participant on public.chat_message_reactions for select to authenticated using(exists(select 1 from public.chat_messages m join public.chat_participants p on p.conversation_id=m.conversation_id where m.id=chat_message_reactions.message_id and p.user_id=auth.uid()));
create policy chat_message_reactions_insert_self on public.chat_message_reactions for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.chat_messages m join public.chat_participants p on p.conversation_id=m.conversation_id where m.id=chat_message_reactions.message_id and p.user_id=auth.uid()));
create policy chat_message_reactions_delete_self on public.chat_message_reactions for delete to authenticated using(user_id=auth.uid());
create policy chat_message_mentions_select_participant on public.chat_message_mentions for select to authenticated using(exists(select 1 from public.chat_messages m join public.chat_participants p on p.conversation_id=m.conversation_id where m.id=chat_message_mentions.message_id and p.user_id=auth.uid()));
create policy chat_message_mentions_insert_sender on public.chat_message_mentions for insert to authenticated with check(exists(select 1 from public.chat_messages m where m.id=chat_message_mentions.message_id and m.sender_id=auth.uid()));
create policy chat_message_attachments_select_participant on public.chat_message_attachments for select to authenticated using(uploader_user_id=auth.uid() or exists(select 1 from public.chat_messages m join public.chat_participants p on p.conversation_id=m.conversation_id where m.id=chat_message_attachments.message_id and p.user_id=auth.uid()));
create policy chat_message_attachments_insert_sender on public.chat_message_attachments for insert to authenticated with check(uploader_user_id=auth.uid() and exists(select 1 from public.chat_messages m join public.chat_participants p on p.conversation_id=m.conversation_id where m.id=chat_message_attachments.message_id and p.user_id=auth.uid()));
create policy notification_deliveries_select_self on public.notification_deliveries for select to authenticated using(user_id=auth.uid());

create or replace function public.emit_chat_message_notification() returns trigger language plpgsql security definer set search_path=public as $$ declare r record; nid uuid; conv_type text; notif_category text; begin select conversation_type into conv_type from public.chat_conversations where id=new.conversation_id; notif_category:=case when conv_type='support' then 'support' when conv_type in('order','marketplace') then 'marketplace' when conv_type='affiliate' then 'affiliate' when conv_type in('creator','community') then 'social' when conv_type='admin' then 'system' when conv_type='ai_assisted' then 'ai' else 'social' end; for r in select p.user_id from public.chat_participants p where p.conversation_id=new.conversation_id and p.user_id<>new.sender_id and (p.is_muted=false or p.muted_until is null or p.muted_until<now()) and not exists(select 1 from public.user_blocks b where (b.blocker_user_id=p.user_id and b.blocked_user_id=new.sender_id) or (b.blocker_user_id=new.sender_id and b.blocked_user_id=p.user_id)) loop insert into public.notifications(user_id,actor_user_id,notification_type,title,body,entity_type,entity_id,category,priority,action_url,group_key,metadata) values(r.user_id,new.sender_id,'message','New message',left(coalesce(new.body,''),180),'conversation',new.conversation_id,notif_category,'normal','/messages/'||new.conversation_id::text,'message:'||new.conversation_id::text,jsonb_build_object('conversation_type',conv_type,'message_id',new.id)) returning id into nid; insert into public.notification_deliveries(notification_id,user_id,channel,status) values(nid,r.user_id,'in_app','sent') on conflict do nothing; insert into public.notification_deliveries(notification_id,user_id,channel,status) values(nid,r.user_id,'realtime','sent') on conflict do nothing; end loop; update public.chat_conversations set updated_at=now(),last_message_at=new.created_at where id=new.conversation_id; return new; end; $$;
drop trigger if exists trg_emit_chat_message_notification on public.chat_messages;
create trigger trg_emit_chat_message_notification after insert on public.chat_messages for each row execute function public.emit_chat_message_notification();

do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='chat_messages') then execute 'alter publication supabase_realtime add table public.chat_messages'; end if; if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='chat_conversations') then execute 'alter publication supabase_realtime add table public.chat_conversations'; end if; if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='chat_participants') then execute 'alter publication supabase_realtime add table public.chat_participants'; end if; if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='notifications') then execute 'alter publication supabase_realtime add table public.notifications'; end if; end $$;

commit;

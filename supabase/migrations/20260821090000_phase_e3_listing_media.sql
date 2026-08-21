-- DRIGHT E.3: first-party marketplace listing media foundation.
-- Images are public marketplace assets; ownership remains enforced on metadata rows.
create table if not exists public.marketplace_item_media (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.marketplace_items(id) on delete cascade,
  storage_path text not null,
  media_type text not null default 'image' check (media_type in ('image')),
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (item_id, storage_path)
);

create index if not exists marketplace_item_media_item_sort_idx
  on public.marketplace_item_media(item_id, sort_order, created_at);

alter table public.marketplace_item_media enable row level security;

create policy "Public can view media for published listings"
on public.marketplace_item_media
for select
using (
  exists (
    select 1 from public.marketplace_items i
    where i.id = marketplace_item_media.item_id
      and i.status = 'published'
  )
);

create policy "Owners can add listing media"
on public.marketplace_item_media
for insert
to authenticated
with check (
  exists (
    select 1 from public.marketplace_items i
    where i.id = marketplace_item_media.item_id
      and i.owner_user_id = auth.uid()
  )
);

create policy "Owners can update listing media"
on public.marketplace_item_media
for update
using (
  exists (
    select 1 from public.marketplace_items i
    where i.id = marketplace_item_media.item_id
      and i.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.marketplace_items i
    where i.id = marketplace_item_media.item_id
      and i.owner_user_id = auth.uid()
  )
);

create policy "Owners can delete listing media"
on public.marketplace_item_media
for delete
using (
  exists (
    select 1 from public.marketplace_items i
    where i.id = marketplace_item_media.item_id
      and i.owner_user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('marketplace-media', 'marketplace-media', true)
on conflict (id) do nothing;

create policy "Public can read marketplace media"
on storage.objects
for select
using (bucket_id = 'marketplace-media');

create policy "Authenticated users can upload marketplace media to their folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'marketplace-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their marketplace media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'marketplace-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'marketplace-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their marketplace media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'marketplace-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

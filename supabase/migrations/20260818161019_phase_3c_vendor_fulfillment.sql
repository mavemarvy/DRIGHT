create table if not exists public.order_fulfillments (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  seller_user_id uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','processing','ready_for_delivery','delivered','completed','cancelled','refunded','disputed')),
  delivery_message text,
  delivery_url text,
  tracking_reference text,
  delivered_at timestamptz,
  completed_at timestamptz,
  buyer_accepted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_fulfillments_seller_idx on public.order_fulfillments(seller_user_id, status, updated_at desc);
create index if not exists order_fulfillments_order_idx on public.order_fulfillments(order_id);

alter table public.order_fulfillments enable row level security;

create policy "Buyers view own order fulfillment"
on public.order_fulfillments for select
using (exists (select 1 from public.orders o where o.id = order_fulfillments.order_id and o.buyer_user_id = auth.uid()));

create policy "Sellers view own fulfillment"
on public.order_fulfillments for select
using (seller_user_id = auth.uid());

create or replace function public.ensure_order_fulfillment(p_order_item_id uuid)
returns public.order_fulfillments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.order_items;
  v_existing public.order_fulfillments;
  v_id text;
  v_row public.order_fulfillments;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_item from public.order_items where id = p_order_item_id and seller_user_id = auth.uid();
  if not found then raise exception 'Order item not found or access denied'; end if;
  select * into v_existing from public.order_fulfillments where order_item_id = p_order_item_id;
  if found then return v_existing; end if;
  v_id := 'DR-FUL-' || to_char(current_date, 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.order_fulfillments(fulfillment_id, order_id, order_item_id, seller_user_id)
  values (v_id, v_item.order_id, v_item.id, v_item.seller_user_id)
  returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.ensure_order_fulfillment(uuid) to authenticated;

create policy "Vendors view orders containing their items"
on public.orders for select
using (exists (select 1 from public.order_items oi where oi.order_id = orders.id and oi.seller_user_id = auth.uid()));

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists order_fulfillments_updated_at on public.order_fulfillments;
create trigger order_fulfillments_updated_at before update on public.order_fulfillments for each row execute function public.set_updated_at();

create or replace function public.create_order_fulfillment_for_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.order_fulfillments(fulfillment_id, order_id, order_item_id, seller_user_id)
  values ('DR-FUL-' || to_char(current_date, 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)), new.order_id, new.id, new.seller_user_id)
  on conflict (order_item_id) do nothing;
  return new;
end;
$$;

drop trigger if exists order_items_create_fulfillment on public.order_items;
create trigger order_items_create_fulfillment after insert on public.order_items for each row execute function public.create_order_fulfillment_for_item();

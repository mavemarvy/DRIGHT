create or replace function public.vendor_order_set_fulfillment(
  p_fulfillment_id uuid,
  p_status text,
  p_delivery_message text default null,
  p_delivery_url text default null,
  p_tracking_reference text default null
) returns public.order_fulfillments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.order_fulfillments;
  v_old text;
  v_order public.orders;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_row from public.order_fulfillments where id = p_fulfillment_id and seller_user_id = auth.uid() for update;
  if not found then raise exception 'Fulfillment not found or access denied'; end if;
  v_old := v_row.status;
  select * into v_order from public.orders where id = v_row.order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status not in ('paid','processing') then raise exception 'Fulfillment cannot start until payment is confirmed'; end if;
  if p_status not in ('processing','ready_for_delivery','delivered') then raise exception 'Vendor cannot set fulfillment status to %', p_status; end if;
  if p_status = 'processing' and v_old not in ('pending','processing') then raise exception 'Invalid fulfillment transition from % to %', v_old, p_status; end if;
  if p_status = 'ready_for_delivery' and v_old not in ('pending','processing','ready_for_delivery') then raise exception 'Invalid fulfillment transition from % to %', v_old, p_status; end if;
  if p_status = 'delivered' and v_old not in ('processing','ready_for_delivery','delivered') then raise exception 'Invalid fulfillment transition from % to %', v_old, p_status; end if;
  update public.order_fulfillments
  set status = p_status,
      delivery_message = coalesce(p_delivery_message, delivery_message),
      delivery_url = coalesce(p_delivery_url, delivery_url),
      tracking_reference = coalesce(p_tracking_reference, tracking_reference),
      delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
      updated_at = now()
  where id = p_fulfillment_id
  returning * into v_row;
  update public.orders set status = case when status = 'paid' then 'processing' else status end where id = v_row.order_id;
  insert into public.audit_logs(actor_user_id, action, resource_type, resource_id, metadata)
  values (auth.uid(), 'vendor_fulfillment_status_changed', 'order_fulfillment', v_row.fulfillment_id,
          jsonb_build_object('order_id', v_row.order_id, 'order_item_id', v_row.order_item_id, 'from', v_old, 'to', p_status));
  if v_order.buyer_user_id is not null then
    insert into public.notifications(user_id, actor_user_id, notification_type, title, body, entity_type, entity_id)
    values (v_order.buyer_user_id, auth.uid(), 'order_fulfillment',
      case p_status when 'processing' then 'Your order is being processed' when 'ready_for_delivery' then 'Your order is ready for delivery' when 'delivered' then 'Your order has been delivered' else 'Order update' end,
      case p_status when 'processing' then 'The vendor has started processing your order.' when 'ready_for_delivery' then 'The vendor has marked your order ready for delivery.' when 'delivered' then 'The vendor has submitted delivery for your order. Please review it.' else 'There is an update to your order.' end,
      'order', v_row.order_id);
  end if;
  return v_row;
end;
$$;

grant execute on function public.vendor_order_set_fulfillment(uuid,text,text,text,text) to authenticated;

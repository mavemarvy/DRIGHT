revoke execute on function public.vendor_order_set_fulfillment(uuid,text,text,text,text) from public, anon;
revoke execute on function public.ensure_order_fulfillment(uuid) from public, anon;
revoke execute on function public.create_order_fulfillment_for_item() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.vendor_order_set_fulfillment(uuid,text,text,text,text) to authenticated;
grant execute on function public.ensure_order_fulfillment(uuid) to authenticated;

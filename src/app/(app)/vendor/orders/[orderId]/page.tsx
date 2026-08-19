"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, FileWarning, PackageCheck, Send, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Order = { id: string; order_id: string; buyer_user_id: string | null; status: string; currency_code: string; subtotal: number; platform_fee: number; task_fee: number; total: number; created_at: string };
type Item = { id: string; item_id: string; quantity: number; unit_price: number; currency_code: string; seller_user_id: string; marketplace_items: { public_id?: string; title?: string; item_type?: string | null } | { public_id?: string; title?: string; item_type?: string | null }[] | null };
type Fulfillment = { id: string; fulfillment_id: string; order_item_id: string; status: string; delivery_message?: string | null; delivery_url?: string | null; tracking_reference?: string | null; delivered_at?: string | null };
type Profile = { username: string; full_name?: string | null; full_name_public?: boolean };
type NormalizedOrderItem = { item: Item; order: Order | null };

const nextStatuses: Record<string, { value: string; label: string }[]> = {
  pending: [{ value: "processing", label: "Start processing" }],
  processing: [{ value: "ready_for_delivery", label: "Mark ready" }, { value: "delivered", label: "Mark delivered" }],
  ready_for_delivery: [{ value: "delivered", label: "Mark delivered" }],
  delivered: [],
  completed: [],
};

export default function VendorOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const supabase = createClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
  const [buyer, setBuyer] = useState<Profile | null>(null);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const { orderId } = await params;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `/login?next=/vendor/orders/${encodeURIComponent(orderId)}`; return; }
    const { data, error: itemError } = await supabase.from("order_items").select("id,item_id,quantity,unit_price,currency_code,seller_user_id,marketplace_items(public_id,title,item_type),orders(id,order_id,buyer_user_id,status,currency_code,subtotal,platform_fee,task_fee,total,created_at)").eq("seller_user_id", user.id).eq("orders.order_id", orderId);
    if (itemError) { setError(itemError.message); setLoading(false); return; }
    const normalized: NormalizedOrderItem[] = (data || [])
      .map((row: any): NormalizedOrderItem => ({
        item: row as Item,
        order: Array.isArray(row.orders) ? (row.orders[0] ?? null) : (row.orders ?? null),
      }))
      .filter((x): x is NormalizedOrderItem & { order: Order } => Boolean(x.order));
    if (!normalized.length) { setError("Order not found or you do not have access to it."); setLoading(false); return; }
    const loadedOrder = normalized[0].order;
    setOrder(loadedOrder);
    setItems(normalized.map((x) => x.item));
    const itemIds = normalized.map((x) => x.item.id);
    const { data: fRows } = await supabase.from("order_fulfillments").select("id,fulfillment_id,order_item_id,status,delivery_message,delivery_url,tracking_reference,delivered_at").in("order_item_id", itemIds).eq("seller_user_id", user.id);
    setFulfillments((fRows || []) as Fulfillment[]);
    if (loadedOrder.buyer_user_id) {
      const { data: profile } = await supabase.from("profiles").select("username,full_name,full_name_public").eq("id", loadedOrder.buyer_user_id).maybeSingle();
      if (profile) setBuyer(profile as Profile);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function ensureFulfillment(itemId: string) {
    const { data, error: rpcError } = await supabase.rpc("ensure_order_fulfillment", { p_order_item_id: itemId });
    if (rpcError) throw rpcError;
    return data as Fulfillment;
  }

  async function updateFulfillment(itemId: string, status: string) {
    setBusy(true); setError("");
    try {
      let fulfillment = fulfillments.find((f) => f.order_item_id === itemId);
      if (!fulfillment) fulfillment = await ensureFulfillment(itemId);
      const { error: rpcError } = await supabase.rpc("vendor_order_set_fulfillment", {
        p_fulfillment_id: fulfillment.id,
        p_status: status,
        p_delivery_message: message || null,
        p_delivery_url: url || null,
        p_tracking_reference: tracking || null,
      });
      if (rpcError) throw rpcError;
      setMessage(""); setUrl(""); setTracking(""); setSelected("");
      await load();
    } catch (e: any) { setError(e?.message || "Unable to update fulfillment."); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><div className="h-96 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" /></div>;
  if (error || !order) return <div className="mx-auto max-w-3xl px-4 py-12 text-center"><FileWarning size={32} className="mx-auto" /><h1 className="mt-5 text-2xl font-semibold">Unable to open vendor order</h1><p className="mt-2 text-sm text-[var(--muted)]">{error || "Order not found."}</p><Link href="/vendor/orders" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold"><ArrowLeft size={16} /> Back to vendor orders</Link></div>;

  const buyerLabel = buyer ? (buyer.full_name_public && buyer.full_name ? `${buyer.full_name} (@${buyer.username})` : `@${buyer.username}`) : "Buyer";
  const firstFulfillment = fulfillments[0];
  const currentStatus = firstFulfillment?.status || (order.status === "paid" ? "pending" : order.status);
  const actions = nextStatuses[currentStatus] || [];

  return <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
    <Link href="/vendor/orders" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"><ArrowLeft size={16} /> Vendor orders</Link>
    <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Vendor order</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{order.order_id}</h1><p className="mt-2 text-sm text-[var(--muted)]">Placed {new Date(order.created_at).toLocaleString()} · Buyer {buyerLabel}</p></div><span className="w-fit rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold">{currentStatus.replaceAll("_", " ")}</span></div>
    {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-3"><PackageCheck size={20} /><h2 className="font-semibold">Your order items</h2></div><div className="mt-5 space-y-3">{items.map((item) => { const product = Array.isArray(item.marketplace_items) ? item.marketplace_items[0] : item.marketplace_items; const f = fulfillments.find((x) => x.order_item_id === item.id); return <div key={item.id} className="rounded-xl border border-[var(--border)] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{product?.title || "Marketplace item"}</p><p className="mt-1 text-xs text-[var(--muted)]">{product?.item_type || "listing"} · Product ID: {product?.public_id || item.item_id}</p></div><p className="text-sm font-semibold">{item.currency_code} {(Number(item.unit_price) * item.quantity).toLocaleString()}</p></div><div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]"><span>Qty {item.quantity}</span><span>·</span><span>Fulfillment: {f?.status || "pending"}</span></div></div>})}</div></section>
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-3"><Truck size={20} /><h2 className="font-semibold">Fulfillment</h2></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Update delivery progress for your items. DRIGHT controls payment verification, refunds, disputes and financial settlement separately.</p>{items.map((item) => { const product = Array.isArray(item.marketplace_items) ? item.marketplace_items[0] : item.marketplace_items; const f = fulfillments.find((x) => x.order_item_id === item.id); const actionsForItem = nextStatuses[f?.status || "pending"] || []; return <div key={item.id} className="mt-5 rounded-xl border border-[var(--border)] p-4"><p className="font-medium">{product?.title || "Item"}</p><p className="mt-1 text-xs text-[var(--muted)]">{f?.fulfillment_id || "Fulfillment will be created automatically"}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><select value={selected === item.id ? "" : ""} onChange={(e) => { if (e.target.value) { setSelected(item.id); updateFulfillment(item.id, e.target.value); } }} disabled={busy || !actionsForItem.length} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm"><option value="">{actionsForItem.length ? "Choose next status" : "No vendor action available"}</option>{actionsForItem.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select><input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking / delivery reference" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm" /></div><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Customer-visible delivery message" rows={3} className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm" /><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Digital delivery/access URL (optional)" className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm" />{f?.delivery_url && <a href={f.delivery_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold underline"><ExternalLink size={13} /> Existing delivery link</a>}</div>})}</section>
      </div>
      <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit"><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><h2 className="font-semibold">Payment</h2><p className="mt-2 text-sm text-[var(--muted)]">Payment status: <strong className="text-[var(--foreground)]">{order.status}</strong></p><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-[var(--muted)]">Order total</span><span>{order.currency_code} {Number(order.total).toLocaleString()}</span></div><div className="flex justify-between"><span className="text-[var(--muted)]">Platform fee</span><span>{order.currency_code} {Number(order.platform_fee).toLocaleString()}</span></div></div></section><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><h2 className="font-semibold">Customer communication</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use the order ID and Product ID when communicating with the customer. Full chat UI will use DRIGHT&apos;s shared messaging system.</p><Link href={`/help?order=${encodeURIComponent(order.order_id)}`} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold"><Send size={15} /> Contact support</Link></section><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-3"><CheckCircle2 size={19} /><h2 className="font-semibold">Vendor controls</h2></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Vendors can advance fulfillment only. They cannot mark a payment successful, issue a refund, change transaction amounts, or override fraud holds.</p></section></aside>
    </div>
  </div>;
}

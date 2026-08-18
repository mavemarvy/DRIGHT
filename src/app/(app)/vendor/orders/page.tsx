"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, PackageCheck, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OrderRow = { id: string; order_id: string; status: string; currency_code: string; total: number; created_at: string; buyer_user_id: string | null };
type ItemRow = { id: string; order_id: string; item_id: string; quantity: number; unit_price: number; seller_user_id: string; marketplace_items: { public_id?: string; title?: string; item_type?: string | null } | { public_id?: string; title?: string; item_type?: string | null }[] | null; orders: OrderRow | OrderRow[] | null };
type Fulfillment = { id: string; order_id: string; order_item_id: string; fulfillment_id: string; status: string; delivered_at?: string | null };

const tabs = ["all", "pending", "processing", "ready_for_delivery", "delivered", "completed", "cancelled", "refunded", "disputed"];
const labels: Record<string, string> = { all: "All", pending: "New", processing: "Processing", ready_for_delivery: "Ready", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled", refunded: "Refunded", disputed: "Disputed" };

export default function VendorOrdersPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<{ item: ItemRow; order: OrderRow; fulfillment: Fulfillment | null }[]>([]);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login?next=/vendor/orders"; return; }
      const { data, error: itemError } = await supabase.from("order_items").select("id,order_id,item_id,quantity,unit_price,seller_user_id,marketplace_items(public_id,title,item_type),orders(id,order_id,status,currency_code,total,created_at,buyer_user_id)").eq("seller_user_id", user.id).order("order_id", { ascending: false });
      if (itemError) { setError(itemError.message); setLoading(false); return; }
      const { data: fulfillments, error: fulfillmentError } = await supabase.from("order_fulfillments").select("id,order_id,order_item_id,fulfillment_id,status,delivered_at").eq("seller_user_id", user.id);
      if (fulfillmentError) { setError(fulfillmentError.message); setLoading(false); return; }
      const fMap = new Map((fulfillments || []).map((f) => [f.order_item_id, f as Fulfillment]));
      const normalized = (data || []).flatMap((item: any) => {
        const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
        return order ? [{ item: item as ItemRow, order: order as OrderRow, fulfillment: fMap.get(item.id) || null }] : [];
      });
      setRows(normalized);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => rows.filter(({ item, order, fulfillment }) => {
    const status = fulfillment?.status || (order.status === "paid" ? "pending" : order.status);
    const matchesTab = tab === "all" || status === tab || (tab === "pending" && status === "paid");
    const product = Array.isArray(item.marketplace_items) ? item.marketplace_items[0] : item.marketplace_items;
    const haystack = `${order.order_id} ${item.item_id} ${product?.public_id || ""} ${product?.title || ""}`.toLowerCase();
    return matchesTab && haystack.includes(query.toLowerCase().trim());
  }), [rows, tab, query]);

  return <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
    <Link href="/vendor" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"><ArrowLeft size={16} /> Vendor Center</Link>
    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Vendor Center</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Orders & fulfillment</h1><p className="mt-2 text-sm text-[var(--muted)]">Only orders containing your listings are shown.</p></div><div className="relative w-full sm:w-80"><Search size={17} className="absolute left-3 top-3 text-[var(--muted)]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Order ID, Product ID or name" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm outline-none" /></div></div>
    <div className="mt-6 flex gap-2 overflow-x-auto pb-2">{tabs.map((key) => <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold ${tab === key ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"}`}>{labels[key]}</button>)}</div>
    {loading ? <div className="mt-5 h-80 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" /> : error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div> : filtered.length === 0 ? <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center"><PackageCheck size={30} className="mx-auto" /><h2 className="mt-4 font-semibold">No vendor orders found</h2><p className="mt-2 text-sm text-[var(--muted)]">Orders will appear here after customers purchase your listings.</p></div> : <div className="mt-5 space-y-3">{filtered.map(({ item, order, fulfillment }) => { const product = Array.isArray(item.marketplace_items) ? item.marketplace_items[0] : item.marketplace_items; const status = fulfillment?.status || (order.status === "paid" ? "pending" : order.status); return <Link key={item.id} href={`/vendor/orders/${encodeURIComponent(order.order_id)}`} className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:shadow-md"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><PackageCheck size={18} /><p className="font-semibold">{order.order_id}</p></div><p className="mt-2 truncate text-sm">{product?.title || "Marketplace item"}</p><p className="mt-1 text-xs text-[var(--muted)]">Product ID: {product?.public_id || item.item_id} · Qty {item.quantity} · {new Date(order.created_at).toLocaleString()}</p></div><div className="text-left sm:text-right"><p className="text-sm font-semibold">{order.currency_code} {Number(item.unit_price * item.quantity).toLocaleString()}</p><span className="mt-2 inline-block rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold">{labels[status] || status}</span></div></div></Link>})}</div>}
  </div>;
}

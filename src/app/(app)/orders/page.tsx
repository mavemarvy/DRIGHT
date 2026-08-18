"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, PackageSearch, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  order_id: string;
  status: string;
  currency_code: string;
  subtotal: number;
  platform_fee: number;
  task_fee: number;
  total: number;
  created_at?: string;
};

type OrderItem = {
  order_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  currency_code: string;
  marketplace_items?: { public_id?: string; title?: string; item_type?: string | null } | null;
};

const statusLabels: Record<string, string> = {
  pending: "Pending payment",
  payment_processing: "Payment processing",
  paid: "Paid",
  processing: "Processing",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
  refund_pending: "Refund pending",
};

const statusClass: Record<string, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  refunded: "border-red-200 bg-red-50 text-red-700",
  disputed: "border-amber-200 bg-amber-50 text-amber-700",
};

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login?next=/orders";
        return;
      }

      const orderResult = await supabase
        .from("orders")
        .select("id,order_id,status,currency_code,subtotal,platform_fee,task_fee,total,created_at")
        .eq("buyer_user_id", user.id)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (orderResult.error) {
        setError(orderResult.error.message);
        setLoading(false);
        return;
      }

      const loadedOrders = (orderResult.data || []) as Order[];
      setOrders(loadedOrders);

      if (loadedOrders.length) {
        const itemResult = await supabase
          .from("order_items")
          .select("order_id,item_id,quantity,unit_price,currency_code,marketplace_items(public_id,title,item_type)")
          .in("order_id", loadedOrders.map((order) => order.id));
        if (!itemResult.error) setItems((itemResult.data || []) as OrderItem[]);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const visibleOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesTab = tab === "all" || (tab === "active" ? ["pending", "payment_processing", "paid", "processing", "delivered"].includes(order.status) : order.status === tab);
      if (!matchesTab) return false;
      if (!needle) return true;
      const related = items.filter((item) => item.order_id === order.id);
      return order.order_id.toLowerCase().includes(needle) || related.some((item) => `${item.marketplace_items?.title || ""} ${item.marketplace_items?.public_id || ""} ${item.item_id}`.toLowerCase().includes(needle));
    });
  }, [orders, items, query, tab]);

  const tabs = [
    ["all", "All"],
    ["active", "Active"],
    ["completed", "Completed"],
    ["cancelled", "Cancelled"],
    ["refunded", "Refunded"],
    ["disputed", "Disputed"],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Commerce</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your orders</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Every purchase has a permanent Order ID so you can track, access, refund, or dispute it without losing its history.</p>
        </div>
        <Link href="/marketplace" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--background)]">Continue shopping <ArrowRight size={16} /></Link>
      </div>

      <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(([value, label]) => (
            <button key={value} onClick={() => setTab(value)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium ${tab === value ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"}`}>{label}</button>
          ))}
        </div>
        <label className="flex w-full max-w-md items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
          <Search size={17} className="text-[var(--muted)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Order ID, product ID or name" className="w-full bg-transparent text-sm outline-none" />
        </label>
      </div>

      {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="mt-6 space-y-4">{[1, 2, 3].map((key) => <div key={key} className="h-36 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />)}</div>
      ) : visibleOrders.length ? (
        <div className="mt-6 space-y-4">
          {visibleOrders.map((order) => {
            const orderItems = items.filter((item) => item.order_id === order.id);
            const first = orderItems[0];
            return (
              <Link key={order.id} href={`/orders/${encodeURIComponent(order.order_id)}`} className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)]"><PackageSearch size={20} /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{first?.marketplace_items?.title || (orderItems.length > 1 ? `${orderItems.length} items` : "Order")}</span><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass[order.status] || "border-[var(--border)] bg-[var(--background)] text-[var(--muted)]"}`}>{statusLabels[order.status] || order.status}</span></div>
                      <p className="mt-2 text-xs text-[var(--muted)]">Order ID: <span className="font-medium text-[var(--foreground)]">{order.order_id}</span>{first?.marketplace_items?.public_id ? <> · Product ID: <span className="font-medium text-[var(--foreground)]">{first.marketplace_items.public_id}</span></> : null}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{order.created_at ? new Date(order.created_at).toLocaleString() : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-5 sm:justify-end"><div className="text-left sm:text-right"><p className="text-xs text-[var(--muted)]">Total</p><p className="mt-1 text-lg font-semibold">{order.currency_code} {Number(order.total).toLocaleString()}</p></div><ArrowRight size={18} className="text-[var(--muted)]" /></div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-12 text-center"><PackageSearch size={30} className="mx-auto" /><h2 className="mt-4 font-semibold">No orders found</h2><p className="mt-2 text-sm text-[var(--muted)]">Your purchases will appear here after checkout.</p><Link href="/marketplace" className="mt-5 inline-flex rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold">Browse marketplace</Link></div>
      )}
    </div>
  );
}

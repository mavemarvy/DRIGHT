"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Download, ExternalLink, FileWarning, MessageSquare, PackageCheck, ReceiptText, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Order = { id: string; order_id: string; status: string; currency_code: string; subtotal: number; platform_fee: number; task_fee: number; total: number; created_at?: string };
type Item = { id: string; item_id: string; seller_user_id: string; quantity: number; unit_price: number; currency_code: string; metadata?: Record<string, unknown>; marketplace_items?: { id: string; public_id?: string; title?: string; item_type?: string | null } | null };
type Transaction = { id: string; transaction_id: string; amount: number; currency_code: string; provider?: string | null; provider_transaction_id?: string | null; status: string; created_at: string };

const labels: Record<string, string> = { pending: "Pending payment", payment_processing: "Payment processing", paid: "Paid", processing: "Processing", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled", refunded: "Refunded", disputed: "Disputed", refund_pending: "Refund pending" };
const steps = ["pending", "paid", "processing", "delivered", "completed"];

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const supabase = createClient();
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { orderId: resolvedOrderId } = await params;
      if (!active) return;
      setOrderId(resolvedOrderId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = `/login?next=/orders/${encodeURIComponent(resolvedOrderId)}`; return; }

      const orderResult = await supabase.from("orders").select("id,order_id,status,currency_code,subtotal,platform_fee,task_fee,total,created_at").eq("buyer_user_id", user.id).eq("order_id", resolvedOrderId).maybeSingle();
      if (!active) return;
      if (orderResult.error || !orderResult.data) { setError(orderResult.error?.message || "Order not found or you do not have access to it."); setLoading(false); return; }
      const loadedOrder = orderResult.data as Order;
      setOrder(loadedOrder);

      const [itemResult, transactionResult] = await Promise.all([
        supabase.from("order_items").select("id,item_id,seller_user_id,quantity,unit_price,currency_code,metadata,marketplace_items(id,public_id,title,item_type)").eq("order_id", loadedOrder.id),
        supabase.from("transactions").select("id,transaction_id,amount,currency_code,provider,provider_transaction_id,status,created_at").eq("order_id", loadedOrder.id).order("created_at", { ascending: false }),
      ]);
      if (itemResult.error) setError(itemResult.error.message); else setItems((itemResult.data || []) as Item[]);
      if (!transactionResult.error) setTransactions((transactionResult.data || []) as Transaction[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [params]);

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><div className="h-96 animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]" /></div>;
  if (error || !order) return <div className="mx-auto max-w-3xl px-4 py-12 text-center"><FileWarning size={32} className="mx-auto" /><h1 className="mt-5 text-2xl font-semibold">Unable to open order</h1><p className="mt-2 text-sm text-[var(--muted)]">{error || "Order not found."}</p><Link href="/orders" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold"><ArrowLeft size={16} /> Back to orders</Link></div>;

  const currentIndex = steps.indexOf(order.status);
  const isTerminalProblem = ["cancelled", "refunded", "disputed", "refund_pending"].includes(order.status);

  return (
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
      <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"><ArrowLeft size={16} /> Back to orders</Link>
      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Order details</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{order.order_id}</h1><p className="mt-2 text-sm text-[var(--muted)]">Placed {order.created_at ? new Date(order.created_at).toLocaleString() : ""}</p></div>
        <span className="w-fit rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold">{labels[order.status] || order.status}</span>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center gap-3"><PackageCheck size={20} /><h2 className="font-semibold">Order progress</h2></div>
        {isTerminalProblem ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">This order is currently <strong>{labels[order.status] || order.status}</strong>. Any refund, dispute, or cancellation decision remains auditable in DRIGHT.</div> : <div className="mt-6 grid grid-cols-5 gap-2">{steps.map((step, index) => { const done = currentIndex >= index; return <div key={step} className="text-center"><div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border ${done ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{done ? <CheckCircle2 size={17} /> : <Clock3 size={16} />}</div><p className="mt-2 text-[11px] font-medium sm:text-xs">{labels[step]}</p></div>; })}</div>}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_330px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-3"><ReceiptText size={20} /><h2 className="font-semibold">Purchased items</h2></div><div className="mt-5 space-y-3">{items.map((item) => <div key={item.id} className="rounded-xl border border-[var(--border)] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><Link href={`/marketplace/${item.marketplace_items?.public_id || item.item_id}`} className="font-semibold hover:underline">{item.marketplace_items?.title || "Marketplace item"}</Link><p className="mt-1 text-xs text-[var(--muted)]">{item.marketplace_items?.item_type || "listing"} · Product ID: {item.marketplace_items?.public_id || item.item_id}</p></div><p className="text-sm font-semibold">{item.currency_code} {(Number(item.unit_price) * item.quantity).toLocaleString()}</p></div><p className="mt-2 text-xs text-[var(--muted)]">Quantity: {item.quantity}</p>{["paid", "processing", "delivered", "completed"].includes(order.status) && ["course", "digital_product"].includes(item.marketplace_items?.item_type || "") && <Link href={`/learning/${item.marketplace_items?.public_id || item.item_id}`} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold"><ExternalLink size={14} /> Continue learning / access</Link>}</div>)}</div></section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-3"><ShieldAlert size={20} /><h2 className="font-semibold">Need help with this order?</h2></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use the Order ID and Product ID when contacting DRIGHT support. This lets the team locate the exact transaction without relying on product names.</p><div className="mt-5 flex flex-wrap gap-3"><Link href={`/help?order=${encodeURIComponent(order.order_id)}`} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold"><MessageSquare size={16} /> Contact support</Link>{["paid", "processing", "delivered", "completed"].includes(order.status) && <Link href={`/refunds/new?order=${encodeURIComponent(order.order_id)}`} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold"><Download size={16} /> Request refund / dispute</Link>}</div></section>
        </div>

        <aside className="h-fit space-y-6 lg:sticky lg:top-24">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><h2 className="font-semibold">Payment summary</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-[var(--muted)]">Subtotal</span><span>{order.currency_code} {Number(order.subtotal).toLocaleString()}</span></div><div className="flex justify-between"><span className="text-[var(--muted)]">Platform fee</span><span>{order.currency_code} {Number(order.platform_fee).toLocaleString()}</span></div><div className="flex justify-between"><span className="text-[var(--muted)]">Task fee</span><span>{order.currency_code} {Number(order.task_fee).toLocaleString()}</span></div><div className="flex justify-between border-t border-[var(--border)] pt-4 text-lg font-semibold"><span>Total</span><span>{order.currency_code} {Number(order.total).toLocaleString()}</span></div></div></section>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><h2 className="font-semibold">Transactions</h2>{transactions.length ? <div className="mt-4 space-y-4">{transactions.map((transaction) => <div key={transaction.id} className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0"><p className="text-xs font-semibold">{transaction.provider || "Payment"} · {transaction.status}</p><p className="mt-1 text-xs text-[var(--muted)]">Transaction ID: {transaction.transaction_id}</p>{transaction.provider_transaction_id && <p className="mt-1 text-xs text-[var(--muted)]">Provider ref: {transaction.provider_transaction_id}</p>}<p className="mt-2 text-sm font-semibold">{transaction.currency_code} {Number(transaction.amount).toLocaleString()}</p></div>)}</div> : <p className="mt-3 text-sm text-[var(--muted)]">No payment transaction has been recorded yet.</p>}</section>
        </aside>
      </div>
    </div>
  );
}

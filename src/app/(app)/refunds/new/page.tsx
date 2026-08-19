"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NewRefundPage() {
  const search = useSearchParams();
  const orderId = search.get("order") || "";
  const supabase = createClient();
  const [order, setOrder] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [type, setType] = useState("refund");
  const [reasonType, setReasonType] = useState("item_not_received");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = `/login?next=${encodeURIComponent(`/refunds/new?order=${orderId}`)}`; return; }
      if (!orderId) { setMessage("An Order ID is required."); return; }
      const { data: loaded } = await supabase.from("orders").select("id,order_id,status,total,currency_code").eq("buyer_user_id", user.id).eq("order_id", orderId).maybeSingle();
      if (!loaded) { setMessage("Order not found or you do not have access to it."); return; }
      setOrder(loaded);
      const { data: tx } = await supabase.from("transactions").select("id,transaction_id,amount,currency_code,status,provider").eq("order_id", loaded.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setTransaction(tx);
    })();
  }, [orderId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!order || !transaction || !reason.trim()) { setMessage("Please provide the transaction and a clear reason."); return; }
    setBusy(true); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Please sign in again."); setBusy(false); return; }
    const { data, error } = await supabase.from("refund_disputes").insert({ transaction_id: transaction.id, reporter_user_id: user.id, reason_type: `${type}:${reasonType}`, reason: reason.trim(), evidence: [], status: "open" }).select("case_id").single();
    if (error) setMessage(error.message); else setMessage(`Case ${data?.case_id || "created"} is now open. DRIGHT will route it for review.`);
    setBusy(false);
  }

  if (message && !order) return <div className="mx-auto max-w-xl px-4 py-16 text-center"><ShieldAlert size={34} className="mx-auto"/><h1 className="mt-5 text-2xl font-semibold">Refund / dispute</h1><p className="mt-3 text-sm text-[var(--muted)]">{message}</p><Link href="/orders" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold"><ArrowLeft size={16}/> Orders</Link></div>;

  return <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8"><Link href={order ? `/orders/${order.order_id}` : "/orders"} className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Back to order</Link><div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-3"><ShieldAlert size={21}/><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Case intake</p><h1 className="mt-1 text-2xl font-semibold">Refund or dispute</h1></div></div><p className="mt-4 text-sm leading-6 text-[var(--muted)]">Order <strong>{order?.order_id}</strong> · {order?.currency_code} {Number(order?.total || 0).toLocaleString()}. Submitting a case does not automatically approve a refund.</p><form onSubmit={submit} className="mt-6 space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="rounded-xl border border-[var(--border)] p-4"><span className="text-sm font-semibold">Refund request</span><input type="radio" name="type" value="refund" checked={type === "refund"} onChange={() => setType("refund")} className="float-right"/></label><label className="rounded-xl border border-[var(--border)] p-4"><span className="text-sm font-semibold">Dispute</span><input type="radio" name="type" value="dispute" checked={type === "dispute"} onChange={() => setType("dispute")} className="float-right"/></label></div><select value={reasonType} onChange={(e) => setReasonType(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm"><option value="item_not_received">Item not received</option><option value="not_as_described">Not as described</option><option value="defective">Defective / unusable</option><option value="duplicate_charge">Duplicate charge</option><option value="unauthorized">Unauthorized transaction</option><option value="other">Other</option></select><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={7} maxLength={10000} required placeholder="Explain what happened and include relevant Order ID/Product ID details." className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm outline-none"/>{message && <div className="rounded-xl border border-[var(--border)] p-4 text-sm">{message}</div>}<button disabled={busy || !transaction} className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold disabled:opacity-50">{busy ? "Submitting…" : `Submit ${type === "refund" ? "refund request" : "dispute"}`}</button></form></div></div>;
}

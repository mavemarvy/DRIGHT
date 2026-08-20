"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CommissionPage(){
  const s=createClient();
  const [rows,setRows]=useState<any[]>([]);
  const [q,setQ]=useState("");
  const [status,setStatus]=useState("all");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    (async()=>{
      const {data:{user}}=await s.auth.getUser();
      if(!user){location.href="/login?next=/affiliate/commissions";return;}
      const r=await s.from("commissions").select("commission_id,order_id,order_item_id,item_id,base_amount,commission_percent,commission_amount,currency_code,status,available_at,paid_at,reversed_at,created_at").eq("affiliate_user_id",user.id).order("created_at",{ascending:false});
      setRows(r.data||[]);
      setLoading(false);
    })();
  },[]);

  const filtered=useMemo(()=>rows.filter(r=>(status==="all"||r.status===status)&&JSON.stringify(r).toLowerCase().includes(q.toLowerCase())),[rows,status,q]);
  const totals=useMemo(()=>filtered.reduce((a,r)=>{
    const n=Number(r.commission_amount||0);
    if(r.status==="pending")a.pending+=n;
    if(r.status==="available")a.available+=n;
    if(r.status==="paid")a.paid+=n;
    return a;
  },{pending:0,available:0,paid:0}),[filtered]);

  return <main className="mx-auto max-w-6xl px-4 py-8">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-3xl font-semibold">Affiliate Commissions</h1><p className="mt-2 text-sm text-[var(--muted)]">Auditable earnings linked to orders, listings and payout status.</p></div>
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {[["Pending",totals.pending],["Available",totals.available],["Paid",totals.paid]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div><div className="mt-2 text-2xl font-semibold">{Number(value).toFixed(2)}</div></div>)}
    </div>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search commission, order or listing ID" className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm"/><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3"><option value="all">All</option><option value="pending">Pending</option><option value="available">Available</option><option value="paid">Paid</option><option value="reversed">Reversed</option><option value="cancelled">Cancelled</option></select></div>
    <section className="mt-6 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b border-[var(--border)]"><th className="p-4">Commission ID</th><th>Order</th><th>Listing</th><th>Rate</th><th>Amount</th><th>Status</th><th className="p-4">Available</th></tr></thead><tbody>{loading?<tr><td className="p-6" colSpan={7}>Loading…</td></tr>:filtered.map(r=><tr className="border-b border-[var(--border)]" key={r.commission_id||r.order_item_id||r.order_id}><td className="p-4 font-medium">{r.commission_id||"—"}</td><td>{r.order_id||"—"}</td><td>{r.item_id||"—"}</td><td>{Number(r.commission_percent||0)}%</td><td>{Number(r.commission_amount||0).toFixed(2)} {r.currency_code||"USD"}</td><td>{r.status}</td><td className="p-4">{r.available_at?new Date(r.available_at).toLocaleString():"—"}</td></tr>)}</tbody></table>{!loading&&!filtered.length&&<p className="p-8 text-sm text-[var(--muted)]">No commissions found.</p>}</section>
  </main>
}

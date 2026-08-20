"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Megaphone, PauseCircle, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminPromotionsPage() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("marketing_campaigns").select("id,campaign_id,advertiser_user_id,name,promotion_type,status,approval_status,payment_status,total_budget,amount_spent,currency_code,created_at").order("created_at", { ascending: false }),
      supabase.from("promotion_pricing").select("id,pricing_key,promotion_type,pricing_model,unit_price,currency_code,enabled,minimum_daily_budget,minimum_total_budget").order("pricing_key"),
    ]);
    setCampaigns(c ?? []); setPricing(p ?? []);
  }

  useEffect(() => { load(); }, []);

  async function review(id: string, next: "approved" | "rejected" | "paused") {
    setMessage("");
    const { error } = await supabase.from("marketing_campaigns").update({ approval_status: next === "approved" ? "approved" : next === "rejected" ? "rejected" : "suspended", status: next === "approved" ? "approved" : next === "rejected" ? "rejected" : "paused", reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) setMessage(error.message); else { setMessage(`Campaign ${next}.`); await load(); }
  }

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"><div className="flex items-start gap-4"><Megaphone size={30}/><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Super Admin</p><h1 className="mt-1 text-3xl font-semibold">Promotion Control Center</h1><p className="mt-2 text-sm text-[var(--muted)]">Review campaigns, inspect spend and control advertising pricing without touching the financial ledger.</p></div></div></header>
    {message && <p className="mt-4 text-sm text-[var(--muted)]">{message}</p>}
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="font-semibold">Campaign review queue</h2><div className="mt-4 space-y-3">{campaigns.filter(c=>["pending_review","approved","active","paused","rejected"].includes(c.status)).map(c=><article key={c.id} className="rounded-xl border border-[var(--border)] p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-semibold">{c.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{c.campaign_id} · {c.promotion_type} · {c.status}</p></div><div className="flex flex-wrap gap-2">{c.status === "pending_review" && <><button onClick={()=>review(c.id,"approved")} className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><CheckCircle2 size={14}/> Approve</button><button onClick={()=>review(c.id,"rejected")} className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><XCircle size={14}/> Reject</button></>}{c.status === "active" && <button onClick={()=>review(c.id,"paused")} className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><PauseCircle size={14}/> Suspend</button>}</div></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4"><div><span className="text-[var(--muted)]">Budget</span><p>{c.total_budget} {c.currency_code}</p></div><div><span className="text-[var(--muted)]">Spent</span><p>{c.amount_spent}</p></div><div><span className="text-[var(--muted)]">Approval</span><p>{c.approval_status}</p></div><div><span className="text-[var(--muted)]">Payment</span><p>{c.payment_status}</p></div></div></article>)}{campaigns.length===0 && <p className="text-sm text-[var(--muted)]">No campaigns found.</p>}</div></section>
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="font-semibold">Configured pricing</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs text-[var(--muted)]"><tr><th className="py-2">Key</th><th>Type</th><th>Model</th><th>Unit price</th><th>Currency</th><th>Enabled</th></tr></thead><tbody>{pricing.map(p=><tr key={p.id} className="border-t border-[var(--border)]"><td className="py-3">{p.pricing_key}</td><td>{p.promotion_type}</td><td>{p.pricing_model}</td><td>{p.unit_price}</td><td>{p.currency_code}</td><td>{p.enabled ? "Yes" : "No"}</td></tr>)}</tbody></table></div></section>
  </main>;
}

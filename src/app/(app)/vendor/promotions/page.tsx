"use client";

import { useEffect, useState } from "react";
import { Megaphone, Plus, Pause, Play, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function VendorPromotionsPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("10");
  const [listingId, setListingId] = useState("");
  const [pricingId, setPricingId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const [{ data: c }, { data: l }, { data: p }] = await Promise.all([
      supabase.from("marketing_campaigns").select("id,campaign_id,name,promotion_type,status,approval_status,payment_status,total_budget,amount_spent,start_at,end_at").eq("advertiser_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("marketplace_items").select("id,public_id,title,item_type,status").eq("owner_user_id", user.id).in("status", ["approved", "published"]),
      supabase.from("promotion_pricing").select("id,pricing_key,promotion_type,pricing_model,unit_price,currency_code,minimum_total_budget,minimum_daily_budget").eq("enabled", true),
    ]);
    setCampaigns(c ?? []); setListings(l ?? []); setPricing(p ?? []);
    if (!pricingId && p?.[0]) setPricingId(p[0].id);
    if (!listingId && l?.[0]) setListingId(l[0].id);
  }

  useEffect(() => { load(); }, []);

  async function createCampaign() {
    setMessage("");
    if (!userId || !name.trim() || !listingId) return setMessage("Choose an eligible listing and campaign name.");
    const selectedPricing = pricing.find((x) => x.id === pricingId);
    const { data: campaign, error } = await supabase.from("marketing_campaigns").insert({
      advertiser_user_id: userId,
      name: name.trim(),
      promotion_type: "sponsored_listing",
      pricing_id: pricingId || null,
      currency_code: selectedPricing?.currency_code ?? "USD",
      total_budget: Number(budget),
      daily_budget: Number(budget),
      approval_status: "pending",
      status: "pending_review",
      pricing_snapshot: selectedPricing ?? {},
      placement_config: { listing: true },
    }).select("id").single();
    if (error || !campaign) return setMessage(error?.message ?? "Could not create campaign.");
    const { error: linkError } = await supabase.from("sponsored_listings").insert({ campaign_id: campaign.id, listing_id: listingId, seller_user_id: userId, status: "pending_review" });
    if (linkError) return setMessage(linkError.message);
    await supabase.rpc("record_promotion_event", { p_campaign_id: campaign.id, p_event_key: crypto.randomUUID(), p_event_type: "promotion_created", p_user_id: userId });
    setName(""); setMessage("Campaign submitted for review."); await load();
  }

  async function transition(id: string, next: "paused" | "active" | "cancelled") {
    const { error } = await supabase.rpc("promotion_transition", { p_campaign_id: id, p_next_status: next });
    if (error) setMessage(error.message); else await load();
  }

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
      <div className="flex items-start gap-4"><Megaphone size={30}/><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Vendor Center</p><h1 className="mt-1 text-3xl font-semibold">Promotions & Advertising</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Create sponsored campaigns for eligible marketplace listings. Approval and payment gates remain server-controlled.</p></div></div>
    </header>

    <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 font-semibold"><Plus size={18}/> New sponsored campaign</div>
        <label className="mt-5 block text-sm">Campaign name<input value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2" placeholder="Launch campaign" /></label>
        <label className="mt-4 block text-sm">Eligible listing<select value={listingId} onChange={e=>setListingId(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">{listings.map(l=><option key={l.id} value={l.id}>{l.title} · {l.item_type}</option>)}</select></label>
        <label className="mt-4 block text-sm">Pricing model<select value={pricingId} onChange={e=>setPricingId(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2">{pricing.map(p=><option key={p.id} value={p.id}>{p.pricing_model} · {p.pricing_key}</option>)}</select></label>
        <label className="mt-4 block text-sm">Total budget<input type="number" min="0" value={budget} onChange={e=>setBudget(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2" /></label>
        <button onClick={createCampaign} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-[var(--background)]">Submit for review</button>
        {message && <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>}
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2 font-semibold"><BarChart3 size={18}/> Your campaigns</div>
        <div className="mt-4 space-y-3">{campaigns.length === 0 ? <p className="text-sm text-[var(--muted)]">No promotion campaigns yet.</p> : campaigns.map(c=><article key={c.id} className="rounded-xl border border-[var(--border)] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{c.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{c.campaign_id} · {c.status}</p></div><div className="flex gap-2">{c.status === "active" && <button onClick={()=>transition(c.id,"paused")} className="rounded-lg border border-[var(--border)] p-2" aria-label="Pause"><Pause size={15}/></button>}{c.status === "paused" && <button onClick={()=>transition(c.id,"active")} className="rounded-lg border border-[var(--border)] p-2" aria-label="Resume"><Play size={15}/></button>}</div></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><span className="text-[var(--muted)]">Budget</span><p>{c.total_budget} {c.currency_code}</p></div><div><span className="text-[var(--muted)]">Spent</span><p>{c.amount_spent}</p></div><div><span className="text-[var(--muted)]">Approval</span><p>{c.approval_status}</p></div></div></article>)}</div>
      </div>
    </section>
  </main>;
}

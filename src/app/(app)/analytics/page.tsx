"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, BriefcaseBusiness, DollarSign, Gift, MousePointerClick, ShoppingBag, Sparkles, Users, WalletCards, ArrowUpRight, RefreshCw, Download } from "lucide-react";

type Section = Record<string, any>;
type Snapshot = { authenticated: boolean; days: number; buyer: Section; seller: Section; affiliate: Section; referral: Section; jobs: Section; admin: Section; permissions: Section };

const labels: Record<string,string> = { purchases:"Purchases", spending:"Spending", saved_products:"Saved products", activity:"Activity", recommendations:"Recommendations", views:"Views", clicks:"Clicks", sales:"Sales", conversion:"Conversion", revenue:"Revenue", products:"Products", reviews:"Reviews", customers:"Customers", traffic:"Traffic", applications:"Applications", invitations:"Invitations", qualified_referrals:"Qualified referrals", rewards:"Rewards", commission:"Commission", earnings:"Earnings", conversion_rate:"Conversion rate", active_jobs:"Active jobs", platform_growth:"New users", users:"Users", sellers:"Listings created", buyers:"Buyers with orders", transactions:"Successful transactions", moderation:"Moderation reports", support:"Support tickets", fraud:"Fraud/dispute cases", requests:"AI requests", estimated_cost:"AI estimated cost", listing_events:"Marketplace events" };

function formatValue(key: string, value: any) {
  if (value === null || value === undefined) return "Unavailable";
  if (["conversion","conversion_rate"].includes(key)) return `${Number(value).toFixed(2)}%`;
  if (["spending","revenue","rewards","commission","earnings","estimated_cost"].includes(key)) return new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:2}).format(Number(value));
  return new Intl.NumberFormat().format(Number(value));
}

function Stat({ label, value, icon: Icon }: { label:string; value:any; icon:any }) {
  return <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)]"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={18}/></span><span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Real data</span></div><p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-black tracking-tight">{formatValue(label.toLowerCase().replaceAll(" ","_"),value)}</p></div>;
}

function MetricGrid({ data }: { data: Section }) {
  const entries = Object.entries(data || {}).filter(([k,v]) => k !== "top_products" && k !== "campaign_performance" && k !== "traffic" && v !== undefined);
  if (!entries.length) return <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">No authorized data is available for this analytics area.</div>;
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{entries.map(([key,value]) => <div key={key} className="rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">{labels[key] || key.replaceAll("_"," ")}</p><p className="mt-2 text-xl font-black">{formatValue(key,value)}</p></div>)}</div>;
}

function SectionCard({ title, eyebrow, icon: Icon, data }: { title:string; eyebrow:string; icon:any; data:Section }) {
  return <section className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]"><Icon size={15}/>{eyebrow}</div><h2 className="mt-1 text-xl font-black tracking-tight">{title}</h2></div></div><div className="mt-5"><MetricGrid data={data}/></div></section>;
}

export default function AnalyticsPage() {
  const [days,setDays] = useState(30);
  const [data,setData] = useState<Snapshot|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { const response = await fetch(`/api/analytics?days=${days}`, { cache:"no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Analytics could not be loaded"); setData(body); }
    catch (e) { setError(e instanceof Error ? e.message : "Analytics could not be loaded"); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[days]);

  const headline = useMemo(() => { if (!data) return []; const cards = [{k:"purchases",v:data.buyer?.purchases,i:ShoppingBag},{k:"spending",v:data.buyer?.spending,i:DollarSign},{k:"activity",v:data.buyer?.activity,i:BarChart3},{k:"recommendations",v:data.buyer?.recommendations,i:Sparkles}]; return cards; },[data]);

  function exportData() { if (!data || data.permissions?.admin !== true) return; const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`dright-analytics-${days}d.json`; a.click(); URL.revokeObjectURL(url); }

  return <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <section className="relative overflow-hidden rounded-[var(--radius-3xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8"><div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--accent-soft)] blur-3xl"/><div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Analytics command center</p><h1 className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Understand what is actually happening.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Production metrics sourced from DRIGHT's current data architecture. Unsupported metrics are shown as unavailable instead of being invented.</p></div><div className="flex flex-wrap gap-2"><select value={days} onChange={e=>setDays(Number(e.target.value))} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold outline-none"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 365 days</option></select><button onClick={load} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2.5 text-sm font-semibold"><RefreshCw size={15}/> Refresh</button>{data?.permissions?.admin===true && <button onClick={exportData} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-[var(--primary-contrast)]"><Download size={15}/> Export</button>}</div></div></section>

    {error && <div className="mt-5 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
    {loading ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="h-32 animate-pulse rounded-[var(--radius-xl)] bg-[var(--surface-muted)]"/>)}</div> : <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{headline.map(({k,v,i})=><Stat key={k} label={labels[k]} value={v} icon={i}/>)}</div>
      <div className="mt-7 grid gap-5">{data && <>
        <SectionCard title="Buyer analytics" eyebrow="Purchases & activity" icon={ShoppingBag} data={data.buyer}/>
        {Object.keys(data.seller||{}).length>0 && <SectionCard title="Seller analytics" eyebrow="Sales & traffic" icon={WalletCards} data={data.seller}/>} 
        {Object.keys(data.affiliate||{}).length>0 && <SectionCard title="Affiliate analytics" eyebrow="Clicks & earnings" icon={MousePointerClick} data={data.affiliate}/>} 
        <SectionCard title="Referral analytics" eyebrow="Invitations & rewards" icon={Gift} data={data.referral}/>
        {Object.keys(data.jobs||{}).length>0 && <SectionCard title="Jobs analytics" eyebrow="Applications" icon={BriefcaseBusiness} data={data.jobs}/>} 
        {Object.keys(data.admin||{}).length>0 && <SectionCard title="Admin analytics" eyebrow="Platform operations" icon={Users} data={data.admin}/>} 
      </>}</div>
      <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs leading-5 text-[var(--muted)]">Comparison period: the preceding {days} days is retained by the analytics API for future trend/drill-down expansion. Current UI intentionally does not display unsupported comparison values.</div>
    </>}

    <div className="mt-7 flex flex-wrap gap-3 text-sm"><Link href="/dashboard" className="inline-flex items-center gap-2 font-semibold text-[var(--accent)]">Back to dashboard <ArrowUpRight size={15}/></Link><Link href="/marketplace" className="inline-flex items-center gap-2 font-semibold text-[var(--accent)]">Marketplace <ArrowUpRight size={15}/></Link></div>
  </div>;
}

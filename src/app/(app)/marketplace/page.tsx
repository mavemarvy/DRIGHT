"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, CheckCircle2, ChevronRight, Heart, Search, ShoppingBag, Sparkles, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = { id: string; title: string; description: string | null; item_type: string | null; price: number | null; currency: string | null; status: string | null; created_at: string | null; };
const filters = [
  ["All", "all", Sparkles], ["Products", "product", ShoppingBag], ["Services", "service", Wrench], ["Courses", "course", BookOpen], ["Jobs", "job", BriefcaseBusiness], ["Tasks", "task", CheckCircle2],
] as const;

export default function MarketplacePage() {
  const supabase = createClient();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true); setError("");
      let request = supabase.from("marketplace_items").select("id,title,description,item_type,price,currency,status,created_at").eq("status", "published").order("created_at", { ascending: false }).limit(24);
      if (filter !== "all") request = request.eq("item_type", filter);
      const { data, error: queryError } = await request;
      if (queryError) setError(queryError.message); else setItems((data ?? []) as Item[]);
      setLoading(false);
    }
    load();
  }, [filter]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.title} ${item.description ?? ""}`.toLowerCase().includes(q));
  }, [items, query]);

  return <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9">
      <div className="max-w-3xl"><p className="text-sm font-semibold text-[var(--muted)]">DRIGHT Marketplace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Discover something that moves you forward.</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Explore products, services, courses, jobs and tasks from the growing DRIGHT ecosystem.</p></div>
      <div className="mt-7 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3"><Search size={19} className="shrink-0 text-[var(--muted)]" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="What are you looking for?" /></div>
    </section>

    <section className="mt-7"><div className="flex gap-2 overflow-x-auto pb-2">{filters.map(([label, value, Icon]) => <button key={value} onClick={() => setFilter(value)} className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${filter === value ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--background)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}><Icon size={16} />{label}</button>)}</div></section>

    <section className="mt-10"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Discovery</p><h2 className="mt-1 text-2xl font-semibold">{filter === "all" ? "Recommended & new" : labelFor(filter)}</h2></div><span className="text-sm text-[var(--muted)]">{visible.length} shown</span></div>
      {loading ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />)}</div> : error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Could not load marketplace listings: {error}</div> : visible.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center"><Sparkles className="mx-auto" size={24} /><h3 className="mt-4 font-semibold">Nothing here yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Approved listings will appear here as the DRIGHT marketplace grows.</p></div> : <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.map((item) => <Link href={`/marketplace/${item.id}`} key={item.id} className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex h-36 items-center justify-center bg-[var(--background)]"><ShoppingBag size={30} className="text-[var(--muted)]" /></div><div className="p-5"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">{labelFor(item.item_type)}</span><Heart size={17} className="text-[var(--muted)]" /></div><h3 className="mt-4 line-clamp-2 font-semibold">{item.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--muted)]">{item.description || "Explore this DRIGHT listing."}</p><div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4"><span className="font-semibold">{item.price == null ? "Contact seller" : `${item.currency || "USD"} ${item.price.toLocaleString()}`}</span><ArrowRight size={17} className="transition group-hover:translate-x-1" /></div></div></Link>)}</div>}
    </section>

    <section className="mt-12 grid gap-5 md:grid-cols-3"><InfoCard title="Recommended for you" text="Personalized discovery will learn from your searches, views, favorites and purchases." /><InfoCard title="Continue browsing" text="Recently opened listings will appear here as your DRIGHT activity grows." /><InfoCard title="New products" text="Newly approved marketplace listings can be surfaced without a separate trending label." /></section>
    <div className="mt-8 flex items-center justify-center gap-2 text-sm text-[var(--muted)]"><ChevronRight size={16} />DRIGHT ranking and recommendation intelligence can evolve behind this interface.</div>
  </div>;
}

function labelFor(value: string | null) { const labels: Record<string, string> = { product: "Products", service: "Services", course: "Courses", job: "Jobs", task: "Tasks", all: "All" }; return labels[value || "all"] || value || "Listing"; }
function InfoCard({ title, text }: { title: string; text: string }) { return <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p></article>; }

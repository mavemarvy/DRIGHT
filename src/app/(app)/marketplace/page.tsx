"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Filter,
  Heart,
  History,
  Search,
  ShoppingBag,
  Sparkles,
  SlidersHorizontal,
  Wrench,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string;
  title: string;
  description: string | null;
  item_type: string | null;
  price: number | null;
  currency_code: string | null;
  status: string | null;
  created_at: string | null;
};

type SortMode = "newest" | "oldest" | "price-low" | "price-high" | "name";

const filters = [
  ["All", "all", Sparkles],
  ["Products", "product", ShoppingBag],
  ["Services", "service", Wrench],
  ["Courses", "course", BookOpen],
  ["Jobs", "job", BriefcaseBusiness],
  ["Tasks", "task", CheckCircle2],
] as const;

const recentSearchKey = "dright:marketplace:recent-searches";

export default function MarketplacePage() {
  const supabase = createClient();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(recentSearchKey) || "[]");
      if (Array.isArray(stored)) setRecentSearches(stored.filter((v): v is string => typeof v === "string").slice(0, 6));
    } catch {
      // Local search history is an enhancement; marketplace data remains authoritative.
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      let request = supabase
        .from("marketplace_items")
        .select("id,title,description,item_type,price,currency_code,status,created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(48);

      if (filter !== "all") request = request.eq("item_type", filter);
      const { data, error: queryError } = await request;
      if (queryError) setError(queryError.message);
      else setItems((data ?? []) as Item[]);
      setLoading(false);
    }
    load();
  }, [filter, supabase]);

  const visible = useMemo(() => {
    const q = submittedQuery.trim().toLowerCase();
    const filtered = q
      ? items.filter((item) => `${item.title} ${item.description ?? ""} ${item.id}`.toLowerCase().includes(q))
      : items;

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title);
      if (sort === "price-low") return (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
      if (sort === "price-high") return (b.price ?? -1) - (a.price ?? -1);
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sort === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [items, submittedQuery, sort]);

  const sections = useMemo(() => {
    if (submittedQuery || filter !== "all") return [];
    return [
      { title: "Recommended for you", eyebrow: "Personalized discovery", data: items.slice(0, 6) },
      { title: "Continue browsing", eyebrow: "Your marketplace journey", data: [] as Item[] },
      { title: "New products", eyebrow: "Recently published", data: items.slice(0, 6) },
    ];
  }, [filter, items, submittedQuery]);

  function submitSearch(value = query) {
    const clean = value.trim();
    setSubmittedQuery(clean);
    if (!clean) return;
    const next = [clean, ...recentSearches.filter((search) => search.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecentSearches(next);
    try {
      window.localStorage.setItem(recentSearchKey, JSON.stringify(next));
    } catch {
      // Ignore storage failures without affecting search.
    }
  }

  function clearSearch() {
    setQuery("");
    setSubmittedQuery("");
  }

  return (
    <div className="dright-page mx-auto max-w-7xl">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
        <div className="relative p-6 sm:p-9 lg:p-11">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">
              <Sparkles size={14} /> DRIGHT Marketplace
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">Discover what moves you forward.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
              Find real products, services, courses, jobs and tasks across the DRIGHT ecosystem.
            </p>
          </div>

          <form
            className="mt-7 flex flex-col gap-2 rounded-[1.25rem] border border-[var(--border)] bg-[var(--background)] p-2 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
              <Search size={20} className="shrink-0 text-[var(--muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                placeholder="Search by name, keyword or listing ID..."
                aria-label="Search marketplace"
              />
              {query && <button type="button" onClick={clearSearch} className="rounded-full p-1 text-[var(--muted)] hover:bg-[var(--surface)]" aria-label="Clear search"><X size={16} /></button>}
            </div>
            <button type="submit" className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--background)] transition hover:opacity-90">Search</button>
          </form>

          {recentSearches.length > 0 && !submittedQuery && (
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
              <History size={15} className="shrink-0 text-[var(--muted)]" />
              {recentSearches.map((search) => (
                <button key={search} onClick={() => { setQuery(search); submitSearch(search); }} className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]">{search}</button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-7 grid gap-7 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)]">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Explore</p>
            <nav className="space-y-1" aria-label="Marketplace categories">
              {filters.map(([label, value, Icon]) => (
                <button key={value} onClick={() => { setFilter(value); setSubmittedQuery(""); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${filter === value ? "bg-[var(--primary)] text-[var(--background)] shadow-sm" : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"}`}>
                  <Icon size={17} />{label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <button onClick={() => setShowMobileFilters((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-medium"><Filter size={16} /> Categories</button>
            <SortControl sort={sort} onChange={setSort} />
          </div>

          {showMobileFilters && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:grid-cols-3">
              {filters.map(([label, value, Icon]) => (
                <button key={value} onClick={() => { setFilter(value); setSubmittedQuery(""); setShowMobileFilters(false); }} className={`flex items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium ${filter === value ? "bg-[var(--primary)] text-[var(--background)]" : "bg-[var(--background)] text-[var(--muted)]"}`}><Icon size={16} />{label}</button>
              ))}
            </div>
          )}

          {sections.length > 0 && !loading && !error && (
            <div className="space-y-10">
              {sections.map((section) => (
                <section key={section.title}>
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">{section.eyebrow}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{section.title}</h2></div>
                    {section.data.length > 0 && <span className="text-xs text-[var(--muted)]">{section.data.length} available</span>}
                  </div>
                  {section.data.length > 0 ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{section.data.map((item) => <ProductCard item={item} key={`${section.title}-${item.id}`} />)}</div> : <EmptySection title="Your browsing history will appear here" text="Open marketplace listings to build a real continue-browsing trail." icon={Clock3} />}
                </section>
              ))}
            </div>
          )}

          <section className={sections.length > 0 && !loading && !error ? "mt-12" : ""}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">{submittedQuery ? "Search results" : "Marketplace"}</p><h2 className="mt-1 text-2xl font-semibold">{submittedQuery ? `Results for “${submittedQuery}”` : filter === "all" ? "Explore all listings" : labelFor(filter)}</h2></div>
              <SortControl sort={sort} onChange={setSort} desktop />
            </div>

            {loading ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[350px] animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />)}</div>
            ) : error ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Could not load marketplace listings: {error}</div>
            ) : visible.length === 0 ? (
              <EmptySection title="Nothing matches yet" text="Try another keyword, listing ID, category or sort order. Only real published DRIGHT listings are shown." icon={Search} />
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <ProductCard item={item} key={item.id} />)}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ item }: { item: Item }) {
  const price = item.price == null ? "Contact seller" : `${item.currency_code || "USD"} ${item.price.toLocaleString()}`;
  return (
    <Link href={`/marketplace/${item.id}`} className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]">
      <div className="relative flex h-40 items-center justify-center bg-[var(--background)] sm:h-44">
        <ShoppingBag size={34} className="text-[var(--muted)] transition duration-200 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] backdrop-blur">{labelFor(item.item_type)}</span>
        <span className="absolute right-3 top-3 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 p-2 text-[var(--muted)] backdrop-blur" aria-label="Save listing"><Heart size={15} /></span>
      </div>
      <div className="p-5">
        <h3 className="line-clamp-2 min-h-12 font-semibold leading-6">{item.title}</h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[var(--muted)]">{item.description || "Explore this DRIGHT listing."}</p>
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-[var(--border)] pt-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Price</p><p className="mt-1 font-semibold">{price}</p></div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] transition group-hover:text-[var(--foreground)]">View <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
        </div>
        <p className="mt-3 truncate font-mono text-[10px] text-[var(--muted)]" title={item.id}>ID: {item.id}</p>
      </div>
    </Link>
  );
}

function SortControl({ sort, onChange, desktop = false }: { sort: SortMode; onChange: (value: SortMode) => void; desktop?: boolean }) {
  return <label className={desktop ? "hidden items-center gap-2 text-xs text-[var(--muted)] sm:flex" : "flex items-center gap-2 text-xs text-[var(--muted)]"}><SlidersHorizontal size={15} /><span className="sr-only">Sort listings</span><select value={sort} onChange={(event) => onChange(event.target.value as SortMode)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-medium text-[var(--foreground)] outline-none"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label>;
}

function EmptySection({ title, text, icon: Icon }: { title: string; text: string; icon: typeof Search }) {
  return <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center"><Icon className="mx-auto text-[var(--muted)]" size={24} /><h3 className="mt-3 font-semibold">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{text}</p></div>;
}

function labelFor(value: string | null) {
  const labels: Record<string, string> = { product: "Products", service: "Services", course: "Courses", job: "Jobs", task: "Tasks", all: "All listings" };
  return labels[value || "all"] || value || "Listing";
}

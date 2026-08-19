"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Heart,
  History,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  Wrench,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Listing = {
  id: string; public_id: string; title: string; description: string | null; item_type: string | null;
  price: number | null; currency_code: string | null; status: string | null; created_at: string | null;
  category_id: string | null; category_name: string | null; store_id: string | null; store_name: string | null;
  store_public_id: string | null; store_verification_badge: boolean; image_url: string | null;
  relevance_score: number; engagement_score: number;
};
type Category = { id: string; name: string; slug: string };

const filters = [
  ["All", "", Sparkles], ["Products", "product", ShoppingBag], ["Services", "service", Wrench],
  ["Courses", "course", BookOpen], ["Jobs", "job", BriefcaseBusiness], ["Tasks", "task", CheckCircle2],
] as const;
const sortOptions = [["relevance", "Relevance"], ["newest", "Newest"], ["popular", "Most viewed"], ["price_low", "Price: low to high"], ["price_high", "Price: high to low"]] as const;

export default function MarketplacePage() {
  const supabase = createClient();
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sort, setSort] = useState("relevance");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [items, setItems] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [recentItems, setRecentItems] = useState<Listing[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Listing[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    const { data } = await supabase.from("search_queries").select("query_text,created_at").order("created_at", { ascending: false }).limit(30);
    setHistory(Array.from(new Set((data ?? []).map((row) => String(row.query_text ?? "").trim()).filter(Boolean))).slice(0, 8));
  };

  const loadRecentAndFavorites = async () => {
    const { data: recent } = await supabase.from("recently_viewed_items").select("item_id,last_viewed_at").order("last_viewed_at", { ascending: false }).limit(8);
    const recentIds = (recent ?? []).map((row) => row.item_id);
    if (recentIds.length) {
      const { data } = await supabase.from("marketplace_items").select("id,public_id,title,description,item_type,price,currency_code,status,created_at,category_id,store_id,metadata").in("id", recentIds).eq("status", "published").eq("visibility", "public");
      const ordered = recentIds.map((id) => (data ?? []).find((row) => row.id === id)).filter(Boolean) as Array<Record<string, unknown>>;
      setRecentItems(ordered.map(toListing));
    } else setRecentItems([]);
    const { data: favorites } = await supabase.from("marketplace_item_favorites").select("item_id");
    setFavoriteIds(new Set((favorites ?? []).map((row) => row.item_id)));
  };

  const loadCategories = async () => {
    const { data } = await supabase.from("marketplace_categories").select("id,name,slug").eq("is_active", true).order("name");
    setCategories((data ?? []) as Category[]);
  };

  const loadListings = async () => {
    setLoading(true); setError("");
    const { data, error: rpcError } = await supabase.rpc("search_marketplace_items", {
      search_text: submittedQuery, item_type_filter: filter || null, category_filter: category || null,
      min_price_filter: minPrice ? Number(minPrice) : null, max_price_filter: maxPrice ? Number(maxPrice) : null,
      sort_key: sort, page_size: 36, page_offset: 0,
    });
    if (rpcError) { setError(rpcError.message); setItems([]); } else setItems((data ?? []) as Listing[]);
    setLoading(false);
  };

  useEffect(() => { void loadCategories(); void loadHistory(); void loadRecentAndFavorites(); }, []);
  useEffect(() => { void loadListings(); }, [submittedQuery, filter, category, minPrice, maxPrice, sort]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) { setSuggestions([]); setSuggesting(false); return; }
    const timer = window.setTimeout(async () => {
      setSuggesting(true);
      const { data } = await supabase.rpc("search_marketplace_items", {
        search_text: text, item_type_filter: filter || null, category_filter: null,
        min_price_filter: null, max_price_filter: null, sort_key: "relevance", page_size: 6, page_offset: 0,
      });
      setSuggestions((data ?? []) as Listing[]); setSuggesting(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, filter]);

  const visibleLabel = useMemo(() => submittedQuery ? `Results for “${submittedQuery}”` : filter ? filters.find((entry) => entry[1] === filter)?.[0] ?? "Discovery" : "Marketplace discovery", [filter, submittedQuery]);

  const submitSearch = async (value = query) => {
    const text = value.trim(); setQuery(text); setSubmittedQuery(text); setShowSuggestions(false);
    if (!text) return;
    await supabase.from("search_queries").insert({ query_text: text, normalized_query: text.toLowerCase().replace(/\s+/g, " "), result_count: items.length, filters: { item_type: filter || null, category: category || null, sort, min_price: minPrice || null, max_price: maxPrice || null } });
    void loadHistory();
  };

  const clearHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("search_queries").delete().eq("user_id", user.id);
    setHistory([]);
  };

  const toggleFavorite = async (itemId: string) => {
    if (favoriteIds.has(itemId)) {
      const { error: deleteError } = await supabase.from("marketplace_item_favorites").delete().eq("item_id", itemId);
      if (deleteError) return;
      setFavoriteIds((current) => { const next = new Set(current); next.delete(itemId); return next; });
    } else {
      const { error: insertError } = await supabase.from("marketplace_item_favorites").insert({ item_id: itemId });
      if (insertError) return;
      setFavoriteIds((current) => new Set(current).add(itemId));
    }
  };

  const clearFilters = () => { setFilter(""); setCategory(""); setMinPrice(""); setMaxPrice(""); setSort("relevance"); };

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9">
        <p className="text-sm font-semibold text-[var(--muted)]">DRIGHT Marketplace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Find products, services, courses and opportunities.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">Search by name, Listing ID, seller/store, category, keyword or price. Hidden, rejected, suspended and private listings stay out of discovery.</p>
        <div className="relative mt-7">
          <form onSubmit={(event) => { event.preventDefault(); void submitSearch(); }} className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
            <Search size={19} className="shrink-0 text-[var(--muted)]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setShowSuggestions(true)} className="w-full bg-transparent text-sm outline-none" placeholder="Search products, services, jobs, courses, sellers or Listing ID…" aria-label="Search DRIGHT marketplace" />
            {query && <button type="button" onClick={() => { setQuery(""); setSubmittedQuery(""); }} className="rounded-lg p-1 text-[var(--muted)]" aria-label="Clear search"><X size={17} /></button>}
            <button type="submit" className="hidden shrink-0 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-contrast)] sm:block">Search</button>
          </form>
          {showSuggestions && (query.trim().length >= 2 || history.length > 0) && <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-xl">
            {query.trim().length < 2 && history.length > 0 && <div className="p-3"><div className="flex items-center justify-between px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]"><span className="inline-flex items-center gap-2"><History size={13} /> Recent searches</span><button type="button" onClick={() => void clearHistory()} className="normal-case tracking-normal hover:text-[var(--foreground)]">Clear</button></div><div className="grid gap-1">{history.map((term) => <button key={term} type="button" onClick={() => void submitSearch(term)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[var(--background)]"><History size={15} className="text-[var(--muted)]" />{term}</button>)}</div></div>}
            {query.trim().length >= 2 && <div className="p-3"><div className="px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Search suggestions</div>{suggesting ? <p className="px-3 py-3 text-sm text-[var(--muted)]">Searching…</p> : suggestions.length ? <div className="grid gap-1">{suggestions.map((item) => <button key={item.id} type="button" onClick={() => void submitSearch(item.title)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--background)]"><Search size={15} className="text-[var(--muted)]" /><span className="min-w-0 flex-1 truncate text-sm">{item.title}</span><span className="text-[10px] font-mono text-[var(--muted)]">{item.public_id}</span></button>)}</div> : <p className="px-3 py-3 text-sm text-[var(--muted)]">No direct suggestions yet. Press Search to broaden the query.</p>}</div>}
          </div>}
        </div>
      </section>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:hidden">
        {filters.map(([label, value, Icon]) => <button key={value || "all"} type="button" onClick={() => setFilter(value)} className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium ${filter === value ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-contrast)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"}`}><Icon size={16} />{label}</button>)}
        <button type="button" onClick={() => setFiltersOpen((open) => !open)} className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium"><SlidersHorizontal size={16} />Filters</button>
      </div>

      <div className="mt-2 grid gap-7 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className={`${filtersOpen ? "block" : "hidden"} lg:block`}><div className="sticky top-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Browse</p>
          {filters.map(([label, value, Icon]) => <button key={value || "all"} type="button" onClick={() => setFilter(value)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${filter === value ? "bg-[var(--primary)] text-[var(--primary-contrast)]" : "text-[var(--muted)] hover:bg-[var(--background)]"}`}><Icon size={17} />{label}</button>)}
          <div className="my-3 border-t border-[var(--border)]" />
          <label className="block px-3 text-xs font-semibold text-[var(--muted)]">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none"><option value="">All categories</option>{categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          <div className="mt-4 px-3"><p className="text-xs font-semibold text-[var(--muted)]">Price range</p><div className="mt-2 grid grid-cols-2 gap-2"><input inputMode="decimal" value={minPrice} onChange={(event) => setMinPrice(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="Min" className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none" /><input inputMode="decimal" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="Max" className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none" /></div></div>
          <button type="button" onClick={clearFilters} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--background)]"><X size={14} />Clear filters</button>
        </div></aside>

        <section className="min-w-0" onClick={() => showSuggestions && setShowSuggestions(false)}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Discovery</p><h2 className="mt-1 text-2xl font-semibold">{visibleLabel}</h2><p className="mt-1 text-sm text-[var(--muted)]">{items.length} discoverable listings shown</p></div><label className="flex items-center gap-2 text-sm text-[var(--muted)]"><span className="hidden sm:inline">Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none">{sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
          {error && <div className="mt-5 rounded-2xl border border-red-300/60 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">Could not load marketplace discovery: {error}</div>}
          {loading ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />)}</div> : items.length === 0 ? <EmptySearch query={submittedQuery} onClear={() => { setQuery(""); setSubmittedQuery(""); clearFilters(); }} /> : <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <ListingCard key={item.id} item={item} favorite={favoriteIds.has(item.id)} onFavorite={() => void toggleFavorite(item.id)} />)}</div>}
          {recentItems.length > 0 && !submittedQuery && !filter && <section className="mt-12"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Continue browsing</p><h3 className="mt-1 text-xl font-semibold">Recently viewed</h3></div><Clock3 size={19} className="text-[var(--muted)]" /></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{recentItems.map((item) => <CompactCard key={item.id} item={item} />)}</div></section>}
          <section className="mt-12 grid gap-5 md:grid-cols-3"><InfoCard icon={Search} title="Smart search foundation" text="Exact IDs, titles, keywords, seller/store names and full-text relevance use the shared Supabase search function." /><InfoCard icon={History} title="Private search history" text="Recent searches reuse the existing search_queries architecture and remain protected by RLS." /><InfoCard icon={Heart} title="Persistent favorites" text="Favorites are stored per user and ready for the later recommendation layer without a second wishlist system." /></section>
        </section>
      </div>
    </main>
  );
}

function toListing(row: Record<string, unknown>): Listing {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
  return { id: String(row.id), public_id: String(row.public_id ?? row.id), title: String(row.title ?? "Untitled listing"), description: row.description ? String(row.description) : null, item_type: row.item_type ? String(row.item_type) : null, price: row.price == null ? null : Number(row.price), currency_code: row.currency_code ? String(row.currency_code).trim() : null, status: row.status ? String(row.status) : null, created_at: row.created_at ? String(row.created_at) : null, category_id: row.category_id ? String(row.category_id) : null, category_name: null, store_id: row.store_id ? String(row.store_id) : null, store_name: null, store_public_id: null, store_verification_badge: false, image_url: typeof metadata.image_url === "string" ? metadata.image_url : null, relevance_score: 0, engagement_score: 0 };
}

function ListingCard({ item, favorite, onFavorite }: { item: Listing; favorite: boolean; onFavorite: () => void }) {
  const price = item.price == null ? "Contact seller" : `${item.currency_code || "USD"} ${Number(item.price).toLocaleString()}`;
  return <article className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:shadow-lg"><Link href={`/marketplace/${item.id}`} className="block"><div className="relative flex h-44 items-center justify-center overflow-hidden bg-[var(--background)]">{item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <ShoppingBag size={32} className="text-[var(--muted)]" />}<span className="absolute left-3 top-3 rounded-full bg-[var(--surface-strong)]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">{labelFor(item.item_type)}</span></div><div className="p-5"><h3 className="line-clamp-2 font-semibold">{item.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--muted)]">{item.description || "Explore this DRIGHT listing."}</p><div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">{item.store_name ? <><Store size={13} />{item.store_name}{item.store_verification_badge && <CheckCircle2 size={13} className="text-[var(--focus)]" />}</> : <span>DRIGHT Marketplace</span>}</div><div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4"><span className="font-semibold">{price}</span><span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">View <ArrowRight size={14} /></span></div><p className="mt-3 truncate font-mono text-[10px] text-[var(--muted)]">ID: {item.public_id}</p></div></Link><div className="border-t border-[var(--border)] px-5 py-3"><button type="button" onClick={(event) => { event.preventDefault(); onFavorite(); }} className={`inline-flex items-center gap-2 text-xs font-semibold ${favorite ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`} aria-pressed={favorite}><Heart size={15} fill={favorite ? "currentColor" : "none"} />{favorite ? "Saved" : "Save"}</button></div></article>;
}
function CompactCard({ item }: { item: Listing }) { return <Link href={`/marketplace/${item.id}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:bg-[var(--background)]"><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--background)]"><ShoppingBag size={18} className="text-[var(--muted)]" /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-1 block truncate font-mono text-[10px] text-[var(--muted)]">{item.public_id}</span></span></div></Link>; }
function EmptySearch({ query, onClear }: { query: string; onClear: () => void }) { return <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center"><Search className="mx-auto" size={26} /><h3 className="mt-4 font-semibold">{query ? `No results for “${query}”` : "No discoverable listings yet"}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">Try a broader keyword, a Listing ID, another category, or clear the active filters.</p>{query && <button type="button" onClick={onClear} className="mt-5 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-contrast)]">Clear search and filters</button>}</div>; }
function InfoCard({ icon: Icon, title, text }: { icon: typeof Search; title: string; text: string }) { return <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><Icon size={18} className="text-[var(--muted)]" /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p></article>; }
function labelFor(value: string | null) { const labels: Record<string, string> = { product: "Products", physical_product: "Physical", digital_product: "Digital", service: "Services", course: "Courses", job: "Jobs", task: "Tasks", event: "Events", subscription: "Subscriptions", membership: "Membership" }; return labels[value || ""] || value || "Listing"; }

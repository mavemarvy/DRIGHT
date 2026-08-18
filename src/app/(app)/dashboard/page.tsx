"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, BookOpen, ChevronRight, CircleDollarSign, Database, FileCheck2, LayoutDashboard, MessageSquare, Search, ShieldCheck, ShoppingBag, Store, Users, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TableKey = { label: string; table: string; icon: typeof Database; description: string };
const groups: { title: string; items: TableKey[] }[] = [
  { title: "Commerce", items: [
    { label: "Marketplace", table: "marketplace_items", icon: ShoppingBag, description: "Listings and marketplace inventory" },
    { label: "Stores", table: "stores", icon: Store, description: "Vendor/store records" },
    { label: "Orders", table: "orders", icon: CircleDollarSign, description: "Buyer orders" },
    { label: "Transactions", table: "transactions", icon: Wallet, description: "Commerce transactions" },
    { label: "Payouts", table: "payouts", icon: Wallet, description: "Seller/affiliate payouts" },
  ]},
  { title: "Growth", items: [
    { label: "Affiliates", table: "affiliate_profiles", icon: Users, description: "Affiliate profiles" },
    { label: "Commissions", table: "commissions", icon: BarChart3, description: "Commission ledger" },
    { label: "Search", table: "search_queries", icon: Search, description: "Search activity" },
    { label: "Recommendations", table: "recommendation_candidates", icon: Activity, description: "Recommendation candidates" },
  ]},
  { title: "Community & Learning", items: [
    { label: "Posts", table: "posts", icon: MessageSquare, description: "Community posts" },
    { label: "Communities", table: "communities", icon: Users, description: "Community spaces" },
    { label: "Learning", table: "learning_pages", icon: BookOpen, description: "Learning content" },
    { label: "Tasks", table: "tasks", icon: FileCheck2, description: "Tasks and challenges" },
  ]},
  { title: "Identity & Operations", items: [
    { label: "Profiles", table: "profiles", icon: Users, description: "User profiles" },
    { label: "Roles", table: "user_roles", icon: ShieldCheck, description: "User role assignments" },
    { label: "Verification", table: "verification_submissions", icon: FileCheck2, description: "Verification submissions" },
    { label: "Notifications", table: "notifications", icon: Activity, description: "User notifications" },
    { label: "Messages", table: "messages", icon: MessageSquare, description: "Messaging records" },
  ]},
];

async function countTable(table: string) {
  const supabase = createClient();
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TableKey | null>(null);
  const items = useMemo(() => groups.flatMap((group) => group.items), []);

  async function refresh() {
    setLoading(true);
    const results = await Promise.all(items.map(async (item) => [item.table, await countTable(item.table)] as const));
    const nextCounts: Record<string, number | null> = {};
    const nextErrors: Record<string, string> = {};
    for (const [table, result] of results) { nextCounts[table] = result.count; if (result.error) nextErrors[table] = result.error; }
    setCounts(nextCounts); setErrors(nextErrors); setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--background)]"><LayoutDashboard size={19} /></div><div><p className="text-xs font-medium text-[var(--muted)]">DRIGHT</p><h1 className="text-xl font-semibold">Platform Test Dashboard</h1></div></div>
          <button onClick={refresh} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface)]">{loading ? "Checking…" : "Refresh"}</button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8">
        <section className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-start gap-4"><div className="mt-1 rounded-xl bg-[var(--background)] p-3"><Database size={20} /></div><div><h2 className="text-lg font-semibold">Supabase feature smoke tests</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">This dashboard checks the current live schema through the authenticated Supabase client. Each card tests read access under the existing RLS policies.</p></div></div></section>
        {groups.map((group) => <section key={group.title} className="mb-9"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">{group.title}</h2><span className="text-xs text-[var(--muted)]">{group.items.length} tests</span></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{group.items.map((item) => { const Icon = item.icon; const error = errors[item.table]; const value = counts[item.table]; return <button key={item.table} onClick={() => setSelected(item)} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className="rounded-xl bg-[var(--background)] p-2.5"><Icon size={19} /></span><ChevronRight size={18} className="text-[var(--muted)] transition group-hover:translate-x-1" /></div><div className="mt-5"><h3 className="font-semibold">{item.label}</h3><p className="mt-1 text-sm text-[var(--muted)]">{item.description}</p></div><div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4"><span className="text-xs font-mono text-[var(--muted)]">{item.table}</span><span className={`text-sm font-semibold ${error ? "text-red-600" : ""}`}>{loading ? "…" : error ? "RLS/error" : `${value ?? 0} rows`}</span></div></button>; })}</div></section>)}
      </div>
      {selected && <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center" onClick={() => setSelected(null)}><section className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-[var(--muted)]">Smoke test</p><h2 className="mt-1 text-xl font-semibold">{selected.label}</h2></div><button onClick={() => setSelected(null)} className="rounded-lg px-3 py-1 text-sm text-[var(--muted)]">Close</button></div><div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"><p className="text-xs text-[var(--muted)]">Table</p><p className="mt-1 font-mono text-sm">{selected.table}</p><p className="mt-4 text-xs text-[var(--muted)]">Read status</p><p className={`mt-1 font-semibold ${errors[selected.table] ? "text-red-600" : ""}`}>{errors[selected.table] ?? `Accessible — ${counts[selected.table] ?? 0} visible rows`}</p></div><p className="mt-5 text-sm leading-6 text-[var(--muted)]">The test uses the normal browser Supabase client. It never bypasses RLS or uses a service-role credential.</p></section></div>}
    </main>
  );
}

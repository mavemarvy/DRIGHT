"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Compass, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Community = { id: string; public_id: string; name: string; slug: string; description: string | null; access_type: string; created_at: string };

export default function CommunitiesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { let cancelled = false; async function load() {
    const [{ data }, { data: { user } }] = await Promise.all([
      supabase.from("communities").select("id,public_id,name,slug,description,access_type,created_at").eq("status", "published").eq("visibility", "public").order("created_at", { ascending: false }).limit(40),
      supabase.auth.getUser(),
    ]);
    if (user) { const { data: memberships } = await supabase.from("community_members").select("community_id").eq("user_id", user.id).eq("status", "active"); if (!cancelled) setJoined(new Set((memberships || []).map((m: { community_id: string }) => m.community_id))); }
    if (!cancelled) { setCommunities((data || []) as Community[]); setLoading(false); }
  } void load(); return () => { cancelled = true; }; }, [supabase]);

  async function toggleJoin(community: Community) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `/login?next=/communities`; return; }
    setBusy(community.id);
    if (joined.has(community.id)) await supabase.from("community_members").update({ status: "left" }).eq("community_id", community.id).eq("user_id", user.id);
    else await supabase.from("community_members").upsert({ community_id: community.id, user_id: user.id, role: "member", status: "active" });
    setJoined(prev => { const next = new Set(prev); joined.has(community.id) ? next.delete(community.id) : next.add(community.id); return next; }); setBusy(null);
  }

  const filtered = communities.filter(c => !query.trim() || `${c.name} ${c.description || ""} ${c.slug}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">DRIGHT Social</p><h1 className="mt-2 text-3xl font-bold">Communities</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Find public communities around products, services, courses, jobs, creators and shared interests.</p></div><button type="button" disabled className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold opacity-60"><Plus size={16}/> Create community</button></div><div className="mt-5"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search communities…" className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"/></div></section>
    <section className="mt-7">{loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-[var(--surface)]"/>)}</div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center"><Compass className="mx-auto text-[var(--muted)]"/><h2 className="mt-4 font-semibold">No public communities found</h2><p className="mt-2 text-sm text-[var(--muted)]">Try a different search. DRIGHT does not fabricate communities.</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(c => <article key={c.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{c.name}</h2><p className="mt-1 text-xs text-[var(--muted)]">{c.public_id}</p></div><span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold capitalize">{c.access_type.replaceAll("_", " ")}</span></div><p className="mt-4 min-h-10 text-sm leading-5 text-[var(--muted)]">{c.description || "A public DRIGHT community."}</p><div className="mt-5 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]"><Users size={14}/> Community</span><button onClick={() => void toggleJoin(c)} disabled={busy === c.id} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-contrast)]">{joined.has(c.id) ? "Joined" : "Join"}</button></div></article>)}</div>}</section>
    <p className="mt-6 text-xs text-[var(--muted)]">Community creation remains governed by DRIGHT&apos;s existing feature/RBAC controls; this prompt adds the discovery foundation without creating a parallel social system.</p>
  </main>;
}

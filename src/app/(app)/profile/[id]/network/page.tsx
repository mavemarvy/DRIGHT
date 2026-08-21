"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, UserPlus, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Person = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; profession: string | null };

type Props = { params: Promise<{ id: string }> };

export default function ProfileNetworkPage({ params }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "following" ? "following" : "followers";
  const [tab, setTab] = useState<"followers" | "following">(initialTab);
  const [targetId, setTargetId] = useState("");
  const [targetName, setTargetName] = useState("Profile");
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { id } = await params;
      if (!active) return;
      setTargetId(id);
      setLoading(true);
      setError("");

      const [{ data: profile, error: profileError }, { data: follows, error: followsError }] = await Promise.all([
        supabase.from("user_profiles").select("id,username,display_name").eq("id", id).maybeSingle(),
        tab === "followers"
          ? supabase.from("follows").select("follower_user_id").eq("following_user_id", id).eq("status", "active")
          : supabase.from("follows").select("following_user_id").eq("follower_user_id", id).eq("status", "active"),
      ]);

      if (profileError || followsError) {
        if (active) { setError(profileError?.message || followsError?.message || "Unable to load this network."); setLoading(false); }
        return;
      }
      if (!active) return;
      setTargetName(profile?.display_name || profile?.username || "Profile");

      const ids = (follows || []).map((row: { follower_user_id?: string; following_user_id?: string }) => tab === "followers" ? row.follower_user_id : row.following_user_id).filter((id): id is string => Boolean(id));
      if (!ids.length) { setPeople([]); setLoading(false); return; }

      const { data: profiles, error: peopleError } = await supabase.from("user_profiles").select("id,username,display_name,avatar_url,profession").in("id", ids);
      if (active) {
        if (peopleError) setError(peopleError.message); else setPeople((profiles || []) as Person[]);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [params, supabase, tab]);

  const filtered = people.filter((person) => `${person.display_name || ""} ${person.username || ""} ${person.profession || ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <main className="mx-auto max-w-4xl px-4 py-7 sm:px-6 lg:px-8">
      <Link href={`/profile/${targetId}`} className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Back to profile</Link>
      <header className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Social network</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{targetName}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Explore this profile&apos;s public follower relationships. Private relationships remain protected by DRIGHT access policies.</p>
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-1">
          <button onClick={() => setTab("followers")} className={`rounded-xl px-4 py-3 text-sm font-semibold ${tab === "followers" ? "bg-[var(--surface)] shadow-sm" : "text-[var(--muted)]"}`}>Followers</button>
          <button onClick={() => setTab("following")} className={`rounded-xl px-4 py-3 text-sm font-semibold ${tab === "following" ? "bg-[var(--surface)] shadow-sm" : "text-[var(--muted)]"}`}>Following</button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2"><Search size={16} className="text-[var(--muted)]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab}…`} className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></div>
      </header>

      {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">{error}</div>}
      <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {loading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-[var(--background)]" />)}</div> : filtered.length ? <div className="divide-y divide-[var(--border)]">{filtered.map((person) => { const name = person.display_name || person.username || "DRIGHT user"; return <Link key={person.id} href={`/profile/${person.id}`} className="flex items-center gap-3 p-4 transition hover:bg-[var(--background)]"><span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--background)] font-bold">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover"/> : name.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{name}</span><span className="block truncate text-xs text-[var(--muted)]">{person.username ? `@${person.username}` : person.profession || "DRIGHT user"}</span></span><UserPlus size={17} className="text-[var(--muted)]"/></Link>; })}</div> : <div className="p-12 text-center"><Users size={30} className="mx-auto text-[var(--muted)]"/><h2 className="mt-4 font-semibold">No public {tab} found</h2><p className="mt-1 text-sm text-[var(--muted)]">There is nothing matching this list or search yet.</p></div>}
      </section>
    </main>
  );
}

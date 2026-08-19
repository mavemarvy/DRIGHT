"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, MapPin, ShieldCheck, UserPlus, UserRoundMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = { user_id: string; username: string | null; full_name: string | null; avatar_url: string | null; bio: string | null; country_code: string | null; profile_status: string; full_name_visibility: "PUBLIC" | "PRIVATE" };
type Listing = { id: string; public_id: string | null; title: string; price: number | null; currency_code: string | null; image_url: string | null; item_type: string | null };

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [followingUser, setFollowingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: target, error: profileError } = await supabase.from("user_profiles").select("user_id,username,full_name,avatar_url,bio,country_code,profile_status,full_name_visibility").eq("user_id", params.id).maybeSingle();
      if (profileError || !target) { if (!cancelled) { setError(profileError?.message || "This profile is unavailable or private."); setLoading(false); } return; }
      if (cancelled) return;
      setProfile(target as Profile);
      const [{ count: followerCount }, { count: followingCount }, { data: owned }] = await Promise.all([
        supabase.from("follows").select("follower_user_id", { count: "exact", head: true }).eq("following_user_id", params.id).eq("status", "active"),
        supabase.from("follows").select("following_user_id", { count: "exact", head: true }).eq("follower_user_id", params.id).eq("status", "active"),
        supabase.from("marketplace_items").select("id,public_id,title,price,currency_code,image_url,item_type").eq("owner_user_id", params.id).eq("status", "published").eq("visibility", "public").order("created_at", { ascending: false }).limit(12),
      ]);
      setFollowers(followerCount || 0); setFollowing(followingCount || 0); setListings((owned || []) as Listing[]);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id !== params.id) {
        const { data: followRow } = await supabase.from("follows").select("follower_user_id").eq("follower_user_id", user.id).eq("following_user_id", params.id).eq("status", "active").maybeSingle();
        setFollowingUser(Boolean(followRow));
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [params.id, supabase]);

  async function toggleFollow() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `/login?next=/profile/${params.id}`; return; }
    if (user.id === params.id) return;
    setBusy(true);
    const result = followingUser
      ? await supabase.from("follows").delete().eq("follower_user_id", user.id).eq("following_user_id", params.id)
      : await supabase.from("follows").insert({ follower_user_id: user.id, following_user_id: params.id, status: "active" });
    if (!result.error) { setFollowingUser(!followingUser); setFollowers(value => Math.max(0, value + (followingUser ? -1 : 1))); }
    setBusy(false);
  }

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-8"><div className="h-72 animate-pulse rounded-3xl bg-[var(--surface)]" /></main>;
  if (error || !profile) return <main className="mx-auto max-w-5xl px-4 py-8"><Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Marketplace</Link><div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] p-12 text-center"><h1 className="font-semibold">Profile unavailable</h1><p className="mt-2 text-sm text-[var(--muted)]">{error}</p></div></main>;
  if (profile.profile_status !== "active") return <main className="mx-auto max-w-5xl px-4 py-8"><div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center"><h1 className="font-semibold">Profile unavailable</h1><p className="mt-2 text-sm text-[var(--muted)]">This account is not currently discoverable.</p></div></main>;

  const name = profile.full_name_visibility === "PUBLIC" && profile.full_name ? profile.full_name : profile.username || "DRIGHT user";
  return <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
    <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Marketplace</Link>
    <section className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4"><div className="h-24 w-24 overflow-hidden rounded-full bg-[var(--background)]">{profile.avatar_url ? <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-3xl font-bold">{name.slice(0,1).toUpperCase()}</div>}</div><div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold">{name}</h1><ShieldCheck size={17}/></div><p className="text-sm text-[var(--muted)]">@{profile.username || "user"}</p>{profile.bio && <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">{profile.bio}</p>}</div></div>
        <button onClick={toggleFollow} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)]">{followingUser ? <><UserRoundMinus size={16}/> Following</> : <><UserPlus size={16}/> Follow</>}</button>
      </div>
      <div className="mt-6 flex flex-wrap gap-5 text-sm"><span><strong>{followers}</strong> followers</span><span><strong>{following}</strong> following</span><span><strong>{listings.length}</strong> public listings</span></div>
      <div className="mt-5 flex flex-wrap gap-3 text-xs text-[var(--muted)]">{profile.country_code && <span className="inline-flex items-center gap-1"><MapPin size={14}/> {profile.country_code}</span>}<span className="inline-flex items-center gap-1"><ShieldCheck size={14}/> Privacy-aware profile</span></div>
    </section>
    <section className="mt-8"><h2 className="text-xl font-bold">Marketplace listings</h2>{listings.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">No public listings yet.</div> : <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listings.map(item => <Link key={item.id} href={`/marketplace/${item.id}`} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:shadow-lg"><div className="aspect-[4/3] bg-[var(--background)]">{item.image_url && <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" loading="lazy"/>}</div><div className="p-4"><h3 className="line-clamp-2 font-semibold">{item.title}</h3><p className="mt-2 text-xs text-[var(--muted)]">{item.public_id || item.id}</p><p className="mt-3 font-bold">{item.price == null ? "Contact seller" : `${item.currency_code || "USD"} ${Number(item.price).toLocaleString()}`}</p></div></Link>)}</div>}</section>
    <p className="mt-6 text-xs text-[var(--muted)]">Public profile fields are limited to the existing identity/privacy architecture. Private email, phone, financial, KYC and activity data are never rendered here.</p>
  </main>;
}

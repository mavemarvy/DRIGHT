"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, Heart, MapPin, ShieldCheck, UserPlus, UserRoundMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; username: string | null; display_name: string | null; bio: string | null; avatar_url: string | null; cover_url: string | null; profession: string | null; country: string | null; website: string | null; skills: string[] | null; languages: string[] | null; profile_visibility: string | null; created_at: string };
type Listing = { id: string; public_id: string | null; title: string; price: number | null; currency_code: string | null; image_url: string | null; item_type: string | null };

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [liked, setLiked] = useState(false);
  const [followingUser, setFollowingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      const { data: target, error: profileError } = await supabase.from("user_profiles").select("id,username,display_name,bio,avatar_url,cover_url,profession,country,website,skills,languages,profile_visibility,created_at").eq("id", params.id).maybeSingle();
      if (profileError || !target) { if (!cancelled) { setError(profileError?.message || "This profile is unavailable."); setLoading(false); } return; }
      if (cancelled) return;
      setProfile(target as Profile);
      const [{ count: followerCount }, { count: followingCount }, { data: owned }] = await Promise.all([
        supabase.from("follows").select("follower_user_id", { count: "exact", head: true }).eq("following_user_id", params.id),
        supabase.from("follows").select("following_user_id", { count: "exact", head: true }).eq("follower_user_id", params.id),
        supabase.from("marketplace_items").select("id,public_id,title,price,currency_code,image_url,item_type").eq("owner_user_id", params.id).eq("status", "published").order("created_at", { ascending: false }).limit(12),
      ]);
      setFollowers(followerCount || 0); setFollowing(followingCount || 0); setListings((owned || []) as Listing[]);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id !== params.id) {
        const [{ data: followRow }, { data: likeRow }] = await Promise.all([
          supabase.from("follows").select("follower_user_id").eq("follower_user_id", user.id).eq("following_user_id", params.id).maybeSingle(),
          supabase.from("profile_likes").select("id").eq("liker_user_id", user.id).eq("liked_user_id", params.id).maybeSingle(),
        ]);
        setFollowingUser(Boolean(followRow)); setLiked(Boolean(likeRow));
      }
      if (!cancelled) setLoading(false);
    }
    void load(); return () => { cancelled = true; };
  }, [params.id, supabase]);

  async function toggleFollow() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `/login?next=/profile/${params.id}`; return; }
    if (user.id === params.id) return;
    setBusy(true);
    const result = followingUser ? await supabase.from("follows").delete().eq("follower_user_id", user.id).eq("following_user_id", params.id) : await supabase.from("follows").insert({ follower_user_id: user.id, following_user_id: params.id });
    if (!result.error) { setFollowingUser(!followingUser); setFollowers(value => Math.max(0, value + (followingUser ? -1 : 1))); }
    setBusy(false);
  }

  async function toggleLike() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `/login?next=/profile/${params.id}`; return; }
    if (user.id === params.id) return;
    setBusy(true);
    const result = liked ? await supabase.from("profile_likes").delete().eq("liker_user_id", user.id).eq("liked_user_id", params.id) : await supabase.from("profile_likes").insert({ liker_user_id: user.id, liked_user_id: params.id });
    if (!result.error) setLiked(!liked);
    setBusy(false);
  }

  if (loading) return <main className="mx-auto max-w-5xl px-4 py-8"><div className="h-72 animate-pulse rounded-3xl bg-[var(--surface)]" /></main>;
  if (error || !profile) return <main className="mx-auto max-w-5xl px-4 py-8"><Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Marketplace</Link><div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] p-12 text-center"><h1 className="font-semibold">Profile unavailable</h1><p className="mt-2 text-sm text-[var(--muted)]">{error || "This profile is not discoverable."}</p></div></main>;

  const name = profile.display_name || profile.username || "DRIGHT user";
  return <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
    <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Marketplace</Link>
    <section className="mt-5 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="h-40 bg-[var(--background)] sm:h-56">{profile.cover_url && <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />}</div>
      <div className="px-5 pb-6 sm:px-8">
        <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4"><div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[var(--surface)] bg-[var(--background)] sm:h-32 sm:w-32">{profile.avatar_url ? <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl font-bold">{name.slice(0,1).toUpperCase()}</div>}</div><div className="pb-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{name}</h1><ShieldCheck size={18} /></div>{profile.username && <p className="text-sm text-[var(--muted)]">@{profile.username}</p>}{profile.profession && <p className="mt-1 text-sm font-medium">{profile.profession}</p>}</div></div>
          <div className="flex gap-2"><button onClick={toggleLike} disabled={busy} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${liked ? "bg-[var(--primary)] text-[var(--primary-contrast)]" : "border-[var(--border)]"}`}><Heart size={16} fill={liked ? "currentColor" : "none"}/> Like</button><button onClick={toggleFollow} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)]">{followingUser ? <><UserRoundMinus size={16}/> Following</> : <><UserPlus size={16}/> Follow</>}</button></div>
        </div>
        {profile.bio && <p className="mt-5 max-w-3xl text-sm leading-6 text-[var(--muted)]">{profile.bio}</p>}
        <div className="mt-5 flex flex-wrap gap-5 text-sm"><span><strong>{followers}</strong> followers</span><span><strong>{following}</strong> following</span><span><strong>{listings.length}</strong> listings</span></div>
        <div className="mt-5 flex flex-wrap gap-3 text-xs text-[var(--muted)]">{profile.country && <span className="inline-flex items-center gap-1"><MapPin size={14}/> {profile.country}</span>}{profile.website && <a href={profile.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline"><ExternalLink size={14}/> Website</a>}{profile.skills?.map(skill => <span key={skill} className="rounded-full border border-[var(--border)] px-3 py-1.5">{skill}</span>)}</div>
      </div>
    </section>
    <section className="mt-8"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Marketplace listings</h2><p className="mt-1 text-sm text-[var(--muted)]">Published listings from this profile.</p></div></div>{listings.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">No public listings yet.</div> : <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listings.map(item => <Link key={item.id} href={`/marketplace/${item.id}`} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:shadow-lg"><div className="aspect-[4/3] bg-[var(--background)]">{item.image_url && <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" loading="lazy"/>}</div><div className="p-4"><h3 className="font-semibold line-clamp-2">{item.title}</h3><p className="mt-2 text-xs text-[var(--muted)]">{item.public_id || item.id}</p><p className="mt-3 font-bold">{item.price == null ? "Contact seller" : `${item.currency_code || "USD"} ${Number(item.price).toLocaleString()}`}</p></div></Link>)}</div>}</section>
    <p className="mt-8 inline-flex items-center gap-2 text-xs text-[var(--muted)]"><CheckCircle2 size={14}/> Profile privacy and discoverability are enforced by the existing Supabase policies.</p>
  </main>;
}

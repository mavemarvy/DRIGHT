"use client";

import { useState } from "react";
import { Heart, MessageCircle, Share2, Flag, UserPlus, UserCheck } from "lucide-react";

type Props = { listingId: string; sellerName?: string; sellerId?: string; initiallySaved?: boolean; initiallyFollowing?: boolean };

export default function ListingActions({ listingId, sellerName = "Seller", sellerId, initiallySaved = false, initiallyFollowing = false }: Props) {
  const [saved, setSaved] = useState(initiallySaved);
  const [following, setFollowing] = useState(initiallyFollowing);
  const [shared, setShared] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: `DRIGHT — ${sellerName}`, url }).catch(() => undefined);
    else { await navigator.clipboard?.writeText(url); setShared(true); window.setTimeout(() => setShared(false), 1500); }
  }

  return <div className="grid grid-cols-2 gap-3">
    <button onClick={() => setSaved(!saved)} aria-pressed={saved} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium ${saved ? "border-[var(--primary)] bg-[var(--background)]" : "border-[var(--border)]"}`}><Heart size={16} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save"}</button>
    <button onClick={share} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-medium"><Share2 size={16} /> {shared ? "Copied" : "Share"}</button>
    <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-medium"><MessageCircle size={16} /> Contact</button>
    <button onClick={() => setFollowing(!following)} disabled={!sellerId} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">{following ? <UserCheck size={16} /> : <UserPlus size={16} />} {following ? "Following" : "Follow"}</button>
    <button className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-3 text-sm text-[var(--muted)]"><Flag size={15} /> Report listing</button>
    <span className="col-span-2 hidden" data-listing-id={listingId} />
  </div>;
}

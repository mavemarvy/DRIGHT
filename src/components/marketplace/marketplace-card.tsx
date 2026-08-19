"use client";

import Link from "next/link";
import { Heart, Share2, ShieldCheck, Star } from "lucide-react";

export type MarketplaceCardItem = {
  id: string;
  public_id?: string | null;
  title: string;
  price: number;
  currency: string;
  image_url?: string | null;
  seller_name?: string | null;
  seller_id?: string | null;
  rating?: number | null;
  review_count?: number | null;
  verification_badge?: boolean | null;
  listing_type?: string | null;
  status?: string | null;
  created_at?: string;
  is_sponsored?: boolean;
  is_favorite?: boolean;
};

export function MarketplaceCard({ item, onFavorite, onShare }: { item: MarketplaceCardItem; onFavorite?: () => void; onShare?: () => void }) {
  const href = `/marketplace/${item.id}`;
  return (
    <article className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--background)]">
          {item.image_url ? <img src={item.image_url} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" /> : <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">DRIGHT Marketplace</div>}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {item.is_sponsored && <span className="rounded-full bg-[var(--surface)]/90 px-2.5 py-1 text-[10px] font-semibold">Sponsored</span>}
            {item.listing_type && <span className="rounded-full bg-[var(--surface)]/90 px-2.5 py-1 text-[10px] font-semibold capitalize">{item.listing_type.replaceAll("_", " ")}</span>}
          </div>
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="min-w-0">
            <h3 className="line-clamp-2 font-semibold leading-5">{item.title}</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">ID: {item.public_id || item.id}</p>
          </Link>
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={onFavorite} aria-label={item.is_favorite ? "Remove from favorites" : "Add to favorites"} className="rounded-lg p-2 hover:bg-[var(--background)]"><Heart size={16} fill={item.is_favorite ? "currentColor" : "none"} /></button>
            <button type="button" onClick={onShare} aria-label="Share listing" className="rounded-lg p-2 hover:bg-[var(--background)]"><Share2 size={16} /></button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-lg font-bold">{item.currency} {Number(item.price || 0).toLocaleString()}</span>
          {item.rating != null && <span className="inline-flex items-center gap-1 text-xs"><Star size={14} className="fill-current" /> {Number(item.rating).toFixed(1)} ({item.review_count || 0})</span>}
        </div>
        {item.seller_name && <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]"><span className="truncate">{item.seller_name}</span>{item.verification_badge && <ShieldCheck size={14} className="shrink-0" />}</div>}
      </div>
    </article>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, Heart, MessageCircle, Share2, ShoppingBag, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string;
  title: string;
  description: string | null;
  item_type: string | null;
  price: number | null;
  currency: string | null;
  status: string | null;
  created_at: string | null;
};

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const supabase = createClient();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setError("");
      const { data, error: queryError } = await supabase
        .from("marketplace_items")
        .select("id,title,description,item_type,price,currency,status,created_at")
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle();

      if (queryError) setError(queryError.message);
      else setItem((data ?? null) as Item | null);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  async function copyId() {
    await navigator.clipboard?.writeText(id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareListing() {
    const shareData = { title: item?.title || "DRIGHT listing", url: window.location.href };
    if (navigator.share) await navigator.share(shareData).catch(() => undefined);
    else await copyId();
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><div className="h-96 animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]" /></div>;
  }

  if (error) {
    return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16} /> Back to marketplace</Link><div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Could not load this listing: {error}</div></div>;
  }

  if (!item) {
    return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16} /> Back to marketplace</Link><div className="mt-6 rounded-[2rem] border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center"><ShoppingBag className="mx-auto" size={28} /><h1 className="mt-4 text-xl font-semibold">Listing not found</h1><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">This listing may not exist, may no longer be published, or you may not have access to it.</p><Link href="/marketplace" className="mt-6 inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--background)]">Return to marketplace</Link></div></div>;
  }

  const price = item.price == null ? "Contact seller" : `${item.currency || "USD"} ${item.price.toLocaleString()}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
      <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={16} /> Marketplace</Link>

      <main className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_380px]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex min-h-[320px] items-center justify-center bg-[var(--background)] sm:min-h-[430px]"><ShoppingBag size={64} className="text-[var(--muted)]" /></div>
          <div className="p-6 sm:p-9">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[var(--background)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{labelFor(item.item_type)}</span><span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)]"><CheckCircle2 size={13} /> Published</span></div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{item.title}</h1>
            <p className="mt-5 whitespace-pre-wrap text-base leading-7 text-[var(--muted)]">{item.description || "The seller has not added a description yet."}</p>

            <div className="mt-8 border-t border-[var(--border)] pt-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">DRIGHT Listing ID</p>
              <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded-xl bg-[var(--background)] px-3 py-2.5 text-xs">{item.id}</code><button onClick={copyId} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-medium hover:bg-[var(--background)]"><Copy size={14} />{copied ? "Copied" : "Copy ID"}</button></div>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Keep this ID with your order or transaction ID when contacting DRIGHT support about this listing.</p>
            </div>
          </div>
        </section>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="text-sm text-[var(--muted)]">Price</p><p className="mt-1 text-3xl font-semibold">{price}</p>
            <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-semibold text-[var(--background)]"><ShoppingBag size={17} /> Continue to purchase</button>
            <div className="mt-3 grid grid-cols-2 gap-3"><button className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-medium hover:bg-[var(--background)]"><Heart size={16} /> Save</button><button onClick={shareListing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-medium hover:bg-[var(--background)]"><Share2 size={16} /> Share</button></div>
            <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-medium hover:bg-[var(--background)]"><MessageCircle size={16} /> Contact seller</button>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center gap-3"><Sparkles size={18} /><h2 className="font-semibold">DRIGHT protection</h2></div><ul className="mt-4 space-y-3 text-sm leading-5 text-[var(--muted)]"><li>• Your order and transaction can be linked to this Listing ID.</li><li>• Purchases can unlock eligible learning content and entitlements.</li><li>• Affiliate attribution and commissions are handled by DRIGHT’s commerce systems.</li></ul></div>
        </aside>
      </main>
    </div>
  );
}

function labelFor(value: string | null) {
  const labels: Record<string, string> = { product: "Products", service: "Services", course: "Courses", job: "Jobs", task: "Tasks" };
  return labels[value || ""] || value || "Listing";
}

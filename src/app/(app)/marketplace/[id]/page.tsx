"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, Heart, MessageCircle, Share2, ShoppingBag, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = { id: string; public_id: string; title: string; description: string | null; item_type: string | null; price: number | null; currency_code: string | null; status: string | null; created_at: string | null; metadata?: Record<string, unknown> | null };

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const supabase = createClient();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error: loadError } = await supabase.from("marketplace_items").select("id,public_id,title,description,item_type,price,currency_code,status,created_at,metadata").eq("id", id).eq("status", "published").eq("visibility", "public").maybeSingle();
      if (loadError) setError(loadError.message); else setItem(data as Item | null);
      setLoading(false);
      if (!data) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("recently_viewed_items").upsert({ user_id: user.id, item_id: id, last_viewed_at: new Date().toISOString(), view_count: 1 }, { onConflict: "user_id,item_id" });
      const { data: favorite } = await supabase.from("marketplace_item_favorites").select("item_id").eq("item_id", id).maybeSingle();
      setSaved(Boolean(favorite));
      await supabase.from("discovery_events").insert({ user_id: user.id, entity_id: id, event_type: "open", source: "marketplace", metadata: { public_id: data.public_id } });
    })();
  }, [id, supabase]);

  async function copyId() { await navigator.clipboard?.writeText(item?.public_id || id); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
  async function shareListing() { if (navigator.share) await navigator.share({ title: item?.title || "DRIGHT listing", url: window.location.href }).catch(() => undefined); else await copyId(); }

  async function toggleSave() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `/login?next=${encodeURIComponent(`/marketplace/${id}`)}`; return; }
    if (saved) {
      const { error: deleteError } = await supabase.from("marketplace_item_favorites").delete().eq("user_id", user.id).eq("item_id", id);
      if (!deleteError) setSaved(false);
    } else {
      const { error: insertError } = await supabase.from("marketplace_item_favorites").insert({ user_id: user.id, item_id: id });
      if (!insertError) setSaved(true);
    }
  }

  async function addToCart() {
    setAdding(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = `/login?next=${encodeURIComponent(`/marketplace/${id}`)}`; return; }
    let { data: cart, error: cartError } = await supabase.from("carts").select("id").eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (cartError) { setError(cartError.message); setAdding(false); return; }
    if (!cart) {
      const created = await supabase.from("carts").insert({ user_id: user.id, currency_code: item?.currency_code || "USD" }).select("id").single();
      if (created.error) { setError(created.error.message); setAdding(false); return; }
      cart = created.data;
    }
    const existing = await supabase.from("cart_items").select("id,quantity").eq("cart_id", cart.id).eq("item_id", id).maybeSingle();
    if (existing.error) { setError(existing.error.message); setAdding(false); return; }
    const price = item?.price ?? 0;
    const currency = item?.currency_code || "USD";
    const result = existing.data
      ? await supabase.from("cart_items").update({ quantity: existing.data.quantity + 1, unit_amount: price, currency_code: currency }).eq("id", existing.data.id)
      : await supabase.from("cart_items").insert({ cart_id: cart.id, item_id: id, quantity: 1, unit_amount: price, currency_code: currency });
    if (result.error) setError(result.error.message); else setAdded(true);
    setAdding(false);
  }

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-8"><div className="h-96 animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]" /></div>;
  if (error && !item) return <div className="mx-auto max-w-6xl px-4 py-8"><Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16} />Back</Link><div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Could not load this listing: {error}</div></div>;
  if (!item) return <div className="mx-auto max-w-6xl px-4 py-8"><Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16} />Back</Link><div className="mt-6 rounded-[2rem] border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center"><ShoppingBag className="mx-auto" size={28} /><h1 className="mt-4 text-xl font-semibold">Listing not found</h1><Link href="/marketplace" className="mt-6 inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--primary-contrast)]">Return to marketplace</Link></div></div>;

  const imageUrl = typeof item.metadata?.image_url === "string" ? item.metadata.image_url : null;
  const price = item.price == null ? "Contact seller" : `${item.currency_code || "USD"} ${Number(item.price).toLocaleString()}`;

  return <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
    <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)]"><ArrowLeft size={16} />Marketplace</Link>
    <main className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_380px]">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex min-h-[320px] items-center justify-center bg-[var(--background)] sm:min-h-[430px]">{imageUrl ? <img src={imageUrl} alt="" className="h-full max-h-[520px] w-full object-cover" /> : <ShoppingBag size={64} className="text-[var(--muted)]" />}</div>
        <div className="p-6 sm:p-9">
          <div className="flex flex-wrap gap-2"><span className="rounded-full bg-[var(--background)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{labelFor(item.item_type)}</span><span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)]"><CheckCircle2 size={13} />Published</span></div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{item.title}</h1>
          <p className="mt-5 whitespace-pre-wrap text-base leading-7 text-[var(--muted)]">{item.description || "The seller has not added a description yet."}</p>
          <div className="mt-8 border-t border-[var(--border)] pt-5"><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">DRIGHT Listing ID</p><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 truncate rounded-xl bg-[var(--background)] px-3 py-2.5 text-xs">{item.public_id || item.id}</code><button onClick={copyId} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-medium"><Copy size={14} />{copied ? "Copied" : "Copy ID"}</button></div><p className="mt-2 text-xs text-[var(--muted)]">Keep this Listing ID with your order or transaction ID when contacting DRIGHT support.</p></div>
        </div>
      </section>
      <aside className="h-fit lg:sticky lg:top-24"><div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6"><p className="text-sm text-[var(--muted)]">Price</p><p className="mt-1 text-3xl font-semibold">{price}</p><button onClick={() => void addToCart()} disabled={adding || item.price == null} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-50"><ShoppingBag size={17} />{adding ? "Adding…" : added ? "Added to cart" : "Add to cart"}</button>{added && <Link href="/cart" className="mt-3 flex w-full items-center justify-center rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold">View cart</Link>}{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-3 grid grid-cols-2 gap-3"><button onClick={() => void toggleSave()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-medium" aria-pressed={saved}><Heart size={16} fill={saved ? "currentColor" : "none"} />{saved ? "Saved" : "Save"}</button><button onClick={() => void shareListing()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-medium"><Share2 size={16} />Share</button></div><button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-medium"><MessageCircle size={16} />Contact seller</button></div><div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center gap-3"><Sparkles size={18} /><h2 className="font-semibold">DRIGHT protection</h2></div><ul className="mt-4 space-y-3 text-sm leading-5 text-[var(--muted)]"><li>• Your order and transaction can be linked to this Listing ID.</li><li>• Purchases can unlock eligible learning content and entitlements.</li><li>• Affiliate attribution and commissions are handled by DRIGHT commerce systems.</li></ul></div></aside>
    </main>
  </div>;
}

function labelFor(value: string | null) { const labels: Record<string, string> = { product: "Products", physical_product: "Physical", digital_product: "Digital", service: "Services", course: "Courses", job: "Jobs", task: "Tasks" }; return labels[value || ""] || value || "Listing"; }

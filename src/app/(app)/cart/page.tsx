"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CartRow = {
  id: string;
  quantity: number;
  unit_price: number | null;
  currency_code: string | null;
  marketplace_item_id: string;
  marketplace_items: { id: string; title: string; item_type: string | null; price: number | null; currency_code: string | null } | null;
};

export default function CartPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<CartRow[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadCart() {
    setLoading(true);
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setRows([]); setLoading(false); return; }
    const { data: cart, error: cartError } = await supabase.from("carts").select("id").eq("user_id", auth.user.id).maybeSingle();
    if (cartError) { setError(cartError.message); setLoading(false); return; }
    if (!cart) { setRows([]); setLoading(false); return; }
    setCartId(cart.id);
    const { data, error: itemError } = await supabase.from("cart_items").select("id,quantity,unit_price,currency_code,marketplace_item_id,marketplace_items(id,title,item_type,price,currency_code)").eq("cart_id", cart.id).order("created_at", { ascending: false });
    if (itemError) setError(itemError.message);
    else setRows((data ?? []) as unknown as CartRow[]);
    setLoading(false);
  }

  useEffect(() => { loadCart(); }, []);

  async function updateQuantity(row: CartRow, quantity: number) {
    if (quantity < 1) return remove(row.id);
    setBusy(row.id); setError("");
    const { error: updateError } = await supabase.from("cart_items").update({ quantity }).eq("id", row.id).eq("cart_id", cartId);
    if (updateError) setError(updateError.message); else setRows(current => current.map(x => x.id === row.id ? { ...x, quantity } : x));
    setBusy(null);
  }

  async function remove(id: string) {
    setBusy(id); setError("");
    const { error: deleteError } = await supabase.from("cart_items").delete().eq("id", id).eq("cart_id", cartId);
    if (deleteError) setError(deleteError.message); else setRows(current => current.filter(x => x.id !== id));
    setBusy(null);
  }

  const subtotal = useMemo(() => rows.reduce((sum, row) => sum + Number(row.unit_price ?? row.marketplace_items?.price ?? 0) * row.quantity, 0), [rows]);
  const currency = rows[0]?.currency_code || rows[0]?.marketplace_items?.currency_code || "USD";
  const mixedCurrencies = rows.some(row => (row.currency_code || row.marketplace_items?.currency_code || "USD") !== currency);

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><div className="h-80 animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]" /></div>;

  return <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
    <div className="flex items-end justify-between gap-4"><div><p className="text-sm text-[var(--muted)]">Your commerce basket</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Cart</h1></div><Link href="/marketplace" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]">Continue shopping</Link></div>
    {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {rows.length === 0 ? <div className="mt-8 rounded-[2rem] border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center"><ShoppingBag className="mx-auto" size={34} /><h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Add products, services, courses, jobs or tasks that are available for purchase.</p><Link href="/marketplace" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--background)]">Explore marketplace <ArrowRight size={16} /></Link></div> : <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">{rows.map(row => { const item = row.marketplace_items; const price = Number(row.unit_price ?? item?.price ?? 0); return <article key={row.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex gap-4"><div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-[var(--background)]"><ShoppingBag size={22} /></div><div className="min-w-0 flex-1"><Link href={`/marketplace/${row.marketplace_item_id}`} className="font-semibold hover:underline">{item?.title || "Listing"}</Link><p className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">{item?.item_type || "item"} · ID {row.marketplace_item_id}</p><p className="mt-3 text-sm font-medium">{row.currency_code || item?.currency_code || currency} {price.toLocaleString()}</p></div><button disabled={busy === row.id} onClick={() => remove(row.id)} className="self-start rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--background)]" aria-label="Remove item"><Trash2 size={17} /></button></div><div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4"><span className="text-xs text-[var(--muted)]">Quantity</span><div className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-1"><button disabled={busy === row.id || row.quantity <= 1} onClick={() => updateQuantity(row, row.quantity - 1)} className="rounded-lg p-2 hover:bg-[var(--background)]"><Minus size={15} /></button><span className="w-8 text-center text-sm font-semibold">{row.quantity}</span><button disabled={busy === row.id} onClick={() => updateQuantity(row, row.quantity + 1)} className="rounded-lg p-2 hover:bg-[var(--background)]"><Plus size={15} /></button></div><strong>{row.currency_code || item?.currency_code || currency} {(price * row.quantity).toLocaleString()}</strong></div></article>; })}</section>
      <aside className="h-fit rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 lg:sticky lg:top-24"><h2 className="text-lg font-semibold">Order summary</h2><div className="mt-5 flex justify-between text-sm"><span className="text-[var(--muted)]">Subtotal</span><span className="font-semibold">{mixedCurrencies ? "Multiple currencies" : `${currency} ${subtotal.toLocaleString()}`}</span></div><p className="mt-3 text-xs leading-5 text-[var(--muted)]">Taxes, discounts, platform fees and payment requirements are finalized during checkout.</p><button disabled={mixedCurrencies} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-semibold text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50">Proceed to checkout <ArrowRight size={17} /></button></aside>
    </div>}
  </div>;
}

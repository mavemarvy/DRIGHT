"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Banknote, CheckCircle2, Clock3, Copy, CreditCard, ExternalLink, History, Wallet as WalletIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type WalletSummary = { wallet_id: string; public_wallet_id: string; currency_code: string; status: string; available_balance: number; pending_balance: number; total_balance: number; pending_payout_count: number };
type Entry = { entry_id: string; entry_type: string; direction: string; amount: number; currency_code: string; description: string | null; created_at: string };
type PayoutAccount = { id: string; method_type: string; provider: string | null; account_reference: string | null; is_default: boolean; is_verified: boolean };
type Payout = { id: string; payout_id: string; amount: number; currency_code: string; status: string; requested_at: string; processed_at: string | null; failure_reason: string | null };
type WalletStat = { label: string; value: number; icon: LucideIcon };

const payoutLabels: Record<string, string> = { pending: "Pending review", processing: "Processing", paid: "Paid", cancelled: "Cancelled", failed: "Failed" };
const payoutBadge: Record<string, string> = { pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300", processing: "bg-blue-500/10 text-blue-700 dark:text-blue-300", paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", cancelled: "bg-red-500/10 text-red-700 dark:text-red-300", failed: "bg-red-500/10 text-red-700 dark:text-red-300" };

export default function WalletPage() {
  const supabase = createClient();
  const [wallets, setWallets] = useState<WalletSummary[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login?next=/wallet"; return; }
    await supabase.rpc("ensure_wallet", { p_currency_code: "USD" });
    const [w, e, a, p] = await Promise.all([
      supabase.rpc("get_wallet_summary"),
      supabase.from("wallet_ledger_entries").select("entry_id,entry_type,direction,amount,currency_code,description,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("payout_accounts").select("id,method_type,provider,account_reference,is_default,is_verified").eq("user_id", user.id).order("is_default", { ascending: false }),
      supabase.from("payouts").select("id,payout_id,amount,currency_code,status,requested_at,processed_at,failure_reason").eq("user_id", user.id).order("requested_at", { ascending: false }).limit(10),
    ]);
    if (w.error) setError(w.error.message); else {
      const rows = (w.data || []) as WalletSummary[];
      setWallets(rows);
      if (!selectedWallet && rows[0]) setSelectedWallet(rows[0].wallet_id);
    }
    if (e.error) setError(e.error.message); else setEntries((e.data || []) as Entry[]);
    if (a.error) setError(a.error.message); else {
      const rows = (a.data || []) as PayoutAccount[];
      setAccounts(rows);
      if (!accountId && rows.find(x => x.is_default)?.id) setAccountId(rows.find(x => x.is_default)!.id);
      else if (!accountId && rows[0]) setAccountId(rows[0].id);
    }
    if (!p.error) setPayouts((p.data || []) as Payout[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function requestPayout() {
    setBusy(true); setError(""); setMessage("");
    if (!selectedWallet || !accountId) { setError("Select a wallet and verified payout account first."); setBusy(false); return; }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) { setError("Enter a valid payout amount."); setBusy(false); return; }
    const { error: rpcError } = await supabase.rpc("request_wallet_payout", { p_wallet_id: selectedWallet, p_payout_account_id: accountId, p_amount: value });
    if (rpcError) setError(rpcError.message); else { setAmount(""); setMessage("Payout request submitted. DRIGHT has reserved the requested amount from your available balance."); await load(); }
    setBusy(false);
  }

  const wallet = wallets.find(w => w.wallet_id === selectedWallet) || wallets[0];
  const money = (value: number, currency = wallet?.currency_code || "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value || 0));
  const groupedEntries = useMemo(() => entries.slice(0, 20), [entries]);
  const stats: WalletStat[] = [{label:"Available",value:Number(wallet?.available_balance||0),icon:WalletIcon},{label:"Pending payout",value:Number(wallet?.pending_balance||0),icon:Clock3},{label:"Total balance",value:Number(wallet?.total_balance||0),icon:Banknote}];
  const copyWalletId = async () => { if (!wallet?.public_wallet_id) return; await navigator.clipboard?.writeText(wallet.public_wallet_id); setMessage("Wallet ID copied."); };

  return <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Financial center</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Wallet</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">A clear view of money you can use, money reserved for payouts, and every ledger-backed transaction.</p></div>
      <div className="flex gap-2"><Link href="/wallet/payouts" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold"><History size={16}/> Payout history</Link></div>
    </div>
    {error && <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
    <section className="mt-6 grid gap-4 sm:grid-cols-3">{stats.map(({label,value,icon:Icon}) => <article key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--background)]"><Icon size={17}/></span></div><p className="mt-4 text-2xl font-bold">{loading ? "—" : money(value)}</p>{label === "Pending payout" && <p className="mt-1 text-xs text-[var(--muted)]">{wallet?.pending_payout_count || 0} active request(s)</p>}</article>)}</section>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm text-[var(--muted)]">Selected wallet</p><p className="mt-1 text-3xl font-bold">{loading ? "—" : wallet?.currency_code || "USD"}</p><p className="mt-2 text-xs text-[var(--muted)]">Wallet ID: {wallet?.public_wallet_id || "—"}</p></div>{wallets.length > 1 && <select value={selectedWallet} onChange={e => setSelectedWallet(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm">{wallets.map(w => <option key={w.wallet_id} value={w.wallet_id}>{w.currency_code}</option>)}</select>}</div><div className="mt-5 flex flex-wrap gap-2"><button onClick={copyWalletId} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold"><Copy size={14}/> Copy wallet ID</button><Link href="/settings" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold"><CreditCard size={14}/> Payment settings</Link></div><div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-5"><div className="flex gap-3"><ArrowUpFromLine size={20} className="mt-0.5 shrink-0"/><div><p className="font-semibold">Fund wallet</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Direct wallet funding is not enabled by the current DRIGHT payment infrastructure. Do not send money to a manual account or enter payment credentials here. Purchases continue through the secure checkout flow.</p><Link href="/marketplace" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">Browse marketplace <ExternalLink size={14}/></Link></div></div></div></section>
      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-7"><div className="flex items-center gap-2"><ArrowDownToLine size={18}/><h2 className="font-bold">Withdraw</h2></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Choose a verified payout method. The server validates balance, minimums and ownership before creating a payout.</p>{accounts.length ? <><label className="mt-5 block text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Payout method</label><select value={accountId} onChange={e => setAccountId(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm">{accounts.map(a => <option key={a.id} value={a.id}>{a.provider || a.method_type} · {a.account_reference || "account"}{a.is_default ? " · default" : ""}{a.is_verified ? " · verified" : " · unverified"}</option>)}</select><label className="mt-4 block text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Amount</label><div className="mt-2 flex items-center rounded-xl border border-[var(--border)] bg-[var(--background)] px-3"><span className="text-sm text-[var(--muted)]">{wallet?.currency_code || "USD"}</span><input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-transparent px-3 py-3 text-sm outline-none"/></div><button onClick={requestPayout} disabled={busy || loading} className="mt-4 w-full rounded-xl bg-[var(--primary)] px-4 py-3.5 text-sm font-bold text-[var(--background)] disabled:opacity-50">{busy ? "Submitting…" : "Request payout"}</button></> : <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] p-5 text-sm leading-6 text-[var(--muted)]">No payout method is configured. Add and verify a payout account before requesting a withdrawal.</div>}{message && <p className="mt-3 text-sm">{message}</p>}</section>
    </div>
    <section className="mt-5 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-sm"><div className="flex items-center justify-between border-b border-[var(--border)] p-5 sm:p-6"><div><h2 className="font-bold">Recent transactions</h2><p className="mt-1 text-xs text-[var(--muted)]">Ledger-backed activity for your account.</p></div><CreditCard size={18} className="text-[var(--muted)]"/></div><div className="divide-y divide-[var(--border)]">{groupedEntries.length ? groupedEntries.map(e => <div key={e.entry_id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-medium">{e.description || e.entry_type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[var(--muted)]">{e.entry_id} · {new Date(e.created_at).toLocaleString()}</p></div><p className={`shrink-0 text-sm font-bold ${e.direction === "credit" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>{e.direction === "credit" ? "+" : "−"}{money(Number(e.amount), e.currency_code)}</p></div>) : <p className="p-8 text-sm text-[var(--muted)]">No wallet transactions yet.</p>}</div></section>
    <section className="mt-5 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-sm"><div className="border-b border-[var(--border)] p-5 sm:p-6"><h2 className="font-bold">Payout requests</h2><p className="mt-1 text-xs text-[var(--muted)]">Track every withdrawal from request to completion.</p></div><div className="divide-y divide-[var(--border)]">{payouts.length ? payouts.map(p => <div key={p.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{p.payout_id}</p><p className="mt-1 text-xs text-[var(--muted)]">Requested {new Date(p.requested_at).toLocaleString()}</p>{p.failure_reason && <p className="mt-1 text-xs text-red-600">{p.failure_reason}</p>}</div><div className="text-left sm:text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${payoutBadge[p.status] || "bg-[var(--background)]"}`}>{payoutLabels[p.status] || p.status}</span><p className="mt-2 text-sm font-bold">{money(Number(p.amount), p.currency_code)}</p></div></div>) : <p className="p-8 text-sm text-[var(--muted)]">No payout requests yet.</p>}</div></section>
  </div>;
}

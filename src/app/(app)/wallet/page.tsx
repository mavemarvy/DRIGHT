"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, Clock3, Wallet as WalletIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type WalletRow = { id: string; wallet_id: string; currency_code: string; status: string; balance?: number };
type Entry = { entry_id: string; entry_type: string; direction: string; amount: number; currency_code: string; description: string | null; created_at: string };
type PayoutAccount = { id: string; method_type: string; provider: string | null; account_reference: string | null; is_default: boolean; is_verified: boolean };

export default function WalletPage() {
  const supabase = createClient();
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login?next=/wallet"; return; }
    await supabase.rpc("ensure_wallet", { p_currency_code: "USD" });
    const [w, e, a] = await Promise.all([
      supabase.from("wallet_balances").select("id,wallet_id,currency_code,status,balance").eq("user_id", user.id).order("currency_code"),
      supabase.from("wallet_ledger_entries").select("entry_id,entry_type,direction,amount,currency_code,description,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("payout_accounts").select("id,method_type,provider,account_reference,is_default,is_verified").eq("user_id", user.id).order("is_default", { ascending: false })
    ]);
    if (w.error) setError(w.error.message); else {
      const rows = (w.data || []) as WalletRow[];
      setWallets(rows);
      if (!selectedWallet && rows[0]) setSelectedWallet(rows[0].id);
    }
    if (e.error) setError(e.error.message); else setEntries((e.data || []) as Entry[]);
    if (a.error) setError(a.error.message); else {
      const rows = (a.data || []) as PayoutAccount[];
      setAccounts(rows);
      if (!accountId && rows[0]) setAccountId(rows[0].id);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function requestPayout() {
    setBusy(true); setError(""); setMessage("");
    if (!selectedWallet || !accountId) { setError("Select a wallet and verified payout account first."); setBusy(false); return; }
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 5) { setError("Minimum payout is 5 in the wallet currency."); setBusy(false); return; }
    const { error: rpcError } = await supabase.rpc("request_wallet_payout", { p_wallet_id: selectedWallet, p_payout_account_id: accountId, p_amount: value });
    if (rpcError) setError(rpcError.message); else { setAmount(""); setMessage("Payout request submitted. The amount is reserved from your available wallet balance."); await load(); }
    setBusy(false);
  }

  const wallet = wallets.find(w => w.id === selectedWallet) || wallets[0];
  const money = (value: number, currency = wallet?.currency_code || "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value || 0));

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Financial center</p><h1 className="mt-1 text-3xl font-semibold">Wallet</h1><p className="mt-2 text-sm text-[var(--muted)]">Your balance is calculated from the immutable DRIGHT financial ledger.</p></div><WalletIcon size={28}/></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm text-[var(--muted)]">Available balance</p><p className="mt-2 text-4xl font-semibold">{loading ? "—" : money(Number(wallet?.balance || 0))}</p></div>{wallets.length > 1 && <select value={selectedWallet} onChange={e => setSelectedWallet(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">{wallets.map(w => <option key={w.id} value={w.id}>{w.currency_code}</option>)}</select>}</div>
        <p className="mt-3 text-xs text-[var(--muted)]">Wallet ID: {wallet?.wallet_id || "—"} · Status: {wallet?.status || "—"}</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Minimum payout</p><p className="mt-1 font-semibold">5 {wallet?.currency_code || "USD"}</p></div><div className="rounded-xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Ledger entries</p><p className="mt-1 font-semibold">{entries.length}</p></div></div>
      </section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-2"><ArrowDownToLine size={18}/><h2 className="font-semibold">Request payout</h2></div><p className="mt-2 text-sm text-[var(--muted)]">Payouts are reviewed and processed according to DRIGHT financial rules.</p>{accounts.length ? <><label className="mt-5 block text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Payout account</label><select value={accountId} onChange={e => setAccountId(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm">{accounts.map(a => <option key={a.id} value={a.id}>{a.provider || a.method_type} · {a.account_reference || "account"}{a.is_verified ? " · verified" : ""}</option>)}</select><label className="mt-4 block text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Amount</label><input type="number" min="5" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5.00" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm"/><button onClick={requestPayout} disabled={busy} className="mt-4 w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--background)] disabled:opacity-50">{busy ? "Submitting…" : "Request payout"}</button></> : <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">Add and verify a payout account before requesting a withdrawal.</div>}{message && <p className="mt-3 text-sm">{message}</p>}{error && <p className="mt-3 text-sm text-red-600">{error}</p>}</section>
    </div>
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-2"><Clock3 size={18}/><h2 className="font-semibold">Recent wallet activity</h2></div><div className="mt-4 divide-y divide-[var(--border)]">{entries.length ? entries.map(e => <div key={e.entry_id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-medium">{e.description || e.entry_type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[var(--muted)]">{e.entry_id} · {new Date(e.created_at).toLocaleString()}</p></div><p className={`text-sm font-semibold ${e.direction === "credit" ? "" : "text-red-600"}`}>{e.direction === "credit" ? "+" : "−"}{money(Number(e.amount), e.currency_code)}</p></div>) : <p className="py-8 text-sm text-[var(--muted)]">No wallet activity yet.</p>}</div></section>
  </div>;
}

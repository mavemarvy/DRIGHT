"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, Copy, Gift, Share2, Trophy, Users, WalletCards } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Referral = {
  referral_id: string;
  referred_user_id: string | null;
  level: number;
  status: string | null;
  qualifying_event: string | null;
  expires_at: string | null;
  qualified_at: string | null;
  created_at: string;
};

type Reward = {
  reward_id: string;
  referral_id: string | null;
  level: number;
  reward_percent: number | null;
  basis_amount: number | null;
  reward_amount: number | null;
  currency_code: string | null;
  status: string | null;
  available_at: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
};

type Leader = { user_id: string; display_name: string | null; username: string | null; score: number; rank: number };

type ReferralStat = [label: string, value: string | number, icon: LucideIcon];

const statusLabel = (status: string | null) => {
  const value = (status || "pending").toLowerCase();
  if (value === "qualified" || value === "active" || value === "confirmed") return "Qualified";
  if (value === "earned" || value === "available") return "Earned";
  if (value === "paid") return "Paid";
  if (value === "rejected") return "Rejected";
  if (value === "expired") return "Expired";
  return "Pending";
};

const badgeClass = (status: string | null) => {
  const value = statusLabel(status);
  if (value === "Paid" || value === "Earned" || value === "Qualified") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (value === "Rejected" || value === "Expired") return "bg-red-500/10 text-red-700 dark:text-red-300";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
};

export default function ReferralsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Referral[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { location.href = "/login?next=/referrals"; return; }
      const [referrals, rewardRows, summaryRow, leaderboard] = await Promise.all([
        supabase.from("referrals").select("referral_id,referred_user_id,level,status,qualifying_event,expires_at,qualified_at,created_at").eq("referrer_user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("referral_rewards").select("reward_id,referral_id,level,reward_percent,basis_amount,reward_amount,currency_code,status,available_at,expires_at,paid_at,created_at").eq("beneficiary_user_id", user.id).order("created_at", { ascending: false }),
        supabase.rpc("get_referral_summary", { p_user_id: user.id }),
        supabase.rpc("get_social_leaderboard", { p_type: "affiliate", p_community_id: null, p_limit: 5 }),
      ]);
      if (cancelled) return;
      setUserId(user.id);
      setRows((referrals.data || []) as Referral[]);
      setRewards((rewardRows.data || []) as Reward[]);
      setSummary((summaryRow.data || {}) as Record<string, number>);
      setLeaders((leaderboard.data || []) as Leader[]);
      setError(referrals.error?.message || rewardRows.error?.message || summaryRow.error?.message || leaderboard.error?.message || "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  const currency = rewards[0]?.currency_code || "USD";
  const totals = useMemo(() => rewards.reduce((a, r) => {
    const n = Number(r.reward_amount || 0);
    const s = statusLabel(r.status);
    if (s === "Pending") a.pending += n;
    if (s === "Earned") a.earned += n;
    if (s === "Paid") a.paid += n;
    return a;
  }, { pending: 0, earned: 0, paid: 0 }), [rewards]);

  const qualified = rows.filter(r => ["qualified", "active", "confirmed"].includes((r.status || "").toLowerCase())).length;
  const conversion = rows.length ? Math.round((qualified / rows.length) * 100) : 0;
  const shareValue = rows[0]?.referral_id || userId;

  const copyReferralId = async () => {
    await navigator.clipboard.writeText(shareValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const shareReferral = async () => {
    const text = `My DRIGHT referral ID is ${shareValue}. Use it when joining through my referral.`;
    if (navigator.share) await navigator.share({ title: "Join me on DRIGHT", text });
    else await copyReferralId();
  };

  const stats: ReferralStat[] = [
    ["Total referrals", rows.length, Users],
    ["Qualified", qualified, Check],
    ["Conversion", `${conversion}%`, ArrowUpRight],
    ["Earned", `${totals.earned.toFixed(2)} ${currency}`, Gift],
    ["Paid", `${totals.paid.toFixed(2)} ${currency}`, WalletCards],
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Referral Center</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Turn trusted connections into rewards.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Track every referral from pending to qualification and payout using DRIGHT&apos;s authoritative referral records.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copyReferralId} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--background)]"><Copy size={16} />{copied ? "Copied" : "Copy referral ID"}</button>
            <button onClick={shareReferral} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)]"><Share2 size={16} />Share &amp; earn</button>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs text-[var(--muted)]">Your referral ID</p><p className="mt-1 break-all font-mono text-sm font-semibold">{shareValue || "—"}</p></div>
          <p className="text-xs text-[var(--muted)]">Keep this ID private to you; share it only with people you intend to refer.</p>
        </div>
      </section>

      {error && <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, value, Icon]) => <article key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--background)]"><Icon size={17} /></span></div><p className="mt-3 text-2xl font-bold tracking-tight">{value}</p></article>)}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.45fr_.8fr]">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Referral progress</h2><p className="mt-1 text-sm text-[var(--muted)]">A clear view of the current referral funnel.</p></div><span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold">{rows.length} total</span></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[["Invited", rows.length], ["Qualified", qualified], ["Rewarded", rewards.filter(r => ["earned", "available", "paid"].includes((r.status || "").toLowerCase())).length]].map(([label, value], i) => <div key={String(label)} className="rounded-2xl border border-[var(--border)] p-4"><div className="text-xs text-[var(--muted)]">{label}</div><div className="mt-2 text-xl font-bold">{value}</div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--background)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${rows.length ? Math.min(100, (Number(value) / rows.length) * 100) : 0}%` }} /></div></div>)}
          </div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]"><th className="p-3">Referral ID</th><th>Level</th><th>Status</th><th>Qualifying event</th><th className="p-3">Expires</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="p-6">Loading…</td></tr> : rows.map(r => <tr key={r.referral_id} className="border-b border-[var(--border)] last:border-0"><td className="p-3 font-mono text-xs font-semibold">{r.referral_id}</td><td>{r.level}</td><td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(r.status)}`}>{statusLabel(r.status)}</span></td><td>{r.qualifying_event || "—"}</td><td className="p-3">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</td></tr>)}</tbody></table>{!loading && !rows.length && <p className="p-8 text-center text-sm text-[var(--muted)]">No referral relationships yet.</p>}</div>
        </article>

        <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--background)]"><Trophy size={18} /></div><div><h2 className="font-bold">Affiliate leaderboard</h2><p className="text-xs text-[var(--muted)]">Public platform ranking</p></div></div>
          <div className="mt-5 space-y-2">{leaders.length ? leaders.map(r => <div key={r.user_id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--background)] text-xs font-bold">{r.rank}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{r.display_name || r.username || "DRIGHT user"}</p><p className="text-xs text-[var(--muted)]">@{r.username || "user"}</p></div><span className="text-sm font-bold">{Number(r.score).toLocaleString()}</span></div>) : <p className="py-8 text-center text-sm text-[var(--muted)]">No public affiliate ranking data yet.</p>}</div>
          <a href="/leaderboards" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]">View full leaderboard <ArrowUpRight size={15} /></a>
        </aside>
      </section>

      <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
        <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Reward history</h2><p className="mt-1 text-sm text-[var(--muted)]">Every reward remains traceable through its lifecycle.</p></div><div className="text-right"><p className="text-xs text-[var(--muted)]">Pending value</p><p className="font-bold">{totals.pending.toFixed(2)} {currency}</p></div></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]"><th className="p-3">Reward ID</th><th>Level</th><th>Basis</th><th>Reward</th><th>Status</th><th>Available</th><th className="p-3">Created</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="p-6">Loading…</td></tr> : rewards.map(r => <tr key={r.reward_id} className="border-b border-[var(--border)] last:border-0"><td className="p-3 font-mono text-xs font-semibold">{r.reward_id}</td><td>{r.level}</td><td>{Number(r.basis_amount || 0).toFixed(2)} {r.currency_code || currency}</td><td className="font-semibold">{Number(r.reward_amount || 0).toFixed(2)} {r.currency_code || currency}</td><td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(r.status)}`}>{statusLabel(r.status)}</span></td><td>{r.available_at ? new Date(r.available_at).toLocaleDateString() : "—"}</td><td className="p-3">{new Date(r.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{!loading && !rewards.length && <p className="p-8 text-center text-sm text-[var(--muted)]">No rewards yet. Your first qualifying referral will appear here.</p>}</div>
      </section>
    </main>
  );
}

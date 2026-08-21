"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, Compass, Gift, Heart, MessageSquare, ShoppingBag, Sparkles, Store, Users, Wallet, Activity, Megaphone, BarChart3, Clock3, ChevronRight, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = { username: string | null; full_name: string | null };
type WalletRow = { id: string; currency_code: string; balance?: number; status: string };
type LedgerEntry = { entry_id: string; entry_type: string; direction: string; amount: number; currency_code: string; description: string | null; created_at: string };
type OrderRow = { id: string; status: string | null; created_at: string; total_amount?: number | null; currency_code?: string | null };
type ReferralSummary = { direct?: number; level2?: number; level3?: number; available?: number };
type StatCard = { label: string; value: string; helper: string; icon: LucideIcon; href: string };
type QuickCard = { title: string; text: string; href: string; icon: LucideIcon; tone?: string };

function Skeleton({ className = "" }: { className?: string }) { return <div aria-hidden="true" className={`animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-muted)] ${className}`}/>; }
function money(value: number, currency = "USD") { try { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value || 0)); } catch { return `${Number(value || 0).toFixed(2)} ${currency}`; } }

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile>({ username: null, full_name: null });
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [referral, setReferral] = useState<ReferralSummary>({});
  const [counts, setCounts] = useState({ orders: 0, favorites: 0, notifications: 0, messages: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) { setLoading(false); return; }
      const [profileResult, ordersCount, favoritesCount, notificationsCount, messagesCount, walletResult, ledgerResult, recentOrders, referralResult, adminResult] = await Promise.all([
        supabase.from("profiles").select("username,full_name").eq("id", userId).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_user_id", userId),
        supabase.from("post_saves").select("post_id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_user_id", userId),
        supabase.from("wallet_balances").select("id,currency_code,balance,status").eq("user_id", userId).order("currency_code").limit(1).maybeSingle(),
        supabase.from("wallet_ledger_entries").select("entry_id,entry_type,direction,amount,currency_code,description,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
        supabase.from("orders").select("id,status,created_at,total_amount,currency_code").eq("buyer_user_id", userId).order("created_at", { ascending: false }).limit(4),
        supabase.rpc("get_referral_summary", { p_user_id: userId }),
        supabase.rpc("is_super_admin", { check_user_id: userId }),
      ]);
      if (cancelled) return;
      if (profileResult.error) setError(profileResult.error.message);
      setProfile(profileResult.data ?? { username: null, full_name: null });
      setCounts({ orders: ordersCount.count ?? 0, favorites: favoritesCount.count ?? 0, notifications: notificationsCount.count ?? 0, messages: messagesCount.count ?? 0 });
      if (!walletResult.error) setWallet(walletResult.data as WalletRow | null);
      if (!ledgerResult.error) setLedger((ledgerResult.data ?? []) as LedgerEntry[]);
      if (!recentOrders.error) setOrders((recentOrders.data ?? []) as OrderRow[]);
      if (!referralResult.error) setReferral((referralResult.data ?? {}) as ReferralSummary);
      setIsAdmin(Boolean(adminResult.data));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [supabase]);

  const name = profile.full_name || profile.username || "there";
  const currency = wallet?.currency_code || "USD";
  const stats: StatCard[] = [
    { label: "Wallet", value: wallet ? money(Number(wallet.balance || 0), currency) : "—", helper: wallet?.status ? `Status: ${wallet.status}` : "Wallet balance", icon: Wallet, href: "/wallet" },
    { label: "Orders", value: String(counts.orders), helper: "Purchases on your account", icon: ShoppingBag, href: "/orders" },
    { label: "Referrals", value: referral.available != null ? money(Number(referral.available), currency) : "—", helper: "Available referral rewards", icon: Gift, href: "/referrals" },
    { label: "Messages", value: String(counts.messages), helper: "Messages you have sent", icon: MessageSquare, href: "/messages" },
  ];
  const quick: QuickCard[] = [
    { title: "Explore marketplace", text: "Discover products, services, courses and jobs using DRIGHT search.", href: "/marketplace", icon: Compass },
    { title: "Open buyer space", text: "Review purchases, saved items and buyer activity.", href: "/buyer", icon: ShoppingBag },
    { title: "Build & earn", text: "Open your vendor or affiliate workspace when enabled for your account.", href: "/vendor", icon: Store },
    { title: "AI command center", text: "Use DRIGHT Gen.ai for contextual assistance and discovery.", href: "/gen-ai", icon: Sparkles },
  ];
  const activity = [...ledger.map(e => ({ key: e.entry_id, title: e.description || e.entry_type.replaceAll("_", " "), detail: `${e.direction === "credit" ? "+" : "−"}${money(Number(e.amount), e.currency_code)}`, date: e.created_at })), ...orders.map(o => ({ key: `order-${o.id}`, title: `Order ${o.id}`, detail: o.status || "submitted", date: o.created_at }))].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,5);

  return <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <section className="relative overflow-hidden rounded-[var(--radius-3xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--accent-soft)] blur-3xl"/>
      <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]"><span className="h-2 w-2 rounded-full bg-[var(--accent)]"/>Command center</div><h1 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl lg:text-5xl">Good to see you, {name}.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">Your marketplace, money, activity and earning tools in one place. Everything below is sourced from your current DRIGHT account.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/marketplace" className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-contrast)] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">Explore marketplace <ArrowRight size={16}/></Link><Link href="/notifications" className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--border-strong)]">Notifications <Bell size={16}/></Link></div>
      </div>
    </section>

    <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({label,value,helper,icon:Icon,href}) => <Link key={label} href={href} className="group rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={19}/></span><ChevronRight size={17} className="text-[var(--muted)] transition group-hover:translate-x-0.5"/></div><p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</p>{loading?<Skeleton className="mt-2 h-8 w-28"/>:<p className="mt-1 truncate text-2xl font-black tracking-tight">{value}</p>}<p className="mt-1 truncate text-xs text-[var(--muted)]">{helper}</p></Link>)}
    </section>

    <section className="mt-7 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]"><Activity size={15}/> Recent activity</div><h2 className="mt-1 text-xl font-bold tracking-tight">What is happening in your account</h2></div><Link href="/wallet" className="text-xs font-semibold text-[var(--accent)]">Open wallet</Link></div><div className="mt-5 divide-y divide-[var(--border)]">{loading?[1,2,3,4].map(i=><div key={i} className="flex items-center gap-3 py-4"><Skeleton className="h-10 w-10 rounded-full"/><div className="min-w-0 flex-1"><Skeleton className="h-3 w-40"/><Skeleton className="mt-2 h-2.5 w-24"/></div><Skeleton className="h-3 w-16"/></div>):activity.length?activity.map(item=><div key={item.key} className="flex items-center gap-3 py-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]"><Clock3 size={16}/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold capitalize">{item.title}</p><p className="mt-1 truncate text-xs text-[var(--muted)]">{new Date(item.date).toLocaleString()}</p></div><p className="shrink-0 text-sm font-bold">{item.detail}</p></div>):<div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-8 text-center"><Activity className="mx-auto text-[var(--muted)]" size={22}/><p className="mt-3 text-sm font-semibold">No recent activity yet</p><p className="mt-1 text-xs text-[var(--muted)]">Your wallet and order activity will appear here.</p></div>}</div></div>
      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] sm:p-6"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]"><Gift size={15}/> Referral performance</div><h2 className="mt-1 text-xl font-bold tracking-tight">Your referral network</h2><div className="mt-5 grid grid-cols-3 gap-2">{[["Direct",referral.direct||0],["Level 2",referral.level2||0],["Level 3",referral.level3||0]].map(([label,value])=><div key={String(label)} className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}</div><div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Available rewards</p><p className="mt-1 text-2xl font-black">{referral.available != null ? money(Number(referral.available), currency) : "—"}</p></div><Link href="/referrals" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">View referral center <ArrowRight size={15}/></Link></div>
    </section>

    <section className="mt-7"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Quick actions</p><h2 className="mt-1 text-2xl font-black tracking-tight">Move your work forward</h2></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{quick.map(({title,text,href,icon:Icon})=><Link key={href} href={href} className="group rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"><span className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] transition group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]"><Icon size={19}/></span><h3 className="mt-5 font-bold">{title}</h3><p className="mt-2 min-h-12 text-sm leading-5 text-[var(--muted)]">{text}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-bold">Open <ArrowRight size={14} className="transition group-hover:translate-x-1"/></span></Link>)}</div></section>

    <section className="mt-7 grid gap-5 lg:grid-cols-3">
      <Link href="/favorites" className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] transition hover:shadow-[var(--shadow-md)]"><div className="flex items-center gap-3"><Heart size={18}/><h3 className="font-bold">Saved & recommendations</h3></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">You have {counts.favorites} saved item{counts.favorites===1?"":"s"}. Continue browsing to refine what DRIGHT recommends to you.</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[var(--accent)]">Open favorites <ArrowRight size={14}/></span></Link>
      <Link href="/messages" className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] transition hover:shadow-[var(--shadow-md)]"><div className="flex items-center gap-3"><MessageSquare size={18}/><h3 className="font-bold">Messages</h3></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Your account currently has {counts.messages} message record{counts.messages===1?"":"s"}. Keep conversations in one workspace.</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[var(--accent)]">Open messages <ArrowRight size={14}/></span></Link>
      {isAdmin?<Link href="/admin/promotions" className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] transition hover:shadow-[var(--shadow-md)]"><div className="flex items-center gap-3"><Megaphone size={18}/><h3 className="font-bold">Campaign workspace</h3></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Manage promotions and advertising from the permission-aware admin workspace.</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[var(--accent)]">Open campaigns <ArrowRight size={14}/></span></Link>:<Link href="/gen-ai" className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] transition hover:shadow-[var(--shadow-md)]"><div className="flex items-center gap-3"><Sparkles size={18}/><h3 className="font-bold">AI insights</h3></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use DRIGHT Gen.ai to turn your current marketplace activity into contextual assistance without inventing dashboard metrics.</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[var(--accent)]">Open Gen.ai <ArrowRight size={14}/></span></Link>}
    </section>
    {error&&<p className="mt-5 rounded-[var(--radius-md)] border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">Some dashboard data could not be loaded: {error}</p>}
  </div>;
}

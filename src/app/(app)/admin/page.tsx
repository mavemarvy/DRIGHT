"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, DollarSign, FileText, Megaphone, Settings2, ShieldCheck, ShoppingCart, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const cards = [
  { title: "Feature Control", description: "Manage platform feature visibility and rollout states.", href: "/admin/features", icon: ShieldCheck },
  { title: "Finance", description: "Review financial operations, ledger activity and controls.", href: "/admin/finance", icon: DollarSign },
  { title: "Refunds & Disputes", description: "Review customer cases, decisions and audit history.", href: "/admin/refunds", icon: FileText },
  { title: "Promotions & Advertising", description: "Review sponsored campaigns, pricing configuration and advertising performance.", href: "/admin/promotions", icon: Megaphone },
  { title: "Monetization", description: "Configure authoritative referral, commission, withdrawal and role-switch economics.", href: "/admin/monetization", icon: Settings2 },
];

export default function AdminHomePage() {
  const [name, setName] = useState("Administrator");
  const supabase = createClient();
  useEffect(() => { (async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const { data } = await supabase.from("profiles").select("username,full_name").eq("id", user.id).maybeSingle(); setName(data?.full_name || data?.username || "Administrator"); })(); }, [supabase]);
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">DRIGHT Administration</p><h1 className="mt-2 text-3xl font-semibold">Admin Control Center</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Welcome, {name}. This is the separate administrative workspace for platform operations, trust, finance and configuration.</p></div><ShieldCheck className="hidden sm:block" size={38}/></div></div><section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">{cards.map(({title,description,href,icon:Icon}) => <Link key={href} href={href} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:bg-[var(--background)]"><div className="flex items-center justify-between"><Icon size={21}/><ArrowRight size={17} className="text-[var(--muted)] transition group-hover:translate-x-1"/></div><h2 className="mt-6 font-semibold">{title}</h2><p className="mt-2 text-sm text-[var(--muted)]">{description}</p></Link>)}</section><section className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><ShoppingCart size={20}/><p className="mt-4 text-sm font-semibold">Commerce</p><p className="mt-1 text-xs text-[var(--muted)]">Orders, listings and fulfillment controls remain connected to the authoritative commerce engine.</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><Users size={20}/><p className="mt-4 text-sm font-semibold">Users & Trust</p><p className="mt-1 text-xs text-[var(--muted)]">Identity, moderation, reports and account operations remain centralized here.</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><BarChart3 size={20}/><p className="mt-4 text-sm font-semibold">Analytics</p><p className="mt-1 text-xs text-[var(--muted)]">Platform intelligence and operational metrics use the existing analytics architecture.</p></div></section></main>;
}

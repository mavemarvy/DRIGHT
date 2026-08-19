"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  Compass,
  Heart,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = { username: string | null; full_name: string | null };
type Count = { orders: number; favorites: number; notifications: number; messages: number };
type StatCard = [label: string, value: number, icon: LucideIcon, href: string];
type QuickCard = [title: string, text: string, href: string, icon: LucideIcon];

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile>({ username: null, full_name: null });
  const [counts, setCounts] = useState<Count>({ orders: 0, favorites: 0, notifications: 0, messages: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const [{ data: p }, orders, favorites, notifications, messages] = await Promise.all([
        supabase.from("profiles").select("username,full_name").eq("id", userId).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", userId),
        supabase.from("post_saves").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_user_id", userId),
      ]);

      setProfile(p ?? { username: null, full_name: null });
      setCounts({
        orders: orders.count ?? 0,
        favorites: favorites.count ?? 0,
        notifications: notifications.count ?? 0,
        messages: messages.count ?? 0,
      });
      setLoading(false);
    }
    load();
  }, [supabase]);

  const name = profile.full_name || profile.username || "there";
  const quick: QuickCard[] = [
    ["Explore marketplace", "Find products, services, courses, jobs and tasks.", "/marketplace", Compass],
    ["Open your buyer space", "Track purchases, saved items and activity.", "/buyer", ShoppingBag],
    ["Build & earn", "Explore vendor and affiliate capabilities.", "/vendor", Store],
  ];
  const stats: StatCard[] = [
    ["Orders", counts.orders, ShoppingBag, "/orders"],
    ["Saved", counts.favorites, Heart, "/favorites"],
    ["Notifications", counts.notifications, Bell, "/notifications"],
    ["Messages", counts.messages, MessageSquare, "/messages"],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--muted)]">Welcome back</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Good to see you, {name}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              DRIGHT brings discovery, commerce, learning, communities and earning into one account.
            </p>
          </div>
          <Link href="/marketplace" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--background)]">
            Explore marketplace <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value, Icon, href]) => (
          <Link href={href} key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:shadow-md">
            <Icon size={19} />
            <p className="mt-5 text-sm text-[var(--muted)]">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{loading ? "—" : value}</p>
          </Link>
        ))}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Your ecosystem</p>
            <h2 className="mt-1 text-2xl font-semibold">Choose what to do next</h2>
          </div>
          <Sparkles size={20} />
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {quick.map(([title, text, href, Icon]) => (
            <Link href={href} key={href} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:-translate-y-0.5 hover:shadow-md">
              <Icon size={22} />
              <h3 className="mt-6 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
                Open <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-center gap-3"><Users size={20} /><h3 className="font-semibold">One account, many possibilities</h3></div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Start as a buyer, then activate vendor, affiliate, creator and other capabilities when eligible. Role switching remains governed by DRIGHT permissions and platform rules.</p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-center gap-3"><Wallet size={20} /><h3 className="font-semibold">Your activity becomes intelligence</h3></div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Searches, browsing, saves and purchases can progressively improve recommendations while respecting the privacy and RLS boundaries of your account.</p>
        </article>
      </section>
    </div>
  );
}

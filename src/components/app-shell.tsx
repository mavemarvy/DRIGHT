"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, BookOpen, ChevronLeft, ChevronRight, CircleDollarSign, Compass, Heart, HelpCircle, Home, Languages, LogOut, Menu, MessageSquare, Search, Settings, ShoppingBag, Sparkles, Store, UserRound, Users, Wallet, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const primary = [["Dashboard", "/dashboard", Home], ["Marketplace", "/marketplace", Compass], ["Notifications", "/notifications", Bell]] as const;
const account = [["Profile", "/profile", UserRound], ["Referral", "/referral", Users], ["Wallet", "/wallet", Wallet], ["Orders", "/orders", ShoppingBag], ["Favorites", "/favorites", Heart], ["Messages", "/messages", MessageSquare]] as const;
const growth = [["Affiliate Center", "/affiliate", CircleDollarSign], ["Vendor Center", "/vendor", Store], ["Buyer Dashboard", "/buyer", ShoppingBag], ["Learning", "/learning", BookOpen], ["DRIGHT Gen.ai", "/gen-ai", Sparkles]] as const;

type NavItemType = readonly [string, string, any];
function NavItem({ item, collapsed, onNavigate }: { item: NavItemType; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [label, href, Icon] = item;
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  return <Link href={href} onClick={onNavigate} title={collapsed ? label : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-[var(--primary)] text-[var(--background)]" : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"} ${collapsed ? "justify-center" : ""}`}><Icon size={18} /><span className={collapsed ? "sr-only" : ""}>{label}</span></Link>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  async function signOut() { await supabase.auth.signOut(); router.replace("/"); }
  const all = [...primary, ...account, ...growth] as NavItemType[];
  const sidebar = <aside className={`${collapsed ? "w-[76px]" : "w-[260px]"} hidden shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-4 transition-all lg:flex lg:flex-col`}>
    <div className={`flex h-12 items-center ${collapsed ? "justify-center" : "justify-between"} px-2`}><Link href="/dashboard" className="text-xl font-bold tracking-tight">{collapsed ? "D" : "DRIGHT"}</Link>{!collapsed && <button onClick={() => setCollapsed(true)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--background)]"><ChevronLeft size={18} /></button>}</div>
    {collapsed && <button onClick={() => setCollapsed(false)} className="mb-4 rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--background)]" title="Expand"><ChevronRight size={18} className="mx-auto" /></button>}
    <nav className="mt-3 flex-1 space-y-1 overflow-y-auto"><div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{!collapsed && "Main"}</div>{primary.map((item) => <NavItem key={item[1]} item={item} collapsed={collapsed} />)}<div className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{!collapsed && "Your DRIGHT"}</div>{account.map((item) => <NavItem key={item[1]} item={item} collapsed={collapsed} />)}<div className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{!collapsed && "Build & Earn"}</div>{growth.map((item) => <NavItem key={item[1]} item={item} collapsed={collapsed} />)}</nav>
    <div className="space-y-1 border-t border-[var(--border)] pt-3"><NavItem item={["Settings", "/settings", Settings]} collapsed={collapsed} /><NavItem item={["Help", "/help", HelpCircle]} collapsed={collapsed} /><button onClick={signOut} title={collapsed ? "Logout" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] ${collapsed ? "justify-center" : ""}`}><LogOut size={18} /><span className={collapsed ? "sr-only" : ""}>Logout</span></button></div>
  </aside>;
  return <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]"><div className="lg:hidden">{mobileOpen && <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setMobileOpen(false)}><aside onClick={(e) => e.stopPropagation()} className="h-full w-[290px] overflow-y-auto bg-[var(--surface)] p-4 shadow-xl"><div className="flex items-center justify-between px-2"><Link href="/dashboard" onClick={() => setMobileOpen(false)} className="text-xl font-bold">DRIGHT</Link><button onClick={() => setMobileOpen(false)}><X /></button></div><nav className="mt-6 space-y-1">{all.map((item) => <NavItem key={item[1]} item={item} collapsed={false} onNavigate={() => setMobileOpen(false)} />)}<div className="my-4 border-t border-[var(--border)]" /><NavItem item={["Settings", "/settings", Settings]} collapsed={false} onNavigate={() => setMobileOpen(false)} /><NavItem item={["Help", "/help", HelpCircle]} collapsed={false} onNavigate={() => setMobileOpen(false)} /><button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted)]"><LogOut size={18} />Logout</button></nav></aside></div>}</div>{sidebar}<div className="min-w-0 flex-1"><header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/90 px-4 backdrop-blur sm:px-6"><button className="rounded-xl p-2 hover:bg-[var(--surface)] lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><Link href="/marketplace" className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"><Search size={17} /><span className="truncate">Search products, services, courses, jobs and tasks...</span></Link><button className="rounded-xl p-2 text-[var(--muted)] hover:bg-[var(--surface)]" title="Language"><Languages size={19} /></button><Link href="/notifications" className="rounded-xl p-2 text-[var(--muted)] hover:bg-[var(--surface)]"><Bell size={19} /></Link><Link href="/profile" className="hidden rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium sm:block">Profile</Link></header><main>{children}</main></div></div>;
}

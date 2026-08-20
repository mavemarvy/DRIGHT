"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, DollarSign, FileText, LayoutDashboard, ListChecks, LogOut, Menu, Megaphone, Search, Settings, ShieldCheck, Users, X, FileEdit, Gavel, UserCog, Palette, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const nav = [
  ["Overview", "/admin", LayoutDashboard, "admin.dashboard.view"],
  ["Listings & Reviews", "/admin/listings", ListChecks, "listings.review"],
  ["Moderation", "/admin/moderation", Gavel, "moderation.manage"],
  ["CMS", "/admin/cms", FileEdit, "cms.view"],
  ["Administrators", "/admin/administrators", UserCog, "admins.manage"],
  ["Roles & Permissions", "/admin/roles", ShieldCheck, "roles.manage"],
  ["Themes", "/admin/themes", Palette, "themes.manage"],
  ["Audit Log", "/admin/audit", ClipboardList, "audit.view"],
  ["Promotions & Advertising", "/admin/promotions", Megaphone, "promotions.manage"],
  ["Feature Control", "/admin/features", Settings, "features.manage"],
  ["ID Lookup", "/admin/ids", Search, "admin.dashboard.view"],
  ["Finance", "/admin/finance", DollarSign, "finance.manage"],
  ["Refunds & Disputes", "/admin/refunds", FileText, "refunds.manage"],
] as const;

type Item = readonly [string, string, any, string];

function AdminNavItem({ item, collapsed, onNavigate }: { item: Item; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [label, href, Icon] = item;
  const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
  return <Link href={href} onClick={onNavigate} title={collapsed ? label : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-[var(--primary)] text-[var(--background)]" : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"} ${collapsed ? "justify-center" : ""}`}><Icon size={18}/><span className={collapsed ? "sr-only" : ""}>{label}</span></Link>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [visibleNav, setVisibleNav] = useState<typeof nav>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login?next=/admin"); return; }
      const { data: canView } = await supabase.rpc("admin_has_permission", { p_permission: "admin.dashboard.view", p_user_id: user.id });
      if (!canView) { router.replace("/dashboard"); return; }
      const checks = await Promise.all(nav.map(async item => {
        const { data } = await supabase.rpc("admin_has_permission", { p_permission: item[3], p_user_id: user.id });
        return [item, !!data] as const;
      }));
      setVisibleNav(checks.filter(([, allowed]) => allowed).map(([item]) => item));
      setChecking(false);
    })();
  }, [router, supabase]);

  async function signOut() { await supabase.auth.signOut(); router.replace("/"); }
  if (checking) return <div className="flex min-h-screen items-center justify-center bg-[var(--background)] text-sm text-[var(--muted)]">Checking administrator access…</div>;

  const sidebar = <aside className={`${collapsed ? "w-[76px]" : "w-[260px]"} hidden shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-4 transition-all lg:flex lg:flex-col`}>
    <div className={`flex h-12 items-center ${collapsed ? "justify-center" : "justify-between"} px-2`}><Link href="/admin" className="text-xl font-bold tracking-tight">{collapsed ? "A" : "DRIGHT Admin"}</Link>{!collapsed && <button onClick={() => setCollapsed(true)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--background)]"><ChevronLeft size={18}/></button>}</div>
    {collapsed && <button onClick={() => setCollapsed(false)} className="mb-4 rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--background)]" title="Expand"><ChevronRight size={18} className="mx-auto"/></button>}
    <div className={`mb-3 mt-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3`}><div className="flex items-center gap-2"><ShieldCheck size={17}/>{!collapsed && <div><p className="text-xs font-semibold">Administrator</p><p className="text-[10px] text-[var(--muted)]">Permission-aware control space</p></div>}</div></div>
    <nav className="flex-1 space-y-1 overflow-y-auto">{!collapsed && <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Control Center</div>}{visibleNav.map(item => <AdminNavItem key={item[1]} item={item} collapsed={collapsed}/>)}</nav>
    <div className="space-y-1 border-t border-[var(--border)] pt-3"><Link href="/dashboard" title={collapsed ? "Return to DRIGHT" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] ${collapsed ? "justify-center" : ""}`}><Users size={18}/><span className={collapsed ? "sr-only" : ""}>Return to DRIGHT</span></Link><button onClick={signOut} title={collapsed ? "Logout" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--background)] ${collapsed ? "justify-center" : ""}`}><LogOut size={18}/><span className={collapsed ? "sr-only" : ""}>Logout</span></button></div>
  </aside>;

  return <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]"><div className="lg:hidden">{mobileOpen && <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setMobileOpen(false)}><aside onClick={e => e.stopPropagation()} className="h-full w-[290px] overflow-y-auto bg-[var(--surface)] p-4 shadow-xl"><div className="flex items-center justify-between px-2"><Link href="/admin" onClick={() => setMobileOpen(false)} className="text-xl font-bold">DRIGHT Admin</Link><button onClick={() => setMobileOpen(false)}><X/></button></div><nav className="mt-6 space-y-1">{visibleNav.map(item => <AdminNavItem key={item[1]} item={item} collapsed={false} onNavigate={() => setMobileOpen(false)}/>)}</nav><div className="my-4 border-t border-[var(--border)]"/><Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--muted)]"><Users size={18}/>Return to DRIGHT</Link></aside></div>}</div>{sidebar}<div className="min-w-0 flex-1"><header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/90 px-4 backdrop-blur sm:px-6"><button className="rounded-xl p-2 hover:bg-[var(--surface)] lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div className="flex min-w-0 flex-1 items-center gap-2"><ShieldCheck size={18}/><span className="font-semibold">DRIGHT Admin Panel</span></div><Link href="/dashboard" className="hidden rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] sm:block">User Space</Link></header><main>{children}</main></div></div>;
}

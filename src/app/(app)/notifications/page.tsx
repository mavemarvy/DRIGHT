"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, ChevronDown, Filter, Loader2, Settings2, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NotificationCard, type Notification } from "@/components/notification-card";

type FilterKey = "all" | "unread" | "read";
type CategoryKey = "all" | "orders" | "payments" | "referrals" | "affiliate" | "vendor" | "followers" | "messages" | "jobs" | "campaigns" | "security" | "admin" | "support" | "ai" | "recommendations";
type PreferenceRow = { user_id: string; category_preferences: Record<string, boolean> | null; in_app_notifications: boolean; email_notifications: boolean; push_notifications: boolean };

const categories: Array<{ key: CategoryKey; label: string; matches: (n: Notification) => boolean }> = [
  { key: "all", label: "All", matches: () => true },
  { key: "orders", label: "Orders", matches: (n) => `${n.category ?? ""} ${n.notification_type} ${n.entity_type ?? ""}`.toLowerCase().includes("order") },
  { key: "payments", label: "Payments", matches: (n) => `${n.category ?? ""} ${n.notification_type}`.toLowerCase().includes("payment") || `${n.category ?? ""}`.toLowerCase().includes("finance") },
  { key: "referrals", label: "Referrals", matches: (n) => `${n.category ?? ""} ${n.notification_type}`.toLowerCase().includes("referral") || `${n.notification_type}`.toLowerCase().includes("reward") },
  { key: "affiliate", label: "Affiliate", matches: (n) => `${n.category ?? ""} ${n.notification_type}`.toLowerCase().includes("affiliate") || `${n.notification_type}`.toLowerCase().includes("commission") },
  { key: "vendor", label: "Vendor", matches: (n) => `${n.category ?? ""} ${n.notification_type} ${n.entity_type ?? ""}`.toLowerCase().includes("vendor") },
  { key: "followers", label: "Followers", matches: (n) => ["follow", "follower"].some((v) => n.notification_type.toLowerCase().includes(v)) },
  { key: "messages", label: "Messages", matches: (n) => n.notification_type.toLowerCase().includes("message") || n.entity_type === "conversation" },
  { key: "jobs", label: "Jobs", matches: (n) => `${n.category ?? ""} ${n.notification_type} ${n.entity_type ?? ""}`.toLowerCase().includes("job") },
  { key: "campaigns", label: "Campaigns", matches: (n) => `${n.category ?? ""} ${n.notification_type} ${n.entity_type ?? ""}`.toLowerCase().includes("campaign") || `${n.category ?? ""}`.toLowerCase().includes("promotion") },
  { key: "security", label: "Security", matches: (n) => `${n.category ?? ""} ${n.notification_type}`.toLowerCase().includes("security") },
  { key: "admin", label: "Admin", matches: (n) => `${n.category ?? ""} ${n.notification_type}`.toLowerCase().includes("admin") },
  { key: "support", label: "Support", matches: (n) => `${n.category ?? ""} ${n.notification_type} ${n.entity_type ?? ""}`.toLowerCase().includes("support") },
  { key: "ai", label: "AI", matches: (n) => `${n.category ?? ""} ${n.notification_type}`.toLowerCase().includes("ai") },
  { key: "recommendations", label: "Recommendations", matches: (n) => `${n.category ?? ""} ${n.notification_type}`.toLowerCase().includes("recommend") },
];

const PAGE_SIZE = 40;
const preferenceKeys = categories.filter((category) => category.key !== "all");

function groupLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((start - day) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return "Earlier";
}

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [priority, setPriority] = useState("all");
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<PreferenceRow | null>(null);
  const [preferenceSaving, setPreferenceSaving] = useState(false);

  const loadNotifications = useCallback(async (reset = true) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    setError("");
    const from = reset ? 0 : rows.length;
    const to = from + PAGE_SIZE - 1;
    const { data, error: fetchError } = await supabase
      .from("notifications")
      .select("id,public_id,notification_type,category,title,body,entity_type,entity_id,is_read,read_at,action_url,priority,created_at")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      const next = (data ?? []) as Notification[];
      setRows((current) => reset ? next : [...current, ...next.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setHasMore(next.length === PAGE_SIZE);
    }
    if (reset) {
      const { count, error: countError } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false);
      if (!countError) setUnreadCount(count ?? 0);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [rows.length, supabase]);

  const loadPreferences = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error: preferenceError } = await supabase.from("crm_contact_preferences").select("user_id,category_preferences,in_app_notifications,email_notifications,push_notifications").eq("user_id", user.id).maybeSingle();
    if (!preferenceError && data) setPreferences(data as PreferenceRow);
  }, [supabase]);

  useEffect(() => {
    void loadNotifications(true);
    void loadPreferences();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active || !user) { if (active) setLoading(false); return; }
      channel = supabase
        .channel(`notifications-center:${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
          if (!active) return;
          const next = payload.new as Notification;
          setRows((current) => current.some((item) => item.id === next.id) ? current : [next, ...current]);
          if (!next.is_read) setUnreadCount((count) => count + 1);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
          if (!active) return;
          const next = payload.new as Notification;
          const previous = payload.old as Notification;
          setRows((current) => current.map((item) => item.id === next.id ? { ...item, ...next } : item));
          if (previous.is_read !== next.is_read) setUnreadCount((count) => Math.max(0, count + (next.is_read ? -1 : 1)));
        })
        .subscribe();
    });
    return () => { active = false; if (channel) void supabase.removeChannel(channel); };
  }, [loadNotifications, loadPreferences, supabase]);

  const changeReadState = async (id: string, read: boolean) => {
    setError("");
    const previous = rows.find((row) => row.id === id);
    if (!previous || previous.is_read === read) return;
    const readAt = read ? new Date().toISOString() : null;
    setRows((current) => current.map((row) => row.id === id ? { ...row, is_read: read, read_at: readAt } : row));
    setUnreadCount((count) => Math.max(0, count + (read ? -1 : 1)));
    const { error: updateError } = await supabase.from("notifications").update({ is_read: read, read_at: readAt }).eq("id", id);
    if (updateError) {
      setRows((current) => current.map((row) => row.id === id ? previous : row));
      setUnreadCount((count) => Math.max(0, count + (read ? 1 : -1)));
      setError(updateError.message);
    }
  };

  const markAllRead = async () => {
    if (!unreadCount) return;
    const previous = rows;
    setRows((current) => current.map((row) => row.is_read ? row : { ...row, is_read: true, read_at: new Date().toISOString() }));
    setUnreadCount(0);
    const { error: updateError } = await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("is_read", false);
    if (updateError) { setRows(previous); void loadNotifications(true); setError(updateError.message); }
  };

  const updatePreference = async (key: CategoryKey, enabled: boolean) => {
    if (!preferences) return;
    setPreferenceSaving(true);
    const next = { ...(preferences.category_preferences ?? {}), [key]: enabled };
    const { error: updateError } = await supabase.from("crm_contact_preferences").update({ category_preferences: next }).eq("user_id", preferences.user_id);
    if (updateError) setError(updateError.message); else setPreferences({ ...preferences, category_preferences: next });
    setPreferenceSaving(false);
  };

  const updateChannelPreference = async (field: "in_app_notifications" | "email_notifications" | "push_notifications", enabled: boolean) => {
    if (!preferences || field === "in_app_notifications" && !enabled) return;
    setPreferenceSaving(true);
    const { error: updateError } = await supabase.from("crm_contact_preferences").update({ [field]: enabled }).eq("user_id", preferences.user_id);
    if (updateError) setError(updateError.message); else setPreferences({ ...preferences, [field]: enabled });
    setPreferenceSaving(false);
  };

  const visibleRows = rows.filter((notification) => {
    const readMatch = filter === "all" || (filter === "unread" ? !notification.is_read : notification.is_read);
    const categoryMatch = categories.find((item) => item.key === category)?.matches(notification) ?? true;
    const priorityMatch = priority === "all" || (notification.priority ?? "normal").toLowerCase() === priority;
    return readMatch && categoryMatch && priorityMatch;
  });

  const grouped = visibleRows.reduce<Record<string, Notification[]>>((acc, notification) => {
    const key = groupLabel(notification.created_at);
    (acc[key] ??= []).push(notification);
    return acc;
  }, {});

  const todayCount = rows.filter((row) => groupLabel(row.created_at) === "Today").length;
  const importantCount = rows.filter((row) => ["critical", "high"].includes((row.priority ?? "").toLowerCase())).length;
  const categoryHasRows = (key: CategoryKey) => key === "all" || rows.some((row) => categories.find((item) => item.key === key)?.matches(row));

  return (
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Communication center</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Keep orders, payments, social activity, messages, support and account events together without notification noise.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowPreferences((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]" aria-expanded={showPreferences}><Settings2 size={16}/> Preferences</button>
          <button type="button" onClick={() => void markAllRead()} disabled={!unreadCount} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-[var(--primary-contrast)] disabled:cursor-not-allowed disabled:opacity-45"><CheckCheck size={16}/> Mark all read</button>
        </div>
      </header>

      {error && <div role="alert" className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-600">{error}</div>}

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><p className="text-xs text-[var(--muted)]">Unread</p><p className="mt-1 text-2xl font-semibold">{unreadCount}</p><p className="mt-1 text-xs text-[var(--muted)]">Server-authoritative count</p></div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><p className="text-xs text-[var(--muted)]">Today</p><p className="mt-1 text-2xl font-semibold">{todayCount}</p><p className="mt-1 text-xs text-[var(--muted)]">From the loaded notification history</p></div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><p className="text-xs text-[var(--muted)]">Important</p><p className="mt-1 text-2xl font-semibold">{importantCount}</p><p className="mt-1 text-xs text-[var(--muted)]">Only records carrying high or critical priority</p></div>
      </section>

      {showPreferences && <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">Notification preferences</h2><p className="mt-1 text-sm text-[var(--muted)]">These controls use DRIGHT&apos;s existing contact-preference record. Security-critical delivery remains enabled.</p></div>{preferenceSaving && <Loader2 size={17} className="animate-spin text-[var(--muted)]" aria-label="Saving"/>}</div>
        {preferences ? <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(["in_app_notifications", "email_notifications", "push_notifications"] as const).map((field) => <label key={field} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 text-sm"><span className="capitalize">{field.replace("_notifications", "").replace("_", " ")}</span><input type="checkbox" checked={preferences[field]} disabled={field === "in_app_notifications"} onChange={(event) => void updateChannelPreference(field, event.target.checked)} className="h-4 w-4 accent-[var(--accent)]" aria-label={`${field.replace("_notifications", "")} notifications`}/></label>)}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {preferenceKeys.map(({ key, label }) => <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3 text-sm"><span>{label}</span><input type="checkbox" checked={preferences.category_preferences?.[key] !== false} onChange={(event) => void updatePreference(key, event.target.checked)} className="h-4 w-4 accent-[var(--accent)]" aria-label={`${label} notifications`}/></label>)}
          </div>
        </> : <p className="mt-4 rounded-xl bg-[var(--background)] p-3 text-sm text-[var(--muted)]">No contact-preference record is available for this account yet. The Notification Center will continue using the existing notification engine without fabricating preference state.</p>}
      </section>}

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Notification status filters">
            {(["all", "unread", "read"] as FilterKey[]).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium ${filter === value ? "bg-[var(--primary)] text-[var(--primary-contrast)]" : "text-[var(--muted)] hover:bg-[var(--surface-muted)]"}`}>{value === "all" ? "All" : value === "unread" ? `Unread ${unreadCount ? `(${unreadCount})` : ""}` : "Read"}</button>)}
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="notification-priority">Priority</label>
            <SlidersHorizontal size={15} className="text-[var(--muted)]" aria-hidden="true"/>
            <select id="notification-priority" value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--focus)]/30"><option value="all">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 overflow-x-auto border-t border-[var(--border)] pt-3" aria-label="Notification categories">
          <Filter size={15} className="shrink-0 text-[var(--muted)]" aria-hidden="true"/>
          {categories.map((item) => <button key={item.key} type="button" onClick={() => setCategory(item.key)} aria-pressed={category === item.key} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${category === item.key ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-contrast)]" : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-muted)]"}`}>{item.label}{item.key !== "all" && categoryHasRows(item.key) === false ? " · 0" : ""}</button>)}
        </div>
      </section>

      <section className="mt-5 space-y-6" aria-live="polite">
        {loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"/>)}</div> : visibleRows.length ? Object.entries(grouped).map(([group, items]) => <div key={group}><div className="mb-2 flex items-center gap-3"><h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">{group}</h2><span className="h-px flex-1 bg-[var(--border)]"/></div><div className="space-y-2">{items.map((notification) => <NotificationCard key={notification.id} notification={notification} onReadChange={(id, read) => void changeReadState(id, read)}/>)}</div></div>) : <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center"><Bell size={32} className="mx-auto text-[var(--muted)]" aria-hidden="true"/><h2 className="mt-4 font-semibold">{rows.length ? "No notifications match these filters" : "You&apos;re all caught up"}</h2><p className="mx-auto mt-1 max-w-md px-4 text-sm leading-6 text-[var(--muted)]">{rows.length ? "Try another category, status or priority." : "Real platform activity will appear here as DRIGHT generates notifications for your account."}</p>{rows.length > 0 && <button type="button" onClick={() => { setFilter("all"); setCategory("all"); setPriority("all"); }} className="mt-4 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium">Clear filters</button>}</div>}
        {!loading && hasMore && <div className="flex justify-center"><button type="button" onClick={() => void loadNotifications(false)} disabled={loadingMore} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-50">{loadingMore && <Loader2 size={15} className="animate-spin"/>}{loadingMore ? "Loading history…" : "Load more history"}<ChevronDown size={15}/></button></div>}
      </section>

      <footer className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted)]"><span>Notifications are protected by the current authenticated data access policies.</span><Link href="/settings" className="font-medium underline underline-offset-2">Account settings</Link></footer>
    </main>
  );
}

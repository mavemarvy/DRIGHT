"use client";

import Link from "next/link";
import { Bell, Check, CircleAlert, CreditCard, ExternalLink, Gift, Heart, MessageSquare, ShieldAlert, Sparkles, Store, Users } from "lucide-react";

type Notification = {
  id: string;
  notification_type: string;
  category?: string | null;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at?: string | null;
  action_url?: string | null;
  priority?: string | null;
  created_at: string;
};

const iconFor = (notification: Notification) => {
  const value = `${notification.category ?? ""} ${notification.notification_type}`.toLowerCase();
  if (value.includes("message")) return MessageSquare;
  if (value.includes("payment") || value.includes("finance")) return CreditCard;
  if (value.includes("referral") || value.includes("reward")) return Gift;
  if (value.includes("follow") || value.includes("social")) return Users;
  if (value.includes("reaction") || value.includes("like")) return Heart;
  if (value.includes("security")) return ShieldAlert;
  if (value.includes("ai")) return Sparkles;
  if (value.includes("vendor") || value.includes("marketplace")) return Store;
  if (value.includes("admin") || value.includes("system")) return CircleAlert;
  return Bell;
};

const safeHref = (href: string | null | undefined) => {
  if (!href || !href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return null;
  return href;
};

const entityHref = (notification: Notification) => {
  if (!notification.entity_id) return null;
  switch (notification.entity_type) {
    case "conversation": return `/messages/${encodeURIComponent(notification.entity_id)}`;
    case "order": return `/orders/${encodeURIComponent(notification.entity_id)}`;
    case "user":
    case "profile": return `/profile/${encodeURIComponent(notification.entity_id)}`;
    case "listing":
    case "marketplace_item": return `/marketplace/${encodeURIComponent(notification.entity_id)}`;
    case "referral": return "/referrals";
    case "commission": return "/affiliate/commissions";
    case "support_case": return "/support";
    default: return null;
  }
};

const relativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};

export function NotificationCard({ notification, onReadChange }: { notification: Notification; onReadChange: (id: string, read: boolean) => void }) {
  const Icon = iconFor(notification);
  const destination = safeHref(notification.action_url) ?? entityHref(notification);
  const priority = (notification.priority ?? "").toLowerCase();
  const priorityLabel = priority && priority !== "normal" ? priority : null;
  const content = (
    <>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] ${notification.is_read ? "opacity-60" : ""}`} aria-hidden="true">
        <Icon size={18} strokeWidth={notification.is_read ? 1.8 : 2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-semibold ${notification.is_read ? "text-[var(--foreground)]" : "text-[var(--foreground)]"}`}>{notification.title}</span>
          {!notification.is_read && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-label="Unread" />}
          {priorityLabel && <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--muted)]">{priorityLabel}</span>}
        </span>
        {notification.body && <span className="mt-1.5 block line-clamp-2 text-sm leading-5 text-[var(--muted)]">{notification.body}</span>}
        <span className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
          <span>{relativeTime(notification.created_at)}</span>
          {notification.category && <><span aria-hidden="true">·</span><span className="capitalize">{notification.category.replace(/[_-]/g, " ")}</span></>}
          {notification.entity_id && <><span aria-hidden="true">·</span><span className="font-mono">{notification.entity_id.length > 18 ? `${notification.entity_id.slice(0, 8)}…` : notification.entity_id}</span></>}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 self-center">
        {destination && <ExternalLink size={15} className="text-[var(--muted)]" aria-hidden="true" />}
        <button
          type="button"
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); onReadChange(notification.id, !notification.is_read); }}
          className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          aria-label={notification.is_read ? "Mark notification as unread" : "Mark notification as read"}
        >
          {notification.is_read ? <Bell size={15} /> : <Check size={15} />}
        </button>
      </span>
    </>
  );

  const className = `flex items-start gap-3 rounded-2xl border p-4 transition-colors ${notification.is_read ? "border-[var(--border)] bg-[var(--surface)]" : "border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-xs)]"} hover:bg-[var(--surface-muted)]`;
  if (destination) return <Link href={destination} onClick={() => { if (!notification.is_read) onReadChange(notification.id, true); }} className={className}>{content}</Link>;
  return <div className={className}>{content}</div>;
}

export type { Notification };

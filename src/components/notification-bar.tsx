"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function NotificationBar() {
  const supabase = useMemo(() => createClient(), []);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const loadCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false);
      if (active) setUnreadCount(count ?? 0);
      channel = supabase
        .channel(`notification-bar:${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
          if (active && (payload.new as { is_read?: boolean }).is_read === false) setUnreadCount((current) => current + 1);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
          if (!active) return;
          const next = payload.new as { is_read?: boolean };
          const previous = payload.old as { is_read?: boolean };
          if (previous.is_read !== next.is_read) setUnreadCount((current) => Math.max(0, current + (next.is_read ? -1 : 1)));
        })
        .subscribe();
    };

    void loadCount();
    return () => { active = false; if (channel) void supabase.removeChannel(channel); };
  }, [supabase]);

  return (
    <Link href="/notifications" className="relative rounded-[var(--radius-md)] p-2.5 text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} title="Notifications">
      <Bell size={19} aria-hidden="true" />
      {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-[var(--accent)] px-1 text-center text-[9px] font-bold leading-4 text-[var(--primary-contrast)]" aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </Link>
  );
}

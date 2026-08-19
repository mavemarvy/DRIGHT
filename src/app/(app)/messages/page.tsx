"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Conversation = { id: string; order_id: string | null; conversation_type: string; updated_at: string; };

export default function MessagesPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login?next=/messages"; return; }
      const { data, error } = await supabase.from("chat_participants").select("conversation_id,chat_conversations(id,order_id,conversation_type,updated_at)").eq("user_id", user.id);
      if (!active) return;
      if (error) setError(error.message);
      else setRows((data || []).map((x: any) => Array.isArray(x.chat_conversations) ? x.chat_conversations[0] : x.chat_conversations).filter(Boolean));
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">DRIGHT communication</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Messages</h1><p className="mt-2 text-sm text-[var(--muted)]">Order and support conversations stay connected to the relevant DRIGHT record.</p></div><Link href="/marketplace" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold"><Plus size={16}/> New conversation</Link></div>
    {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      {loading ? <div className="h-48 animate-pulse rounded-xl bg-[var(--background)]"/> : rows.length ? <div className="divide-y divide-[var(--border)]">{rows.map((row) => <Link key={row.id} href={`/messages/${row.id}`} className="flex items-center gap-4 py-4 first:pt-1 last:pb-1"><span className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)]"><MessageSquare size={19}/></span><span className="min-w-0 flex-1"><span className="block font-semibold">{row.order_id ? `Order ${row.order_id}` : row.conversation_type === "support" ? "DRIGHT Support" : "Conversation"}</span><span className="mt-1 block text-xs text-[var(--muted)]">Updated {new Date(row.updated_at).toLocaleString()}</span></span></Link>)}</div> : <div className="py-14 text-center"><MessageSquare size={30} className="mx-auto"/><h2 className="mt-4 font-semibold">No conversations yet</h2><p className="mt-1 text-sm text-[var(--muted)]">Start from an order, listing, vendor or support case.</p></div>}
    </section>
  </div>;
}

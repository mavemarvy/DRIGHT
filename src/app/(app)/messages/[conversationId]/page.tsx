"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Message = { id: string; sender_id: string; body: string; created_at: string; edited_at?: string | null; deleted_at?: string | null };
type Conversation = { id: string; order_id: string | null; conversation_type: string };

export default function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params);
  const supabase = createClient();
  const [userId, setUserId] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = `/login?next=/messages/${encodeURIComponent(conversationId)}`; return; }
      setUserId(user.id);
      const { data: member } = await supabase.from("chat_participants").select("conversation_id").eq("conversation_id", conversationId).eq("user_id", user.id).maybeSingle();
      if (!member) { setError("Conversation not found or access is not permitted."); setLoading(false); return; }
      const [{ data: c }, { data: m, error: messageError }] = await Promise.all([
        supabase.from("chat_conversations").select("id,order_id,conversation_type").eq("id", conversationId).maybeSingle(),
        supabase.from("chat_messages").select("id,sender_id,body,created_at,edited_at,deleted_at").eq("conversation_id", conversationId).is("deleted_at", null).order("created_at", { ascending: true }),
      ]);
      if (!active) return;
      if (messageError) setError(messageError.message); else setMessages((m || []) as Message[]);
      setConversation(c as Conversation | null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [conversationId]);

  useEffect(() => {
    const channel = supabase.channel(`chat:${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => setMessages((current) => current.some((m) => m.id === payload.new.id) ? current : [...current, payload.new as Message])).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault(); const text = body.trim(); if (!text || sending) return;
    setSending(true); setError("");
    const { error: sendError } = await supabase.from("chat_messages").insert({ conversation_id: conversationId, sender_id: userId, body: text });
    if (sendError) setError(sendError.message); else setBody("");
    setSending(false);
  }

  return <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl flex-col px-4 py-6 sm:px-6 lg:px-8">
    <Link href="/messages" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--muted)]"><ArrowLeft size={16}/> Messages</Link>
    <div className="mt-5 flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <header className="border-b border-[var(--border)] p-5"><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Conversation</p><h1 className="mt-1 text-xl font-semibold">{conversation?.order_id ? `Order ${conversation.order_id}` : conversation?.conversation_type === "support" ? "DRIGHT Support" : "Conversation"}</h1></header>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">{loading ? <div className="h-48 animate-pulse rounded-xl bg-[var(--background)]"/> : messages.length ? messages.map((m) => <div key={m.id} className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.sender_id === userId ? "bg-[var(--primary)] text-[var(--background)]" : "border border-[var(--border)]"}`}><p className="whitespace-pre-wrap break-words">{m.body}</p><p className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleString()}</p></div></div>) : <div className="grid h-full place-items-center py-20 text-center text-sm text-[var(--muted)]">No messages yet. Send the first message.</div>}<div ref={bottom}/></div>
      {error && <div className="border-t border-[var(--border)] px-5 py-3 text-sm text-red-600">{error}</div>}
      <form onSubmit={sendMessage} className="flex gap-3 border-t border-[var(--border)] p-4"><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={10000} placeholder="Write a message…" className="min-w-0 flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none"/><button disabled={sending || !body.trim()} className="self-end inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold disabled:opacity-50"><Send size={16}/>{sending ? "Sending" : "Send"}</button></form>
    </div>
  </div>;
}

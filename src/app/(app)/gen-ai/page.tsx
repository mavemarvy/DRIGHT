"use client";

import { FormEvent, useState } from "react";
import { Bot, Copy, RefreshCw, Send, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";

type ChatMessage = { id?: string; role: "user" | "assistant"; content: string };

export default function GenAIPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [task, setTask] = useState("assistant");
  const [error, setError] = useState("");

  async function sendMessage() {
    const value = input.trim();
    if (!value || loading) return;
    setError("");
    setInput("");
    setMessages((current) => [...current, { role: "user", content: value }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, task, conversationId }),
      });
      const data: { conversationId?: string; messageId?: string; response?: string; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");
      setConversationId(data.conversationId || conversationId);
      setMessages((current) => [
        ...current,
        { id: data.messageId, role: "assistant", content: data.response || "" },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage();
  }

  async function feedback(id: string | undefined, rating: 1 | -1) {
    if (!id) return;
    await fetch("/api/ai/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: id, rating }),
    });
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--primary)] text-[var(--primary-contrast)]">
            <Sparkles size={21} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">DRIGHT Gen.ai</p>
            <h1 className="text-xl font-semibold">Your DRIGHT AI assistant</h1>
          </div>
        </div>
        <select value={task} onChange={(event) => setTask(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none">
          <option value="assistant">General assistant</option>
          <option value="support">Customer support</option>
          <option value="search">Marketplace search</option>
          <option value="seller">Vendor assistant</option>
          <option value="affiliate">Affiliate assistant</option>
          <option value="creator">Creator assistant</option>
        </select>
      </div>

      <section className="flex-1 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="grid min-h-[55vh] place-items-center text-center">
            <div className="max-w-xl">
              <Bot size={38} className="mx-auto mb-5" />
              <h2 className="text-2xl font-semibold">Ask DRIGHT anything</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                I can help with marketplace discovery, orders, support, vendor and affiliate workflows, creator ideas and other authorized DRIGHT tasks.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setInput("Help me find a product for my business")} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm">Find a product</button>
                <button type="button" onClick={() => setInput("Explain my recent order")} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm">Explain an order</button>
                <button type="button" onClick={() => setInput("Give me ideas for promoting a DRIGHT listing")} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm">Promotion ideas</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message, index) => (
              <div key={`${index}-${message.id || "message"}`} className={message.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[90%]"}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-[var(--primary)] text-[var(--primary-contrast)]" : "border border-[var(--border)] bg-[var(--background)]"}`}>
                  {message.content}
                </div>
                {message.role === "assistant" && (
                  <div className="mt-2 flex gap-1">
                    <button type="button" onClick={() => navigator.clipboard?.writeText(message.content)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface)]" title="Copy" aria-label="Copy response"><Copy size={14} /></button>
                    <button type="button" onClick={() => feedback(message.id, 1)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface)]" title="Helpful" aria-label="Helpful"><ThumbsUp size={14} /></button>
                    <button type="button" onClick={() => feedback(message.id, -1)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface)]" title="Not helpful" aria-label="Not helpful"><ThumbsDown size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {loading && <div className="mt-5 flex items-center gap-2 text-sm text-[var(--muted)]"><RefreshCw size={15} className="animate-spin" /> DRIGHT AI is thinking…</div>}
        {error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">{error}</p>}
      </section>

      <form onSubmit={submit} className="mt-4 flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">
        <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Ask DRIGHT AI…" rows={2} maxLength={12000} className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none" />
        <button type="submit" disabled={loading || !input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-[var(--primary-contrast)] disabled:opacity-40" aria-label="Send"><Send size={17} /></button>
      </form>
    </main>
  );
}

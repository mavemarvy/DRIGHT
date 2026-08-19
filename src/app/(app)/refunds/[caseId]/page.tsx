"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, ShieldAlert } from "lucide-react";
import { use } from "react";
import { createClient } from "@/lib/supabase/client";

type CaseRow = { id: string; case_id: string; transaction_id: string; reporter_user_id: string; reason_type: string; reason: string; evidence: any; status: string; resolution_notes?: string | null; vendor_response?: string | null; created_at: string; updated_at: string; };

export default function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params); const supabase = createClient();
  const [row, setRow] = useState<CaseRow | null>(null); const [userId, setUserId] = useState(""); const [isSeller, setIsSeller] = useState(false); const [response, setResponse] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) { window.location.href = `/login?next=/refunds/${encodeURIComponent(caseId)}`; return; } setUserId(user.id);
    const { data, error: e } = await supabase.from("refund_disputes").select("id,case_id,transaction_id,reporter_user_id,reason_type,reason,evidence,status,resolution_notes,vendor_response,created_at,updated_at").eq("case_id", caseId).maybeSingle();
    if (e || !data) { setError(e?.message || "Case not found or access is not permitted."); return; } setRow(data as CaseRow); setResponse(data.vendor_response || "");
    const { data: tx } = await supabase.from("transactions").select("order_id").eq("id", data.transaction_id).maybeSingle();
    if (tx?.order_id) { const { data: item } = await supabase.from("order_items").select("id").eq("order_id", tx.order_id).eq("seller_user_id", user.id).limit(1).maybeSingle(); setIsSeller(Boolean(item)); }
  }
  useEffect(() => { load(); }, [caseId]);

  async function submitVendorResponse(e: React.FormEvent) { e.preventDefault(); if (!response.trim()) return; setBusy(true); setError(""); const { error: e2 } = await supabase.rpc("vendor_respond_refund_dispute", { p_case_id: caseId, p_response: response.trim() }); if (e2) setError(e2.message); else await load(); setBusy(false); }

  if (error && !row) return <div className="mx-auto max-w-xl px-4 py-16 text-center"><ShieldAlert size={34} className="mx-auto"/><h1 className="mt-5 text-2xl font-semibold">Unable to open case</h1><p className="mt-3 text-sm text-[var(--muted)]">{error}</p><Link href="/orders" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold"><ArrowLeft size={16}/> Orders</Link></div>;

  return <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8"><Link href="/orders" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Orders</Link><div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-3"><ShieldAlert size={21}/><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Refund / dispute case</p><h1 className="mt-1 text-2xl font-semibold">{row?.case_id || caseId}</h1></div></div>{row && <><div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-[var(--border)] px-3 py-1.5 font-semibold">{row.reason_type.replaceAll("_", " ")}</span><span className="rounded-full border border-[var(--border)] px-3 py-1.5 font-semibold">{row.status.replaceAll("_", " ")}</span></div><section className="mt-6 rounded-xl border border-[var(--border)] p-5"><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Customer statement</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{row.reason}</p></section>{row.vendor_response && <section className="mt-5 rounded-xl border border-[var(--border)] p-5"><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Vendor response</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{row.vendor_response}</p></section>}{isSeller && <form onSubmit={submitVendorResponse} className="mt-5 rounded-xl border border-[var(--border)] p-5"><div className="flex items-center gap-2"><MessageSquare size={18}/><h2 className="font-semibold">Vendor response</h2></div><p className="mt-2 text-sm text-[var(--muted)]">Provide evidence or explain the fulfillment/refund position. This does not make the financial decision.</p><textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={6} maxLength={10000} className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm outline-none" placeholder="Your response to the case…"/><button disabled={busy || !response.trim()} className="mt-3 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy ? "Saving…" : "Submit vendor response"}</button></form>}{error && <p className="mt-4 text-sm text-red-600">{error}</p>}<div className="mt-6 border-t border-[var(--border)] pt-5 text-xs text-[var(--muted)]">Opened {new Date(row.created_at).toLocaleString()} · Updated {new Date(row.updated_at).toLocaleString()}</div></>}</div></div>;
}

"use client";

import { useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Result={universal_id:string;entity_type:string;source_table:string;source_id:string;status:string};

export default function AdminIdsPage(){
  const [q,setQ]=useState(""); const [rows,setRows]=useState<Result[]>([]); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function search(){
    setBusy(true);setError("");
    const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setError("Authentication required.");setBusy(false);return;}
    const {data:isAdmin}=await supabase.rpc("is_super_admin",{check_user_id:user.id});
    if(!isAdmin){setError("Access restricted.");setBusy(false);return;}
    const {data,error}=await supabase.rpc("search_universal_entities",{p_query:q.trim(),p_limit:100});
    if(error)setError(error.message); else setRows((data||[]) as Result[]);
    setBusy(false);
  }
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
      <div className="flex items-start gap-3"><ShieldCheck size={24}/><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Universal ID System</p><h1 className="mt-1 text-2xl font-semibold">ID Lookup</h1><p className="mt-2 text-sm text-[var(--muted)]">Resolve stable DRIGHT IDs, internal source IDs and entity types from one administrative search.</p></div></div>
      <form onSubmit={e=>{e.preventDefault();search()}} className="mt-6 flex gap-2"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search DR-ORD-..., DR-USR-..., UUID..." className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"/><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--background)] disabled:opacity-50"><Search size={17}/>{busy?"Searching…":"Search"}</button></form>
      {error&&<p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm">{error}</p>}
    </div>
    <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="grid grid-cols-[1.2fr_.8fr_1fr_.8fr] gap-3 border-b border-[var(--border)] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]"><span>Universal ID</span><span>Type</span><span>Source</span><span>Status</span></div>
      {rows.length===0?<div className="p-8 text-center text-sm text-[var(--muted)]">No results yet.</div>:rows.map(r=><div key={`${r.source_table}:${r.source_id}`} className="grid grid-cols-[1.2fr_.8fr_1fr_.8fr] gap-3 border-b border-[var(--border)] px-4 py-3 text-sm last:border-b-0"><span className="font-semibold">{r.universal_id}</span><span>{r.entity_type}</span><span className="truncate text-[var(--muted)]">{r.source_table}:{r.source_id}</span><span>{r.status}</span></div>)}
    </div>
  </main>;
}

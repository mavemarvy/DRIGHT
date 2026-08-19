"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Clock3, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Feature, FeatureStatus } from "@/lib/features";

const STATUS: { value: FeatureStatus; label: string; description: string }[] = [
  { value: "enabled", label: "Enabled", description: "Visible and usable." },
  { value: "disabled", label: "Disabled", description: "Hidden from normal users." },
  { value: "coming_soon", label: "Coming soon", description: "Visible as unfinished, not usable." },
  { value: "hidden", label: "Hidden", description: "Not discoverable or shown." },
];

export default function FeatureControlPage() {
  const supabase = createClient();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login?next=/admin/features"; return; }
    const { data: isAdmin, error: adminError } = await supabase.rpc("is_super_admin", { check_user_id: user.id });
    if (adminError || !isAdmin) { setError("You do not have permission to manage platform features."); setLoading(false); return; }
    setAllowed(true);
    const { data, error: featureError } = await supabase.from("feature_registry").select("feature_id,feature_key,display_name,status,searchable,discoverable,config").order("display_name");
    if (featureError) setError(featureError.message); else setFeatures((data ?? []) as Feature[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function changeStatus(feature: Feature, status: FeatureStatus) {
    if (status === feature.status) return;
    setSaving(feature.feature_key);
    setError("");
    const { data, error: updateError } = await supabase.rpc("set_feature_status", {
      p_feature_key: feature.feature_key,
      p_status: status,
      p_visible: status !== "hidden" && status !== "disabled",
    });
    if (updateError) setError(updateError.message);
    else if (data) setFeatures((current) => current.map((item) => item.feature_key === feature.feature_key ? data as Feature : item));
    setSaving(null);
  }

  const shown = features.filter((f) => `${f.display_name} ${f.feature_key}`.toLowerCase().includes(filter.toLowerCase()));

  if (error && !allowed && !loading) return <main className="mx-auto max-w-xl px-4 py-16 text-center"><ShieldCheck size={40} className="mx-auto"/><h1 className="mt-5 text-2xl font-semibold">Access restricted</h1><p className="mt-3 text-sm text-[var(--muted)]">{error}</p><Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold"><ArrowLeft size={16}/> Dashboard</Link></main>;

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Administration · Platform Control</p><h1 className="mt-1 text-3xl font-semibold">Feature Visibility</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Control which DRIGHT capabilities are visible and usable. Every status change is server-authorized and written to the audit log.</p></div><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Dashboard</Link></div>
    <div className="mt-6 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-4">{STATUS.map((item) => <div key={item.value}><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-[var(--muted)]">{item.description}</p></div>)}</div>
    <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search features…" className="mt-5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none"/>
    {error && allowed && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      {loading ? <div className="flex items-center gap-2 p-8 text-sm text-[var(--muted)]"><Loader2 className="animate-spin" size={17}/> Loading feature registry…</div> : shown.length === 0 ? <div className="p-8 text-sm text-[var(--muted)]">No features found.</div> : <div className="divide-y divide-[var(--border)]">{shown.map((feature) => <div key={feature.feature_key} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-semibold">{feature.display_name}</p>{feature.status === "enabled" ? <Check size={15}/> : feature.status === "coming_soon" ? <Clock3 size={15}/> : <EyeOff size={15}/>}</div><p className="mt-1 text-xs text-[var(--muted)]">{feature.feature_key}</p></div><div className="flex flex-wrap gap-2">{STATUS.map((item) => <button key={item.value} disabled={saving === feature.feature_key} onClick={() => changeStatus(feature, item.value)} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${feature.status === item.value ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--background)]" : "border-[var(--border)] hover:bg-[var(--background)]"}`}>{saving === feature.feature_key && feature.status !== item.value ? <Loader2 size={13} className="inline animate-spin"/> : item.label}</button>)}</div></div>)}</div>}
    </section>
  </main>;
}

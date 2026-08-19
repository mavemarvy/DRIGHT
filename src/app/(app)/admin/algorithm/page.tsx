"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Beaker, Gauge, GitBranch, Save, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Version = { id: string; version: string; status: string; config: Record<string, unknown>; reason: string | null; deployed_at: string | null };
type Metrics = { algorithm_version: string; searches: number; zero_result_searches: number; search_ctr: number; search_conversion_rate: number; recommendation_impressions: number; recommendation_clicks: number; recommendation_ctr: number; recommendation_conversions: number; recommendation_conversion_rate: number; personalization_coverage: number; discovery_events: number };
type Experiment = { experiment_key: string; name: string; status: string; traffic_percent: number; kill_switch: boolean };
const DEFAULT_WEIGHTS: Record<string, number> = { relevance: 0.30, quality: 0.15, engagement: 0.12, conversion: 0.12, freshness: 0.08, velocity: 0.05, personalization: 0.10, trust: 0.05, price_competitiveness: 0.03 };

export default function AlgorithmControlCenter() {
  const supabase = createClient();
  const [version, setVersion] = useState<Version | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>(DEFAULT_WEIGHTS);
  const [newVersion, setNewVersion] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setError("");
    const [v, m, e] = await Promise.all([
      supabase.from("algorithm_versions").select("id,version,status,config,reason,deployed_at").eq("algorithm_area", "marketplace").eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.rpc("get_algorithm_dashboard_metrics", { p_days: 30 }),
      supabase.from("algorithm_experiments").select("experiment_key,name,status,traffic_percent,kill_switch").order("created_at", { ascending: false }).limit(10),
    ]);
    if (v.error) setError(v.error.message); else {
      const active = v.data as Version | null;
      setVersion(active);
      const configured = active?.config?.weights;
      if (configured && typeof configured === "object") setWeights({ ...DEFAULT_WEIGHTS, ...(configured as Record<string, number>) });
      setNewVersion(active?.version ? `${active.version}-next` : "2B.2");
    }
    if (m.error) setError(m.error.message); else setMetrics(((m.data ?? [])[0] ?? null) as Metrics | null);
    if (!e.error) setExperiments((e.data ?? []) as Experiment[]);
  };

  useEffect(() => { void load(); }, []);

  const totalWeight = useMemo(() => Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0), [weights]);

  async function activateVersion() {
    setSaving(true); setSaved(false); setError("");
    const normalizedVersion = newVersion.trim();
    if (!normalizedVersion) { setError("Algorithm version is required."); setSaving(false); return; }
    if (totalWeight <= 0) { setError("At least one ranking weight must be greater than zero."); setSaving(false); return; }
    const config = { ...(version?.config || {}), weights };
    const { data, error: rpcError } = await supabase.rpc("admin_activate_algorithm_version", { p_version: normalizedVersion, p_config: config, p_reason: reason.trim() || "Marketplace ranking configuration update" });
    if (rpcError) setError(rpcError.message); else { setVersion(data as Version); setSaved(true); setReason(""); await load(); }
    setSaving(false);
  }

  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Admin • Marketplace Intelligence</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Algorithm Control Center</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Inspect ranking, search quality, experimentation and personalization telemetry. Production changes remain versioned and auditable.</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><p className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Active version</p><p className="mt-1 text-xl font-semibold">{version?.version ?? "—"}</p></div></div>
    {error && <div className="mt-6 rounded-2xl border border-red-300/60 bg-red-500/10 p-4 text-sm text-red-700">{error}</div>}
    {saved && <div className="mt-6 rounded-2xl border border-emerald-300/60 bg-emerald-500/10 p-4 text-sm text-emerald-700">Algorithm version activated and audited successfully.</div>}

    <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Searches" value={metrics?.searches ?? 0} sub="Queries processed" icon={<Activity size={18} />} /><MetricCard label="Zero-result rate" value={metrics ? `${((metrics.zero_result_searches / Math.max(metrics.searches, 1)) * 100).toFixed(2)}%` : "—"} sub="Lower is better" icon={<Gauge size={18} />} /><MetricCard label="Recommendation CTR" value={metrics ? `${metrics.recommendation_ctr.toFixed(2)}%` : "—"} sub="Recommendation clicks" icon={<Sparkles size={18} />} /><MetricCard label="Discovery events" value={metrics?.discovery_events ?? 0} sub="Last 30 days" icon={<Activity size={18} />} /></div>

    <div className="mt-7 grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-3"><SlidersHorizontal size={18} /><h2 className="font-semibold">Ranking weights</h2></div><p className="mt-2 text-xs text-[var(--muted)]">Changes are stored in a new algorithm version. Current total: {(totalWeight * 100).toFixed(1)}%.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(weights).map(([key, value]) => <label key={key} className="rounded-xl bg-[var(--background)] p-3"><span className="block text-xs font-medium capitalize">{key.replace(/_/g, " ")}</span><div className="mt-2 flex items-center gap-2"><input type="number" min="0" max="1" step="0.01" value={value} onChange={(event) => setWeights((current) => ({ ...current, [key]: Number(event.target.value) }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-sm" /><span className="text-xs text-[var(--muted)]">{(value * 100).toFixed(0)}%</span></div></label>)}</div><div className="mt-5 grid gap-3"><input value={newVersion} onChange={(event) => setNewVersion(event.target.value)} placeholder="Algorithm version" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm" /><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for this production algorithm change" rows={3} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm" /><button type="button" onClick={() => void activateVersion()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-contrast)] disabled:opacity-50"><Save size={16} />{saving ? "Activating…" : "Activate new version"}</button></div><p className="mt-4 text-xs leading-5 text-[var(--muted)]">The database RPC enforces Super Admin or Search/Recommendation management permissions and retires the previous active version.</p></section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-3"><Beaker size={18} /><h2 className="font-semibold">Experiments & kill switches</h2></div>{experiments.length ? <div className="mt-5 space-y-3">{experiments.map((experiment) => <div key={experiment.experiment_key} className="rounded-xl bg-[var(--background)] px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="font-medium">{experiment.name}</span><span className="text-xs text-[var(--muted)]">{experiment.status}</span></div><p className="mt-1 text-xs text-[var(--muted)]">{experiment.traffic_percent}% traffic • {experiment.kill_switch ? "KILL SWITCH ON" : "kill switch off"}</p></div>)}</div> : <p className="mt-5 text-sm text-[var(--muted)]">No experiments configured yet.</p>}<div className="mt-5 flex flex-wrap gap-3 text-xs text-[var(--muted)]"><span className="inline-flex items-center gap-2"><GitBranch size={14} />Versioned</span><span className="inline-flex items-center gap-2"><ShieldCheck size={14} />RBAC protected</span></div></section>
    </div>
  </main>;
}

function MetricCard({ label, value, sub, icon }: { label: string; value: string | number; sub: string; icon: React.ReactNode }) { return <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">{icon}<p className="mt-4 text-2xl font-semibold">{String(value)}</p><p className="mt-1 text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-[var(--muted)]">{sub}</p></article>; }

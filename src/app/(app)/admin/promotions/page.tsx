"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Eye, Loader2, Megaphone, PauseCircle, Plus, Save, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Banner = {
  id: string;
  banner_id: string;
  campaign_id: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  badge: string | null;
  desktop_image_url: string | null;
  tablet_image_url: string | null;
  mobile_image_url: string | null;
  background_image_url: string | null;
  video_url: string | null;
  cta_label: string | null;
  destination_url: string | null;
  placement: string;
  priority: number;
  display_order: number;
  audience: Record<string, unknown>;
  status: "draft" | "scheduled" | "active" | "paused" | "expired" | "archived";
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

type FormState = {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  desktop_image_url: string;
  tablet_image_url: string;
  mobile_image_url: string;
  background_image_url: string;
  video_url: string;
  cta_label: string;
  destination_url: string;
  placement: string;
  priority: string;
  display_order: string;
  audience: string;
  status: Banner["status"];
  starts_at: string;
  ends_at: string;
};

const emptyForm: FormState = {
  title: "", subtitle: "", description: "", badge: "", desktop_image_url: "", tablet_image_url: "", mobile_image_url: "", background_image_url: "", video_url: "", cta_label: "", destination_url: "", placement: "marketplace_home", priority: "100", display_order: "0", audience: "{}", status: "draft", starts_at: "", ends_at: "",
};

function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formFromBanner(b: Banner): FormState {
  return {
    title: b.title || "", subtitle: b.subtitle || "", description: b.description || "", badge: b.badge || "", desktop_image_url: b.desktop_image_url || "", tablet_image_url: b.tablet_image_url || "", mobile_image_url: b.mobile_image_url || "", background_image_url: b.background_image_url || "", video_url: b.video_url || "", cta_label: b.cta_label || "", destination_url: b.destination_url || "", placement: b.placement, priority: String(b.priority), display_order: String(b.display_order), audience: JSON.stringify(b.audience || {}, null, 2), status: b.status, starts_at: toDateInput(b.starts_at), ends_at: toDateInput(b.ends_at),
  };
}

function derivedState(b: Banner) {
  const now = Date.now();
  if (b.status === "archived" || b.status === "paused" || b.status === "draft") return b.status;
  if (b.ends_at && new Date(b.ends_at).getTime() <= now) return "expired";
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return "scheduled";
  return b.status;
}

function normalizeUrl(value: string) {
  const clean = value.trim();
  if (!clean) return null;
  if (clean.startsWith("/") && !clean.startsWith("//")) return clean;
  try {
    const url = new URL(clean);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function AdminPromotionsPage() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login?next=/admin/promotions"; return; }
    const { data: isAdmin, error: authError } = await supabase.rpc("promotion_is_admin");
    if (authError || !isAdmin) {
      setAuthorized(false);
      setError("You do not have permission to manage promotions.");
      setLoading(false);
      return;
    }
    setAuthorized(true);
    const [{ data: c, error: campaignError }, { data: p, error: pricingError }, { data: b, error: bannerError }] = await Promise.all([
      supabase.from("marketing_campaigns").select("id,campaign_id,advertiser_user_id,name,promotion_type,status,approval_status,payment_status,total_budget,amount_spent,currency_code,created_at").order("created_at", { ascending: false }),
      supabase.from("promotion_pricing").select("id,pricing_key,promotion_type,pricing_model,unit_price,currency_code,enabled,minimum_daily_budget,minimum_total_budget").order("pricing_key"),
      supabase.from("promotional_banners").select("id,banner_id,campaign_id,title,subtitle,description,badge,desktop_image_url,tablet_image_url,mobile_image_url,background_image_url,video_url,cta_label,destination_url,placement,priority,display_order,audience,status,starts_at,ends_at,created_at,updated_at").order("priority", { ascending: true }).order("display_order", { ascending: true }),
    ]);
    if (campaignError || pricingError || bannerError) setError(campaignError?.message || pricingError?.message || bannerError?.message || "Could not load promotion data.");
    setCampaigns(c ?? []); setPricing(p ?? []); setBanners((b ?? []) as Banner[]); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function review(id: string, next: "approved" | "rejected" | "paused") {
    setMessage(""); setError("");
    const { error: updateError } = await supabase.from("marketing_campaigns").update({ approval_status: next === "approved" ? "approved" : next === "rejected" ? "rejected" : "suspended", status: next === "approved" ? "approved" : next === "rejected" ? "rejected" : "paused", reviewed_at: new Date().toISOString() }).eq("id", id);
    if (updateError) setError(updateError.message); else { setMessage(`Campaign ${next}.`); await load(); }
  }

  function editBanner(banner: Banner) {
    setEditingId(banner.id); setForm(formFromBanner(banner)); setMessage(""); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() { setEditingId(null); setForm(emptyForm); setMessage(""); setError(""); }

  async function saveBanner() {
    setMessage(""); setError("");
    if (!form.title.trim()) return setError("Banner title is required.");
    if (!form.destination_url.trim() && form.cta_label.trim()) return setError("A CTA destination is required when a CTA label is provided.");
    const destination = normalizeUrl(form.destination_url);
    if (form.destination_url.trim() && !destination) return setError("Destination must be a valid DRIGHT internal path or an HTTPS/HTTP URL.");
    let audience: Record<string, unknown>;
    try {
      const parsed = JSON.parse(form.audience || "{}");
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Audience must be a JSON object.");
      audience = parsed as Record<string, unknown>;
    } catch (e) {
      return setError(e instanceof Error ? e.message : "Audience must contain valid JSON.");
    }
    const startsAt = form.starts_at ? new Date(form.starts_at).toISOString() : null;
    const endsAt = form.ends_at ? new Date(form.ends_at).toISOString() : null;
    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) return setError("End date must be after start date.");
    setSaving(true);
    const payload = { title: form.title.trim(), subtitle: form.subtitle.trim() || null, description: form.description.trim() || null, badge: form.badge.trim() || null, desktop_image_url: form.desktop_image_url.trim() || null, tablet_image_url: form.tablet_image_url.trim() || null, mobile_image_url: form.mobile_image_url.trim() || null, background_image_url: form.background_image_url.trim() || null, video_url: form.video_url.trim() || null, cta_label: form.cta_label.trim() || null, destination_url: destination, placement: form.placement.trim() || "marketplace_home", priority: Number(form.priority) || 100, display_order: Number(form.display_order) || 0, audience, status: form.status, starts_at: startsAt, ends_at: endsAt, updated_at: new Date().toISOString() };
    const result = editingId ? await supabase.from("promotional_banners").update(payload).eq("id", editingId) : await supabase.from("promotional_banners").insert(payload).select("id").single();
    if (result.error) setError(result.error.message); else { setMessage(editingId ? "Banner updated." : "Banner draft created."); resetForm(); await load(); }
    setSaving(false);
  }

  async function changeBannerStatus(id: string, status: Banner["status"]) {
    setError(""); setMessage("");
    const { error: updateError } = await supabase.from("promotional_banners").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) setError(updateError.message); else { setMessage(`Banner ${status}.`); await load(); }
  }

  const activeCount = useMemo(() => banners.filter((b) => derivedState(b) === "active").length, [banners]);

  if (loading) return <main className="mx-auto max-w-7xl px-4 py-12 text-sm text-[var(--muted)]">Loading promotion control center…</main>;
  if (!authorized) return <main className="mx-auto max-w-xl px-4 py-16 text-center"><Megaphone className="mx-auto" size={42}/><h1 className="mt-4 text-2xl font-semibold">Access restricted</h1><p className="mt-2 text-sm text-[var(--muted)]">{error || "Promotion administration requires authorized access."}</p></main>;

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"><div className="flex items-start gap-4"><Megaphone size={30}/><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Super Admin · CMS</p><h1 className="mt-1 text-3xl font-semibold">Promotion Control Center</h1><p className="mt-2 text-sm text-[var(--muted)]">Manage real DRIGHT campaigns and promotional banners without replacing the existing promotion engine.</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Banners" value={banners.length}/><Metric label="Active" value={activeCount}/><Metric label="Campaigns" value={campaigns.length}/><Metric label="Pricing rules" value={pricing.length}/></div></header>
    {message && <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">{message}</p>}
    {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Banner studio</p><h2 className="mt-1 text-xl font-semibold">{editingId ? "Edit promotional banner" : "Create promotional banner"}</h2><p className="mt-1 text-sm text-[var(--muted)]">Only fields supported by the existing promotional_banners architecture are persisted.</p></div>{editingId && <button type="button" onClick={resetForm} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold">New banner</button>}</div>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Title" value={form.title} onChange={(v)=>setForm({...form,title:v})} required/><Field label="Badge" value={form.badge} onChange={(v)=>setForm({...form,badge:v})}/><Field label="Subtitle" value={form.subtitle} onChange={(v)=>setForm({...form,subtitle:v})}/><Field label="CTA label" value={form.cta_label} onChange={(v)=>setForm({...form,cta_label:v})}/><Field label="Destination" value={form.destination_url} onChange={(v)=>setForm({...form,destination_url:v})} placeholder="/marketplace or https://…"/><Field label="Placement" value={form.placement} onChange={(v)=>setForm({...form,placement:v})}/><Field label="Priority" value={form.priority} onChange={(v)=>setForm({...form,priority:v})} type="number"/><Field label="Display order" value={form.display_order} onChange={(v)=>setForm({...form,display_order:v})} type="number"/><Field label="Desktop image URL" value={form.desktop_image_url} onChange={(v)=>setForm({...form,desktop_image_url:v})}/><Field label="Tablet image URL" value={form.tablet_image_url} onChange={(v)=>setForm({...form,tablet_image_url:v})}/><Field label="Mobile image URL" value={form.mobile_image_url} onChange={(v)=>setForm({...form,mobile_image_url:v})}/><Field label="Background image URL" value={form.background_image_url} onChange={(v)=>setForm({...form,background_image_url:v})}/><Field label="Video URL (where supported)" value={form.video_url} onChange={(v)=>setForm({...form,video_url:v})}/><label className="text-sm">Status<select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value as Banner["status"]})} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label><Field label="Start date" value={form.starts_at} onChange={(v)=>setForm({...form,starts_at:v})} type="datetime-local"/><Field label="End date" value={form.ends_at} onChange={(v)=>setForm({...form,ends_at:v})} type="datetime-local"/></div>
      <label className="mt-4 block text-sm">Description<textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} rows={3} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"/></label>
      <label className="mt-4 block text-sm">Audience JSON<textarea value={form.audience} onChange={(e)=>setForm({...form,audience:e.target.value})} rows={4} spellCheck={false} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 font-mono text-xs"/><span className="mt-1 block text-xs text-[var(--muted)]">Uses the current audience JSON field; no new targeting semantics are invented here.</span></label>
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={saveBanner} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--background)]">{saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>} {editingId ? "Save changes" : "Save draft"}</button>{editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold">Cancel</button>}</div>
    </section>

    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Existing banners</p><h2 className="mt-1 text-xl font-semibold">Banner library</h2></div><Plus size={18} className="text-[var(--muted)]"/></div><div className="mt-4 space-y-3">{banners.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">No real promotional banners exist yet.</div> : banners.map((banner)=><article key={banner.id} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest">{derivedState(banner)}</span><span className="text-xs text-[var(--muted)]">Priority {banner.priority}</span><span className="text-xs text-[var(--muted)]">{banner.placement}</span></div><h3 className="mt-2 font-semibold">{banner.title || "Untitled banner"}</h3><p className="mt-1 truncate text-xs text-[var(--muted)]">{banner.banner_id} · {banner.destination_url || "No destination"}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>editBanner(banner)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold"><Eye size={14}/> Edit / preview</button>{banner.status === "active" && <button type="button" onClick={()=>changeBannerStatus(banner.id,"paused")} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><PauseCircle size={14}/> Pause</button>}{banner.status !== "archived" && banner.status !== "active" && <button type="button" onClick={()=>changeBannerStatus(banner.id,"active")} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><CheckCircle2 size={14}/> Activate</button>}{banner.status !== "archived" && <button type="button" onClick={()=>changeBannerStatus(banner.id,"archived")} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><Archive size={14}/> Archive</button>}</div></div><div className="mt-4 grid gap-3 text-xs sm:grid-cols-3"><div><span className="text-[var(--muted)]">Starts</span><p>{banner.starts_at ? new Date(banner.starts_at).toLocaleString() : "Immediately"}</p></div><div><span className="text-[var(--muted)]">Ends</span><p>{banner.ends_at ? new Date(banner.ends_at).toLocaleString() : "No end date"}</p></div><div><span className="text-[var(--muted)]">Campaign</span><p>{banner.campaign_id || "Standalone"}</p></div></div></article>)}</div></section>

    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="font-semibold">Campaign review queue</h2><div className="mt-4 space-y-3">{campaigns.filter(c=>["pending_review","approved","active","paused","rejected"].includes(c.status)).map(c=><article key={c.id} className="rounded-xl border border-[var(--border)] p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-semibold">{c.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{c.campaign_id} · {c.promotion_type} · {c.status}</p></div><div className="flex flex-wrap gap-2">{c.status === "pending_review" && <><button onClick={()=>review(c.id,"approved")} className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><CheckCircle2 size={14}/> Approve</button><button onClick={()=>review(c.id,"rejected")} className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><XCircle size={14}/> Reject</button></>}{c.status === "active" && <button onClick={()=>review(c.id,"paused")} className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs"><PauseCircle size={14}/> Suspend</button>}</div></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4"><div><span className="text-[var(--muted)]">Budget</span><p>{c.total_budget} {c.currency_code}</p></div><div><span className="text-[var(--muted)]">Spent</span><p>{c.amount_spent}</p></div><div><span className="text-[var(--muted)]">Approval</span><p>{c.approval_status}</p></div><div><span className="text-[var(--muted)]">Payment</span><p>{c.payment_status}</p></div></div></article>)}{campaigns.length===0 && <p className="text-sm text-[var(--muted)]">No campaigns found.</p>}</div></section>
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="font-semibold">Configured pricing</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs text-[var(--muted)]"><tr><th className="py-2">Key</th><th>Type</th><th>Model</th><th>Unit price</th><th>Currency</th><th>Enabled</th></tr></thead><tbody>{pricing.map(p=><tr key={p.id} className="border-t border-[var(--border)]"><td className="py-3">{p.pricing_key}</td><td>{p.promotion_type}</td><td>{p.pricing_model}</td><td>{p.unit_price}</td><td>{p.currency_code}</td><td>{p.enabled ? "Yes" : "No"}</td></tr>)}</tbody></table></div></section>
  </main>;
}

function Field({ label, value, onChange, type = "text", placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return <label className="text-sm">{label}{required && <span className="text-red-600"> *</span>}<input type={type} required={required} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"/></label>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"><p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}

"use client";

import { useState } from "react";
import { BriefcaseBusiness, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass = "mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20";

export default function JobForm() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ title: "", description: "", category: "", city: "", region: "", country: "", workMode: "on_site", employmentType: "full_time", salaryMin: "", salaryMax: "", currency: "USD", experience: "", skills: "", requirements: "", responsibilities: "", benefits: "", deadline: "", applicationMethod: "dright", applicationUrl: "" });
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  function update(name: keyof typeof form, value: string) { setForm((current) => ({ ...current, [name]: value })); }
  function split(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 50); }

  async function submit(status: "draft" | "published") {
    setError("");
    if (!form.title.trim() || !form.description.trim()) { setError("Title and description are required."); return; }
    if (form.applicationMethod === "external" && !form.applicationUrl.trim()) { setError("An external application URL is required."); return; }
    if (form.salaryMin && form.salaryMax && Number(form.salaryMax) < Number(form.salaryMin)) { setError("Maximum compensation cannot be below minimum compensation."); return; }
    if (form.deadline && new Date(form.deadline).getTime() < Date.now()) { setError("The application deadline must be in the future."); return; }
    setPublishing(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push(`/login?next=${encodeURIComponent("/jobs/post")}`); return; }
    const payload = {
      employer_id: auth.user.id,
      title: form.title.trim(), description: form.description.trim(), category: form.category.trim() || null,
      location_city: form.city.trim() || null, location_region: form.region.trim() || null, location_country: form.country.trim() || null,
      work_mode: form.workMode, employment_type: form.employmentType,
      salary_min: form.salaryMin ? Number(form.salaryMin) : null, salary_max: form.salaryMax ? Number(form.salaryMax) : null, currency_code: form.currency.toUpperCase(),
      experience_level: form.experience.trim() || null, skills: split(form.skills), requirements: split(form.requirements), responsibilities: split(form.responsibilities), benefits: split(form.benefits),
      application_method: form.applicationMethod, application_url: form.applicationMethod === "external" ? form.applicationUrl.trim() : null,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null, visibility: "public", status,
      published_at: status === "published" ? new Date().toISOString() : null,
    };
    const { data, error: insertError } = await supabase.from("jobs").insert(payload).select("id").single();
    if (insertError) setError(insertError.message); else if (data) router.push(`/jobs/${data.id}`);
    setPublishing(false);
  }

  return <div className="mx-auto max-w-4xl"><div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-9"><div className="flex items-center gap-3"><div className="rounded-2xl bg-[var(--background)] p-3"><BriefcaseBusiness size={22}/></div><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Employer workspace</p><h1 className="mt-1 text-2xl font-semibold">Post a job</h1></div></div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Your existing DRIGHT identity is used as the employer. No separate employer account is created.</p>
    <div className="mt-8 grid gap-5 sm:grid-cols-2">
      <Field label="Job title" value={form.title} onChange={(v) => update("title", v)} required className="sm:col-span-2" />
      <label className="text-sm font-medium sm:col-span-2">Description<textarea rows={8} value={form.description} onChange={(e) => update("description", e.target.value)} className={inputClass} placeholder="Describe the role, scope and outcomes." required /></label>
      <Field label="Category" value={form.category} onChange={(v) => update("category", v)} placeholder="e.g. Engineering" />
      <Field label="Experience level" value={form.experience} onChange={(v) => update("experience", v)} placeholder="e.g. Mid-level" />
      <Field label="City" value={form.city} onChange={(v) => update("city", v)} />
      <Field label="Region / State" value={form.region} onChange={(v) => update("region", v)} />
      <Field label="Country" value={form.country} onChange={(v) => update("country", v)} />
      <Select label="Work style" value={form.workMode} onChange={(v) => update("workMode", v)} options={[["remote","Remote"],["hybrid","Hybrid"],["on_site","On-site"]]} />
      <Select label="Employment type" value={form.employmentType} onChange={(v) => update("employmentType", v)} options={[["full_time","Full-time"],["part_time","Part-time"],["contract","Contract"],["temporary","Temporary"],["internship","Internship"],["freelance","Freelance"]]} />
      <Field label="Minimum compensation" type="number" value={form.salaryMin} onChange={(v) => update("salaryMin", v)} />
      <Field label="Maximum compensation" type="number" value={form.salaryMax} onChange={(v) => update("salaryMax", v)} />
      <Field label="Currency" value={form.currency} onChange={(v) => update("currency", v)} placeholder="USD" />
      <label className="text-sm font-medium">Application deadline<input type="datetime-local" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} className={inputClass}/></label>
      <Field label="Skills" value={form.skills} onChange={(v) => update("skills", v)} placeholder="React, TypeScript, SQL" className="sm:col-span-2" />
      <TextArrayField label="Requirements" value={form.requirements} onChange={(v) => update("requirements", v)} />
      <TextArrayField label="Responsibilities" value={form.responsibilities} onChange={(v) => update("responsibilities", v)} />
      <TextArrayField label="Benefits" value={form.benefits} onChange={(v) => update("benefits", v)} />
      <Select label="Application method" value={form.applicationMethod} onChange={(v) => update("applicationMethod", v)} options={[["dright","Apply on DRIGHT"],["external","External application"]]} />
      {form.applicationMethod === "external" && <Field label="Application URL" value={form.applicationUrl} onChange={(v) => update("applicationUrl", v)} placeholder="https://..." />}
    </div>
    {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={publishing} onClick={() => submit("draft")} className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold">Save draft</button><button type="button" disabled={publishing} onClick={() => submit("published")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--background)]">{publishing && <Loader2 size={16} className="animate-spin"/>} Publish job</button></div>
  </div></div>;
}

function Field({ label, value, onChange, placeholder, type = "text", required = false, className = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; className?: string }) { return <label className={`text-sm font-medium ${className}`}>{label}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={inputClass}/></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) { return <label className="text-sm font-medium">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function TextArrayField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-sm font-medium">{label}<textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="Separate items with commas."/></label>; }

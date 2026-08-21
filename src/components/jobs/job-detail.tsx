"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Bookmark, BriefcaseBusiness, CheckCircle2, ExternalLink, MapPin, Send, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Job, JobCard } from "@/components/jobs/job-card";

type PublicIdentity = { user_id: string; username: string; full_name: string | null };
type Application = { id: string; universal_id: string; status: string; created_at: string };

function titleCase(value: string | null) { return value ? value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : ""; }
function location(job: Job) { return job.work_mode === "remote" ? "Remote" : [job.location_city, job.location_region, job.location_country].filter(Boolean).join(", ") || "Location not specified"; }
function compensation(job: Job) { if (job.salary_min == null && job.salary_max == null) return "Compensation not specified"; const min = job.salary_min == null ? null : job.salary_min.toLocaleString(); const max = job.salary_max == null ? null : job.salary_max.toLocaleString(); return `${job.currency_code} ${min && max ? `${min}–${max}` : min ?? max}`; }

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [job, setJob] = useState<Job | null>(null);
  const [employer, setEmployer] = useState<PublicIdentity | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [related, setRelated] = useState<Job[]>([]);
  const [saved, setSaved] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from("jobs").select("id,universal_id,employer_id,title,description,category,location_city,location_region,location_country,work_mode,employment_type,salary_min,salary_max,currency_code,experience_level,deadline,status,created_at,skills,requirements,responsibilities,benefits,application_method,application_url").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (error || !data) { setMessage(error?.message || "This job is no longer available."); setLoading(false); return; }
      const nextJob = data as unknown as Job & { skills?: string[]; requirements?: string[]; responsibilities?: string[]; benefits?: string[]; application_method?: string; application_url?: string | null };
      setJob(nextJob);
      const identity = await supabase.rpc("get_public_identity", { p_user_id: nextJob.employer_id });
      if (!cancelled && identity.data?.[0]) setEmployer(identity.data[0] as PublicIdentity);
      const relatedQuery = supabase.from("jobs").select("id,universal_id,employer_id,title,description,category,location_city,location_region,location_country,work_mode,employment_type,salary_min,salary_max,currency_code,experience_level,deadline,status,created_at").eq("status", "published").eq("visibility", "public").neq("id", id).limit(4);
      const { data: relatedRows } = nextJob.category ? await relatedQuery.eq("category", nextJob.category) : await relatedQuery;
      if (!cancelled) setRelated((relatedRows ?? []) as Job[]);
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const [{ data: savedRow }, { data: applicationRow }] = await Promise.all([
          supabase.from("saved_jobs").select("id").eq("job_id", id).eq("user_id", auth.user.id).maybeSingle(),
          supabase.from("job_applications").select("id,universal_id,status,created_at").eq("job_id", id).eq("applicant_id", auth.user.id).maybeSingle(),
        ]);
        if (!cancelled) { setSaved(Boolean(savedRow)); setApplication((applicationRow ?? null) as Application | null); }
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [id, supabase]);

  async function toggleSave() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.href = `/login?next=${encodeURIComponent(`/jobs/${id}`)}`; return; }
    if (saved) { const { error } = await supabase.from("saved_jobs").delete().eq("job_id", id).eq("user_id", auth.user.id); if (!error) setSaved(false); }
    else { const { error } = await supabase.from("saved_jobs").insert({ job_id: id, user_id: auth.user.id }); if (!error) setSaved(true); }
  }

  async function apply() {
    if (!job) return;
    const method = (job as Job & { application_method?: string }).application_method;
    const externalUrl = (job as Job & { application_url?: string | null }).application_url;
    if (method === "external" && externalUrl) { window.open(externalUrl, "_blank", "noopener,noreferrer"); return; }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.href = `/login?next=${encodeURIComponent(`/jobs/${id}`)}`; return; }
    setApplying(true); setMessage("");
    const { data, error } = await supabase.from("job_applications").insert({ job_id: id, applicant_id: auth.user.id, cover_note: coverNote.trim() || null }).select("id,universal_id,status,created_at").single();
    if (error) setMessage(error.code === "23505" ? "You have already applied to this job." : error.message);
    else setApplication(data as Application);
    setApplying(false);
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: job?.title ?? "DRIGHT Job", url });
    else await navigator.clipboard.writeText(url);
  }

  if (loading) return <div className="dright-page mx-auto max-w-6xl"><div className="h-[520px] animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]"/></div>;
  if (!job) return <div className="dright-page mx-auto max-w-4xl"><div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center"><BriefcaseBusiness size={28} className="mx-auto text-[var(--muted)]"/><h1 className="mt-3 text-xl font-semibold">Job unavailable</h1><p className="mt-2 text-sm text-[var(--muted)]">{message}</p><Link href="/jobs" className="mt-5 inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--background)]">Back to jobs</Link></div></div>;

  const rich = job as Job & { skills?: string[]; requirements?: string[]; responsibilities?: string[]; benefits?: string[]; application_method?: string; application_url?: string | null };
  return <div className="dright-page mx-auto max-w-6xl">
    <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]"><ArrowLeft size={16}/> Jobs marketplace</Link>
    <div className="mt-4 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
      <main className="min-w-0 space-y-7">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-9"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]"><BriefcaseBusiness size={15}/> Job</div><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{job.title}</h1><p className="mt-2 text-sm text-[var(--muted)]">{employer?.full_name || employer?.username || `DRIGHT user ${job.employer_id.slice(0, 8)}…`}</p></div><div className="flex gap-2"><button type="button" onClick={toggleSave} aria-label={saved ? "Remove saved job" : "Save job"} className={`rounded-xl border border-[var(--border)] p-3 ${saved ? "bg-[var(--primary)] text-[var(--background)]" : ""}`}><Bookmark size={18} fill={saved ? "currentColor" : "none"}/></button><button type="button" onClick={share} aria-label="Share job" className="rounded-xl border border-[var(--border)] p-3"><Share2 size={18}/></button></div></div><div className="mt-6 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[var(--background)] px-3 py-1.5">{titleCase(job.work_mode)}</span><span className="rounded-full bg-[var(--background)] px-3 py-1.5">{titleCase(job.employment_type)}</span>{job.category && <span className="rounded-full bg-[var(--background)] px-3 py-1.5">{job.category}</span>}</div><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[var(--background)] p-4"><p className="text-xs text-[var(--muted)]">Location</p><p className="mt-1 flex items-center gap-2 text-sm font-semibold"><MapPin size={15}/>{location(job)}</p></div><div className="rounded-xl bg-[var(--background)] p-4"><p className="text-xs text-[var(--muted)]">Compensation</p><p className="mt-1 text-sm font-semibold">{compensation(job)}</p></div></div><p className="mt-5 font-mono text-xs text-[var(--muted)]">Job ID · {job.universal_id}</p></section>
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"><h2 className="text-xl font-semibold">About the role</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{job.description}</p>{rich.responsibilities?.length ? <ListSection title="Responsibilities" items={rich.responsibilities}/> : null}{rich.requirements?.length ? <ListSection title="Requirements" items={rich.requirements}/> : null}{rich.skills?.length ? <ListSection title="Skills" items={rich.skills}/> : null}{rich.benefits?.length ? <ListSection title="Benefits" items={rich.benefits}/> : null}</section>
        {related.length > 0 && <section><h2 className="text-xl font-semibold">Related jobs</h2><div className="mt-4 grid gap-5 sm:grid-cols-2">{related.map((item) => <JobCard key={item.id} job={item}/>)}</div></section>}
      </main>
      <aside className="space-y-5"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] lg:sticky lg:top-24"><h2 className="font-semibold">Apply for this job</h2>{application ? <div className="mt-4 rounded-xl bg-[var(--background)] p-4"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 size={17}/> Application {titleCase(application.status)}</div><p className="mt-1 font-mono text-[10px] text-[var(--muted)]">{application.universal_id}</p></div> : <><textarea value={coverNote} onChange={(event) => setCoverNote(event.target.value)} rows={5} placeholder="Optional cover note" className="mt-4 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none"/><button type="button" disabled={applying} onClick={apply} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--background)] disabled:opacity-60">{rich.application_method === "external" ? <ExternalLink size={16}/> : <Send size={16}/>} {applying ? "Applying…" : rich.application_method === "external" ? "Apply externally" : "Apply on DRIGHT"}</button></>}{message && <p className="mt-3 text-sm text-red-600">{message}</p>}</div><Link href={`/profile/${job.employer_id}`} className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Employer</p><p className="mt-2 font-semibold">{employer?.full_name || employer?.username || "View employer profile"}</p>{employer?.username && <p className="mt-1 text-sm text-[var(--muted)]">@{employer.username}</p>}<p className="mt-3 font-mono text-[10px] text-[var(--muted)]">DRIGHT ID · {job.employer_id}</p></Link></aside>
    </div>
  </div>;
}

function ListSection({ title, items }: { title: string; items: string[] }) { return <div className="mt-8"><h3 className="font-semibold">{title}</h3><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-[var(--muted)]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]"/>{item}</li>)}</ul></div>; }

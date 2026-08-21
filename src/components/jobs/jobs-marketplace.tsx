"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Filter, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Job, JobCard } from "@/components/jobs/job-card";

type SortMode = "newest" | "oldest" | "salary-high" | "salary-low" | "deadline";

export default function JobsMarketplace() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      let request = supabase.from("jobs").select("id,universal_id,employer_id,title,description,category,location_city,location_region,location_country,work_mode,employment_type,salary_min,salary_max,currency_code,experience_level,deadline,status,created_at").eq("status", "published").eq("visibility", "public").limit(30);
      const q = query.trim();
      if (q) request = request.or(`title.ilike.%${q}%,description.ilike.%${q}%,universal_id.ilike.%${q}%`);
      if (location.trim()) request = request.or(`location_city.ilike.%${location.trim()}%,location_region.ilike.%${location.trim()}%,location_country.ilike.%${location.trim()}%`);
      if (category) request = request.eq("category", category);
      if (mode) request = request.eq("work_mode", mode);
      if (sort === "newest") request = request.order("created_at", { ascending: false });
      else if (sort === "oldest") request = request.order("created_at", { ascending: true });
      else if (sort === "salary-high") request = request.order("salary_max", { ascending: false, nullsFirst: false });
      else if (sort === "salary-low") request = request.order("salary_min", { ascending: true, nullsFirst: false });
      else request = request.order("deadline", { ascending: true, nullsFirst: false });
      const { data, error: queryError } = await request;
      if (!cancelled) { if (queryError) setError(queryError.message); else setJobs((data ?? []) as Job[]); setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [category, location, mode, query, sort, supabase]);

  useEffect(() => {
    let cancelled = false;
    async function loadSaved() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase.from("saved_jobs").select("job_id").eq("user_id", auth.user.id).limit(200);
      if (!cancelled) setSaved(new Set((data ?? []).map((row) => row.job_id as string)));
    }
    void loadSaved();
    return () => { cancelled = true; };
  }, [supabase]);

  const categories = useMemo(() => Array.from(new Set(jobs.map((job) => job.category).filter((value): value is string => Boolean(value)))).sort(), [jobs]);

  async function toggleSave(job: Job) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { window.location.href = `/login?next=${encodeURIComponent("/jobs")}`; return; }
    const isSaved = saved.has(job.id);
    if (isSaved) {
      const { error: deleteError } = await supabase.from("saved_jobs").delete().eq("job_id", job.id).eq("user_id", auth.user.id);
      if (!deleteError) setSaved((current) => { const next = new Set(current); next.delete(job.id); return next; });
    } else {
      const { error: insertError } = await supabase.from("saved_jobs").insert({ job_id: job.id, user_id: auth.user.id });
      if (!insertError) setSaved((current) => new Set(current).add(job.id));
    }
  }

  async function share(job: Job) {
    const url = `${window.location.origin}/jobs/${job.id}`;
    if (navigator.share) await navigator.share({ title: job.title, url });
    else await navigator.clipboard.writeText(url);
  }

  return (
    <div className="dright-page mx-auto max-w-7xl">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]"><BriefcaseBusiness size={14}/> DRIGHT Jobs</div><h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Find work that fits your next move.</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">Search real DRIGHT job listings by role, employer, location and work style.</p></div>
          <div className="flex gap-2"><Link href="/jobs/saved" className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold">Saved jobs</Link><Link href="/jobs/post" className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--background)]">Post a job</Link></div>
        </div>
        <form className="mt-7 grid gap-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.8fr)_auto]" onSubmit={(event) => event.preventDefault()}>
          <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3"><Search size={18} className="text-[var(--muted)]"/><span className="sr-only">Search jobs</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Job title, skill, employer or Job ID" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/>{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16}/></button>}</label>
          <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3"><MapPin size={18} className="text-[var(--muted)]"/><span className="sr-only">Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, region or country" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>
          <button type="button" onClick={() => setMobileFilters((open) => !open)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold lg:hidden"><Filter size={17}/> Filters</button>
        </form>
      </section>

      <div className="mt-7 grid gap-7 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={`${mobileFilters ? "block" : "hidden"} lg:block`}><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] lg:sticky lg:top-24"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Filters</p><SlidersHorizontal size={15} className="text-[var(--muted)]"/></div><label className="mt-5 block text-xs font-medium text-[var(--muted)]">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none"><option value="">All categories</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="mt-4 block text-xs font-medium text-[var(--muted)]">Work style<select value={mode} onChange={(event) => setMode(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none"><option value="">Any</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on_site">On-site</option></select></label><label className="mt-4 block text-xs font-medium text-[var(--muted)]">Sort<select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="salary-high">Salary: high to low</option><option value="salary-low">Salary: low to high</option><option value="deadline">Deadline soonest</option></select></label><button type="button" onClick={() => { setQuery(""); setLocation(""); setCategory(""); setMode(""); setSort("newest"); }} className="mt-5 w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-semibold">Reset filters</button></div></aside>
        <main className="min-w-0"><div className="mb-4 flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Marketplace</p><h2 className="mt-1 text-2xl font-semibold">{jobs.length} live {jobs.length === 1 ? "job" : "jobs"}</h2></div><Link href="/jobs/applications" className="text-sm font-semibold text-[var(--muted)]">My applications →</Link></div>{loading ? <div className="grid gap-5 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[350px] animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"/>)}</div> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Could not load jobs: {error}</div> : jobs.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center"><BriefcaseBusiness size={28} className="mx-auto text-[var(--muted)]"/><h3 className="mt-3 font-semibold">No jobs match those filters</h3><p className="mt-1 text-sm text-[var(--muted)]">DRIGHT does not invent job listings. Try a broader search.</p></div> : <div className="grid gap-5 sm:grid-cols-2">{jobs.map((job) => <JobCard key={job.id} job={job} saved={saved.has(job.id)} onSave={toggleSave} onShare={share}/>)}</div>}</main>
      </div>
    </div>
  );
}

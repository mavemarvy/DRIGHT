"use client";

import Link from "next/link";
import { Bookmark, BriefcaseBusiness, MapPin, Share2 } from "lucide-react";

export type Job = {
  id: string;
  universal_id: string;
  employer_id: string;
  title: string;
  description: string;
  category: string | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  work_mode: "remote" | "hybrid" | "on_site";
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  currency_code: string;
  experience_level: string | null;
  deadline: string | null;
  status: string;
  created_at: string;
};

function money(job: Job) {
  if (job.salary_min == null && job.salary_max == null) return null;
  const min = job.salary_min == null ? null : job.salary_min.toLocaleString();
  const max = job.salary_max == null ? null : job.salary_max.toLocaleString();
  if (min && max) return `${job.currency_code} ${min}–${max}`;
  return `${job.currency_code} ${min ?? max}`;
}

function location(job: Job) {
  if (job.work_mode === "remote") return "Remote";
  return [job.location_city, job.location_region, job.location_country].filter(Boolean).join(", ") || "Location not specified";
}

function titleCase(value: string | null) {
  return value ? value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "";
}

export function JobCard({ job, saved, onSave, onShare }: { job: Job; saved?: boolean; onSave?: (job: Job) => void; onShare?: (job: Job) => void }) {
  return (
    <article className="group flex min-w-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]"><BriefcaseBusiness size={15} /> DRIGHT Jobs</div>
          <h3 className="mt-3 line-clamp-2 text-lg font-semibold tracking-tight group-hover:underline">{job.title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Employer · {job.employer_id.slice(0, 8)}…</p>
        </Link>
        <div className="flex shrink-0 gap-1">
          {onSave && <button type="button" onClick={() => onSave(job)} aria-label={saved ? "Remove saved job" : "Save job"} className={`rounded-xl p-2 ${saved ? "bg-[var(--primary)] text-[var(--background)]" : "border border-[var(--border)] text-[var(--muted)]"}`}><Bookmark size={17} fill={saved ? "currentColor" : "none"} /></button>}
          {onShare && <button type="button" onClick={() => onShare(job)} aria-label="Share job" className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted)]"><Share2 size={17} /></button>}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-[var(--background)] px-3 py-1.5 font-medium">{titleCase(job.work_mode)}</span>
        <span className="rounded-full bg-[var(--background)] px-3 py-1.5 font-medium">{titleCase(job.employment_type)}</span>
        {job.category && <span className="rounded-full bg-[var(--background)] px-3 py-1.5 font-medium">{job.category}</span>}
      </div>
      <div className="mt-5 space-y-2 text-sm text-[var(--muted)]">
        <p className="flex items-center gap-2"><MapPin size={15} /> {location(job)}</p>
        {money(job) && <p className="font-medium text-[var(--foreground)]">{money(job)}</p>}
        {job.experience_level && <p>{titleCase(job.experience_level)} experience</p>}
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{job.description}</p>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        <span className="truncate font-mono text-[10px] text-[var(--muted)]">{job.universal_id}</span>
        <Link href={`/jobs/${job.id}`} className="rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-[var(--background)]">View job</Link>
      </div>
    </article>
  );
}

-- DRIGHT Phase K: Jobs Experience
-- Additive only. The live schema has no jobs, applications, or saved_jobs tables.
-- The existing universal_entities registry is reused with its current entity_uuid model.

create sequence if not exists public.universal_job_id_seq;
create sequence if not exists public.universal_application_id_seq;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  universal_id text not null unique default ('DR-JOB-' || lpad(nextval('public.universal_job_id_seq')::text, 8, '0')),
  employer_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  description text not null,
  category text,
  location_city text,
  location_region text,
  location_country text,
  work_mode text not null default 'on_site' check (work_mode in ('remote','hybrid','on_site')),
  employment_type text not null default 'full_time' check (employment_type in ('full_time','part_time','contract','temporary','internship','freelance')),
  salary_min numeric(14,2),
  salary_max numeric(14,2),
  currency_code text not null default 'USD',
  experience_level text,
  skills text[] not null default '{}',
  requirements text[] not null default '{}',
  responsibilities text[] not null default '{}',
  benefits text[] not null default '{}',
  application_method text not null default 'dright' check (application_method in ('dright','external')),
  application_url text,
  deadline timestamptz,
  visibility text not null default 'public' check (visibility in ('public','private')),
  status text not null default 'draft' check (status in ('draft','published','paused','closed','expired','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint jobs_salary_range_check check (salary_min is null or salary_max is null or salary_max >= salary_min),
  constraint jobs_deadline_check check (deadline is null or deadline >= created_at),
  constraint jobs_external_url_check check (application_method = 'dright' or nullif(trim(application_url),'') is not null)
);

create index if not exists jobs_public_discovery_idx on public.jobs(status, visibility, created_at desc);
create index if not exists jobs_category_idx on public.jobs(category, status, created_at desc);
create index if not exists jobs_location_idx on public.jobs(location_country, location_region, location_city, status);
create index if not exists jobs_employer_idx on public.jobs(employer_id, status, created_at desc);
create index if not exists jobs_deadline_idx on public.jobs(deadline) where deadline is not null;
create index if not exists jobs_universal_id_idx on public.jobs(universal_id);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  universal_id text not null unique default ('DR-APP-' || lpad(nextval('public.universal_application_id_seq')::text, 8, '0')),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  cover_note text,
  resume_url text,
  status text not null default 'submitted' check (status in ('submitted','reviewing','shortlisted','interview','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, applicant_id)
);

create index if not exists job_applications_applicant_idx on public.job_applications(applicant_id, created_at desc);
create index if not exists job_applications_job_idx on public.job_applications(job_id, created_at desc);
create index if not exists job_applications_status_idx on public.job_applications(status, created_at desc);
create index if not exists job_applications_universal_id_idx on public.job_applications(universal_id);

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(job_id, user_id)
);

create index if not exists saved_jobs_user_idx on public.saved_jobs(user_id, created_at desc);
create index if not exists saved_jobs_job_idx on public.saved_jobs(job_id, created_at desc);

create or replace function public.set_jobs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at before update on public.jobs for each row execute function public.set_jobs_updated_at();
drop trigger if exists trg_job_applications_updated_at on public.job_applications;
create trigger trg_job_applications_updated_at before update on public.job_applications for each row execute function public.set_jobs_updated_at();

-- Reuse the live universal_entities registry: (entity_type, entity_uuid) is its entity key.
create or replace function public.register_job_universal_entity()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.universal_entities(entity_uuid, entity_type, universal_id, lifecycle_status, metadata)
  values (new.id, case when tg_table_name='jobs' then 'JOB' else 'APPLICATION' end, new.universal_id, 'ACTIVE', '{}'::jsonb)
  on conflict (entity_type, entity_uuid) do update
    set universal_id=excluded.universal_id, lifecycle_status=excluded.lifecycle_status, updated_at=now();
  return new;
end;
$$;

drop trigger if exists trg_jobs_universal_entity on public.jobs;
create trigger trg_jobs_universal_entity after insert or update of universal_id on public.jobs for each row execute function public.register_job_universal_entity();
drop trigger if exists trg_job_applications_universal_entity on public.job_applications;
create trigger trg_job_applications_universal_entity after insert or update of universal_id on public.job_applications for each row execute function public.register_job_universal_entity();

insert into public.universal_entities(entity_uuid, entity_type, universal_id, lifecycle_status, metadata)
select id, 'JOB', universal_id, 'ACTIVE', '{}'::jsonb from public.jobs
on conflict (entity_type, entity_uuid) do update set universal_id=excluded.universal_id, lifecycle_status=excluded.lifecycle_status, updated_at=now();
insert into public.universal_entities(entity_uuid, entity_type, universal_id, lifecycle_status, metadata)
select id, 'APPLICATION', universal_id, 'ACTIVE', '{}'::jsonb from public.job_applications
on conflict (entity_type, entity_uuid) do update set universal_id=excluded.universal_id, lifecycle_status=excluded.lifecycle_status, updated_at=now();

alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.saved_jobs enable row level security;

drop policy if exists jobs_public_select on public.jobs;
create policy jobs_public_select on public.jobs for select to anon, authenticated
using ((status='published' and visibility='public') or employer_id=auth.uid());

drop policy if exists jobs_owner_insert on public.jobs;
create policy jobs_owner_insert on public.jobs for insert to authenticated
with check (employer_id=auth.uid());

drop policy if exists jobs_owner_update on public.jobs;
create policy jobs_owner_update on public.jobs for update to authenticated
using (employer_id=auth.uid()) with check (employer_id=auth.uid());

drop policy if exists jobs_owner_delete on public.jobs;
create policy jobs_owner_delete on public.jobs for delete to authenticated
using (employer_id=auth.uid());

drop policy if exists job_applications_select on public.job_applications;
create policy job_applications_select on public.job_applications for select to authenticated
using (applicant_id=auth.uid() or exists (select 1 from public.jobs j where j.id=job_applications.job_id and j.employer_id=auth.uid()));

drop policy if exists job_applications_insert on public.job_applications;
create policy job_applications_insert on public.job_applications for insert to authenticated
with check (
  applicant_id=auth.uid()
  and exists (select 1 from public.jobs j where j.id=job_applications.job_id and j.status='published' and j.visibility='public')
);

drop policy if exists job_applications_applicant_update on public.job_applications;
create policy job_applications_applicant_update on public.job_applications for update to authenticated
using (applicant_id=auth.uid()) with check (applicant_id=auth.uid());

drop policy if exists job_applications_employer_update on public.job_applications;
create policy job_applications_employer_update on public.job_applications for update to authenticated
using (exists (select 1 from public.jobs j where j.id=job_applications.job_id and j.employer_id=auth.uid()))
with check (exists (select 1 from public.jobs j where j.id=job_applications.job_id and j.employer_id=auth.uid()));

drop policy if exists saved_jobs_owner_all on public.saved_jobs;
create policy saved_jobs_owner_all on public.saved_jobs for all to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());

comment on table public.jobs is 'DRIGHT Jobs marketplace records. Employer identity is an existing auth/profile identity.';
comment on table public.job_applications is 'Private DRIGHT job applications, accessible only to the applicant and owning employer.';
comment on table public.saved_jobs is 'Per-user saved jobs; reuses job records rather than duplicating them.';

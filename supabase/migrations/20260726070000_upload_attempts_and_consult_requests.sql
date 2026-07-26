-- Keep every uploaded file, and record what was asked for.
--
-- Both routes that take a P&L parse it before saving anything, so until now a
-- file that failed to parse — or one from somebody whose email was already
-- registered — was discarded with nothing left behind. Those are the people
-- most worth calling back.

-- No lead_id: at the point these rows are written there may be no account at
-- all, which is the whole reason for keeping them. The email is what ties an
-- attempt to a person.
create table public.upload_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  email      text not null,
  company    text,
  file_path  text not null,
  file_name  text not null,
  file_size  integer not null,
  reason     text not null,
  created_at timestamptz not null default now()
);
create index upload_attempts_created_at_idx on public.upload_attempts (created_at desc);

-- A consultation request and the PDF that was emailed with it, so it can be
-- reviewed or sent again.
create table public.consult_requests (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads (id) on delete cascade,
  result_id  uuid not null references public.pnl_results (id) on delete cascade,
  pdf_path   text not null,
  created_at timestamptz not null default now()
);
create index consult_requests_lead_id_idx on public.consult_requests (lead_id);

alter table public.upload_attempts  enable row level security;
alter table public.consult_requests enable row level security;

-- Writes go through the secret key, as everywhere else, so only reads are
-- granted. A rejected upload belongs to nobody yet — admin only.
create policy upload_attempts_admin_read on public.upload_attempts
  for select to authenticated
  using (public.is_admin());

create policy consult_requests_read_own_or_admin on public.consult_requests
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.leads l
      where l.id = consult_requests.lead_id and l.user_id = (select auth.uid())
    )
  );

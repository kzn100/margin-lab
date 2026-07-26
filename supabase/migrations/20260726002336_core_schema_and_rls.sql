-- Margin Lab core schema. Spec: docs/06-data-model.md
-- Role lives in auth.users.raw_app_meta_data->>'role' (service-key-only writable,
-- carried in the JWT) instead of a public users table, so RLS needs no extra join.
-- ponytail: JWT claim is stale until the user's token refreshes; fine for roles
-- set once at provisioning. Move to a profiles-table lookup if roles churn.

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false)
$$;

create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  company     text not null,
  job_role    text not null,
  mobile      text not null,
  email       text not null,
  pnl_type    text not null check (pnl_type in ('full-year', 'monthly')),
  created_at  timestamptz not null default now()
);
create index leads_user_id_idx on public.leads (user_id);
create index leads_created_at_idx on public.leads (created_at desc);

create table public.pnl_uploads (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  file_path   text not null,
  created_at  timestamptz not null default now()
);
create index pnl_uploads_lead_id_idx on public.pnl_uploads (lead_id);

create table public.pnl_results (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  upload_id   uuid not null references public.pnl_uploads (id) on delete cascade,
  metrics     jsonb not null,
  created_at  timestamptz not null default now()
);
create index pnl_results_lead_id_idx on public.pnl_results (lead_id);

create table public.marketing_campaigns (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('fb', 'email', 'whatsapp')),
  segment_filter  jsonb not null default '{}'::jsonb,
  content         jsonb not null default '{}'::jsonb,
  sent_at         timestamptz,
  sent_by         uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.leads               enable row level security;
alter table public.pnl_uploads         enable row level security;
alter table public.pnl_results         enable row level security;
alter table public.marketing_campaigns enable row level security;

-- Writes all happen server-side with the secret key (which bypasses RLS), so
-- only read policies are granted to authenticated clients.
create policy leads_read_own_or_admin on public.leads
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy pnl_uploads_read_own_or_admin on public.pnl_uploads
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.leads l
      where l.id = pnl_uploads.lead_id and l.user_id = auth.uid()
    )
  );

create policy pnl_results_read_own_or_admin on public.pnl_results
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.leads l
      where l.id = pnl_results.lead_id and l.user_id = auth.uid()
    )
  );

create policy marketing_campaigns_admin_all on public.marketing_campaigns
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Private bucket: uploaded P&L files are only ever read server-side.
insert into storage.buckets (id, name, public)
values ('pnl-uploads', 'pnl-uploads', false)
on conflict (id) do nothing;

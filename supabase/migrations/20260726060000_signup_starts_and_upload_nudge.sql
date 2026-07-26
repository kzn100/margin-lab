-- Follow-up emails for people who never get an analysis back.
-- Spec: docs/superpowers/specs/2026-07-26-signup-nudge-emails-design.md

-- Emails captured from the register form before submit, so an abandoned signup
-- can still be followed up. Written by the admin client, read by the scheduled
-- job; no policies, so anon/authenticated get nothing.
create table public.signup_starts (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  created_at      timestamptz not null default now(),
  followed_up_at  timestamptz
);
alter table public.signup_starts enable row level security;

-- Partial index: the scheduler only ever scans rows still awaiting a nudge.
create index signup_starts_pending_idx on public.signup_starts (created_at)
  where followed_up_at is null;

-- Stops a lead being nudged again on every poll.
alter table public.leads add column upload_nudge_sent_at timestamptz;
create index leads_pending_nudge_idx on public.leads (created_at)
  where upload_nudge_sent_at is null;

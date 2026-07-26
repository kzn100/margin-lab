# Module: Admin Auth + CRM (Lead Table + Usage View)

## Context

Admin's home base for managing captured leads and seeing platform usage. Acts
as the CRM — no separate CRM SaaS product, Postgres `leads`/`pnl_results` data
surfaced directly with admin-only access. Feeds the marketing-push module
(admin selects leads/segments here, campaigns launch from there).

## Key Requirements

- `/admin` — role-gated (only `role = 'admin'` accounts).
- Leads table: list all captured leads (name, company, job role, email,
  mobile, P&L type, signup date).
- Basic usage view: signups over time, analyses run, other simple counts —
  not full analytics (that's a future spec).
- Entry point for push-marketing panel ([module 05](05-marketing-push.md)).

## Supabase Touchpoints

- **Auth**: same Supabase Auth session, gated by `role` check — both at the
  route level (server check before render) and RLS level (Postgres policies
  restrict `leads`/`pnl_results` reads to `role = 'admin'`).
- **Postgres**: reads across all `leads`, `pnl_uploads`, `pnl_results` rows
  (unlike `/dashboard`, no `user_id` scoping — admin sees everything).

## UX Flow

1. Admin logs in at `/login` → redirected to `/admin` (role = admin).
2. Lands on leads table: sortable/filterable list of all leads.
3. Basic usage view (e.g. summary cards or small chart: signups this
   week/month, total analyses run) visible on same page or adjacent tab.
4. Admin can select one or more leads (checkbox) to build a segment.
5. Selected segment carries into push-marketing panel tabs (FB / Email /
   WhatsApp) — see [module 05](05-marketing-push.md).
6. Non-admin account hitting `/admin` directly: blocked (redirect or 403),
   enforced by both route guard and RLS.

## Open Items

- Full admin analytics (funnels, conversion rates, cohort views) explicitly
  deferred — this module ships only lead table + basic usage counts.

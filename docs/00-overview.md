# RGM Consultancy Platform — Overview

## Context

Consultancy runs revenue growth management (RGM) services. Platform goal: turn free
P&L analysis offer into lead-gen + CRM engine, give users self-serve history, give
admin push-marketing tools off captured leads. Greenfield build.

## Scope

**In (this build):**
1. [Landing page + RGM 101 articles](01-landing-and-articles.md)
2. [Registration + P&L upload + analysis](02-registration-and-pnl-upload.md)
3. [User auth + dashboard](03-auth-and-dashboard.md)
4. [Admin auth + CRM lead table](04-admin-crm.md)
5. [Admin push-marketing (FB/Email/WhatsApp)](05-marketing-push.md)
6. [Data model](06-data-model.md)
7. [Tech stack](07-tech-stack.md)
8. [UI page guide](08-ui-page-guide.md)

**Out (future specs):** user-facing chart color settings, payment gateway/checkout,
full admin analytics beyond basic usage view.

## Auth, DB, CRM — all Supabase

- **Auth**: Supabase Auth handles both public users and admin. Single `users`
  table (Supabase-managed) + `role` column (`user` | `admin`) gates access.
- **Database**: Supabase Postgres holds leads, uploads, results, campaigns. Row
  Level Security (RLS) enforces per-user and per-role data isolation — no
  separate CRM product, the `leads`/`pnl_results` tables in Postgres *are* the CRM,
  surfaced via `/admin`.
- **Storage**: Supabase Storage holds uploaded P&L files.

## Open Items

- WhatsApp provider not chosen — interface built pluggable, wiring deferred.
- Exact P&L template columns finalized during implementation.
- Meta Business/Ads token needed from user before FB export tab works.

## Verification (platform-level)

- `/register` end-to-end: sample CSV → `leads`, `pnl_uploads`, `pnl_results` rows
  created, results page renders, email received.
- `/dashboard` shows only logged-in user's own results (RLS check).
- `/admin` inaccessible to non-admin accounts (role check / RLS).
- Admin email blast: test send to small segment, confirm via Resend logs.
- FB export: API call succeeds against test Meta Ads account (or mocked).

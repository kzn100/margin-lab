# Module: Registration + P&L Upload + Analysis

## Context

Core lead-capture + product-value moment: visitor trades their P&L file +
contact info for a free automated analysis. One form does three jobs at once —
creates the auth account, creates the CRM lead record, and stages the file for
processing. This is the single most important conversion point on the platform.

## Key Requirements

- `/register` — single form: name, company, job role, mobile, email, password,
  P&L type (full-year/monthly), P&L file upload (fixed CSV/Excel template).
- On submit:
  1. Create Supabase Auth user (email + password).
  2. Insert `leads` row (linked to new `user_id`).
  3. Upload file to Supabase Storage.
  4. API route parses file server-side → computes P&L + RGM metrics (revenue
     trend, gross margin %, opex breakdown, net profit trend, MoM/YoY, revenue
     growth price/volume/mix).
  5. Write `pnl_results` row (jsonb metrics).
  6. Email results via Resend.
  7. Redirect to `/results/[id]`.
- P&L template: fixed CSV/Excel, one row per month — Month, Revenue (+
  price/volume/mix breakout if available), COGS, Opex (per category), Net
  Profit. Exact column spec finalized during implementation.

## Supabase Touchpoints

- **Auth**: `supabase.auth.signUp()` creates the account inline with registration
  (no separate "verify email" gate before results — user should see value
  immediately; confirm email flow can run in background).
- **Postgres**: `leads`, `pnl_uploads`, `pnl_results` inserts (see
  [data model](06-data-model.md)).
- **Storage**: raw P&L file uploaded to a bucket, `file_path` stored on
  `pnl_uploads`.

## UX Flow

1. User arrives from landing page CTA at `/register`.
2. Fills form: name, company, job role, mobile, email, password, P&L type toggle.
3. Uploads P&L file (template download link should be available on this page).
4. Submits form.
5. Client shows processing/loading state while server parses + computes (this
   can take a few seconds — file parse, metric computation, DB writes, email send).
6. On success: redirect to `/results/[id]` — charts render (Recharts) showing
   revenue trend, margin, opex breakdown, profit trend, growth decomposition.
7. Results email arrives in parallel (Resend), so user has an offline copy.
8. On failure (bad file format, parse error): inline error, user can retry
   upload without re-filling the whole form (form state preserved).

## Open Items

- Exact P&L template columns finalized during implementation — needs a
  downloadable template file shipped alongside the form.
- Parse/compute is synchronous in this MVP (blocks the redirect); revisit as
  async/background job if files or user volume grow.

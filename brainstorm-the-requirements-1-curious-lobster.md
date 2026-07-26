# RGM Consultancy Platform — MVP Spec

## Context

User runs a revenue growth management (RGM) consultancy. Wants a web platform to:
generate leads via a free P&L analysis offer, capture those leads into a CRM,
let users log in and see their analysis history, and let the admin run push-marketing
campaigns (Facebook, email, WhatsApp) off the captured leads. Full 7-item wishlist
was scoped down through brainstorming — settings (chart colors) and payment gateway
are deferred to later specs; everything else is in this build.

Empty project directory — greenfield build.

## Scope

**In:**
1. Landing page (hero + pitch + CTA) with RGM 101 articles + sample analysis graphics
2. Registration (creates account): name, company, job role, mobile, email, password, P&L type (full-year/monthly), P&L file upload
3. Server-side parse + compute of uploaded P&L → results page (charts) + emailed results
4. Public user auth (Supabase Auth) + `/dashboard` showing history of past analyses
5. Admin auth (role-gated) + `/admin` lead table + usage view
6. Admin push-marketing module: FB Custom Audience export, email blast, WhatsApp blast (provider TBD, built pluggable)
7. Hero/section visuals generated via Higgsfield (static/animated graphics, not video)

**Out (future specs):** user-facing chart color settings, payment gateway/consultancy checkout, full admin analytics beyond basic usage view.

## Stack

- Next.js (App Router)
- Supabase: Postgres (data), Storage (P&L file uploads), Auth (users + admin, `role` column)
- MDX for RGM 101 articles (git-versioned, no CMS)
- Recharts for charts
- Resend for transactional + blast email
- Meta Marketing API for FB Custom Audience export (needs Meta Business token, stored server-side)
- WhatsApp: pluggable provider interface, no provider wired yet (Twilio vs Meta Cloud API — decide later)
- Higgsfield for hero/section graphic generation (design-time asset generation, not runtime)

## Data Model (Supabase)

- `users` — Supabase Auth table + `role` (`user` | `admin`)
- `leads` — id, user_id (FK), name, company, job_role, mobile, email, pnl_type, created_at
- `pnl_uploads` — id, lead_id (FK), file_path, created_at
- `pnl_results` — id, lead_id (FK), upload_id (FK), computed metrics (jsonb: revenue trend, gross margin %, opex breakdown, net profit trend, MoM/YoY, revenue growth price/volume/mix), created_at
- `marketing_campaigns` — id, type (`fb`|`email`|`whatsapp`), segment_filter, content, sent_at, sent_by

## P&L Upload Template

Fixed CSV/Excel template, one row per month, columns: Month, Revenue (+ price/volume/mix breakout columns if available), COGS, Opex (per category), Net Profit. Exact column spec to be finalized as a template file during implementation.

## Pages / Flow

1. `/` — landing: hero (Higgsfield graphics), pitch, CTA → `/register`, article teasers, sample graphs
2. `/articles/[slug]` — MDX-rendered RGM 101 articles
3. `/register` — single form incl. password field → creates Supabase Auth user + `leads` row, uploads file to Storage
4. On submit: API route parses file server-side → computes P&L + RGM metrics → writes `pnl_results` → emails results via Resend → redirects to `/results/[id]`
5. `/login` — Supabase Auth email+password, redirects by role (`user` → `/dashboard`, `admin` → `/admin`)
6. `/dashboard` — logged-in user's own past uploads/results
7. `/admin` — role-gated: leads table, basic usage view, push-marketing panel:
   - FB tab: select leads → push to Meta Custom Audience
   - Email tab: select segment → compose → send via Resend
   - WhatsApp tab: select segment → compose → send via provider interface (send blocked until provider chosen)

## Open Items Flagged in Spec

- WhatsApp provider not chosen — build interface, wire later
- Exact P&L template columns finalized during implementation
- Meta Business/Ads token needed from user before FB export tab is functional

## Verification

- `/register` end-to-end: submit form with sample CSV → confirm `leads`, `pnl_uploads`, `pnl_results` rows created in Supabase, results page renders charts, email received
- `/dashboard` shows only the logged-in user's own results (RLS check)
- `/admin` inaccessible to non-admin accounts (role check / RLS)
- Admin email blast: send test to a small segment, confirm delivery via Resend logs
- FB export: confirm API call succeeds against test Meta Ads account (or mock if token unavailable yet)

# Tech Stack

- **Next.js (App Router)** — app framework, server-side API routes for parse/compute.
- **Supabase**:
  - Postgres — data (`leads`, `pnl_uploads`, `pnl_results`, `marketing_campaigns`).
  - Storage — P&L file uploads.
  - Auth — users + admin, `role` column, RLS everywhere.
- **MDX** — RGM 101 articles, git-versioned, no CMS.
- **Recharts** — result charts (dashboard, results page).
- **Resend** — transactional email (results) + blast email (marketing).
- **Meta Marketing API** — FB Custom Audience export, needs Meta Business token
  stored server-side.
- **WhatsApp** — pluggable provider interface, no provider wired yet (Twilio
  vs Meta Cloud API TBD).
- **Higgsfield** — hero/section graphic generation, design-time only (static
  assets, not runtime-generated, not video).

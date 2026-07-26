# Data Model (Supabase Postgres)

## Context

Five tables carry the whole app: auth identity, lead capture, uploaded files,
computed results, and marketing send log. RLS is the security boundary
between "user sees own data" ([dashboard](03-auth-and-dashboard.md)) and
"admin sees everything" ([admin CRM](04-admin-crm.md)).

## Tables

### `users`
Supabase Auth-managed table + app column:
- `role` — `user` | `admin`

### `leads`
- `id`
- `user_id` (FK → `users`)
- `name`
- `company`
- `job_role`
- `mobile`
- `email`
- `pnl_type` (`full-year` | `monthly`)
- `created_at`

### `pnl_uploads`
- `id`
- `lead_id` (FK → `leads`)
- `file_path` (Supabase Storage path)
- `created_at`

### `pnl_results`
- `id`
- `lead_id` (FK → `leads`)
- `upload_id` (FK → `pnl_uploads`)
- `computed metrics` (jsonb): revenue trend, gross margin %, opex breakdown,
  net profit trend, MoM/YoY, revenue growth price/volume/mix
- `created_at`

### `marketing_campaigns`
- `id`
- `type` (`fb` | `email` | `whatsapp`)
- `segment_filter`
- `content`
- `sent_at`
- `sent_by`

## RLS Notes

- `leads`, `pnl_uploads`, `pnl_results`: policy restricts `SELECT` to rows
  where `leads.user_id = auth.uid()` OR requesting user has `role = 'admin'`.
- `marketing_campaigns`: admin-only read/write.
- `users.role`: writable only via server-side/service-role context, never
  client-side — prevents self-promotion to admin.

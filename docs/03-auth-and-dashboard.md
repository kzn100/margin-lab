# Module: User Auth + Dashboard

## Context

Registered users return to check past analyses without re-uploading. This is
the retention loop — turns a one-time lead magnet into a reason to come back
(and stay warm for the consultancy's sales/marketing follow-up).

## Key Requirements

- `/login` — Supabase Auth email + password.
- Redirect by role: `user` → `/dashboard`, `admin` → `/admin`.
- `/dashboard` — logged-in user's own past uploads/results only.

## Supabase Touchpoints

- **Auth**: `supabase.auth.signInWithPassword()`; session read via Supabase
  client on protected routes.
- **Postgres + RLS**: `pnl_results` (and `leads`/`pnl_uploads`) queries scoped
  by `auth.uid()` via RLS policy — user can only ever see rows where
  `leads.user_id = auth.uid()`. This is the enforcement boundary, not just a
  client-side filter.

## UX Flow

1. Returning user hits `/login` (from nav, or direct link).
2. Enters email + password.
3. On success, role read from `users.role` → redirected: `user` to `/dashboard`,
   `admin` to `/admin`.
4. `/dashboard` lists past analyses (most recent first) — each entry shows
   date, P&L type, headline metric (e.g. net profit trend).
5. Click an entry → view that analysis's full results (same charts as
   `/results/[id]` from registration flow).
6. No entries yet (edge case): empty state prompting... nothing to upload here
   (upload only happens at registration) — dashboard is read-only history.

## Open Items

None — scope explicitly excludes settings (chart colors) and any write
actions from dashboard in this build.

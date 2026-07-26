# Signup nudge emails

Two follow-up emails for people who start signing up but never get an analysis
back, plus the Resend integration both of them (and the existing results email)
need in order to actually send anything.

## Problem

Registration today is atomic: `POST /api/register` requires the P&L file in the
same submission as the account fields, parses it before creating the account,
and rolls the account back on any later failure. There is no "registered but
never uploaded" state — it cannot be reached. Anyone who wants an account but
does not have their P&L to hand right now simply does not get one.

Separately, nobody who abandons the form is ever heard from again, because
nothing reaches the server until submit.

And no email in this codebase is delivered. `sendResultsEmail`'s `deliver()`
logs to the console; `sendEmailBlast` throws when a provider is configured.
Both are stubs awaiting a provider decision that has since been made (Resend).

## Scope

Three pieces, in one change:

1. **Deferred upload** — an account can be created without a file. Lands on
   `/dashboard`, whose empty state already prompts for a first analysis.
2. **Abandoned-signup capture** — a valid email typed into the register form is
   captured on blur, before submit.
3. **Nudge emails** — a scheduled job emails each group once, an hour later.

Wiring Resend is a prerequisite of (3), not a separate project: a nudge email
that only prints to a server log is not a feature.

## Non-goals

- Drip sequences. One nudge per person, ever.
- Unsubscribe handling beyond what Resend provides. These are transactional
  follow-ups to someone who entered their own address into a signup form.
- Rate limiting or CAPTCHA on the capture endpoint. See Known gaps.
- Backfilling nudges for accounts that already exist.

## Data model

New table, `signup_starts` — stage-1 captures, before an account exists:

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `email` | text unique | conflict target for the upsert |
| `created_at` | timestamptz | |
| `followed_up_at` | timestamptz null | stamped when the nudge is sent |

No RLS policies. Written by the admin client only, and read only by the
scheduled job — matching how every other write in this app already works. RLS
is still enabled, so the anon/authenticated roles get nothing.

New column on `leads`:

| column | type | notes |
|---|---|---|
| `upload_nudge_sent_at` | timestamptz null | stops re-nudging every poll |

Deliberately no new table for stage-2: an account with no upload is already a
representable state (`leads` row exists, no `pnl_uploads` row). It only became
unreachable because the register route refused to create it.

## Registration without a file

`src/app/api/register/route.ts`: the `file` field becomes optional.

- **With a file** — behaviour is byte-for-byte what it is today.
- **Without one** — validate the account fields, create the auth user, insert
  the `leads` row, sign in, respond `{ redirect: "/dashboard" }`. Skip parse,
  storage upload, `pnl_uploads`, `pnl_results`, and the results email.

`pnl_type` stays required either way: it is a `not null` column on `leads`, and
the answer is still meaningful for a lead who has not uploaded yet.

The rollback path (`abort`) still applies to the no-file branch, since the
`leads` insert can still fail after the account exists.

`RegisterForm.tsx`: the primary button keeps requiring a file — the upload is
the product's value proposition and should not be quietly optional. A separate
secondary action, "Skip for now, upload later", submits the same form without
the file, so skipping is a deliberate choice rather than a missed field. It
reuses the same validation minus the file check.

## Abandoned-signup capture

New route `POST /api/signup-start`, unauthenticated, body `{ email }`.

- Validates the address against the same regex the register route uses.
- `upsert ... onConflict: "email", ignoreDuplicates: true` into `signup_starts`.
- Always responds 204. It never blocks or slows the form, and it must not leak
  whether an address is already known.

`RegisterForm.tsx` fires it from the email field's `onBlur`, once, only when the
value is a valid address, fire-and-forget (no `await`, errors swallowed). A
second blur on an unchanged value does not re-fire.

Stage-1 eligibility explicitly excludes anyone whose email later appears in
`leads`, so finishing registration cancels the abandoned-signup nudge. This is
checked at send time rather than by deleting the row on registration, so the
capture table stays an honest record of what happened.

## Sending

New module `src/lib/email/send.ts` exporting `sendViaResend(to, subject, text)`,
using Resend's HTTP API (`POST https://api.resend.com/emails`) rather than SMTP —
one `fetch`, no SMTP client dependency.

Reads `RESEND_API_KEY` and `EMAIL_FROM` from the environment. When
`RESEND_API_KEY` is unset it keeps today's behaviour: render, log, report not-sent.
That keeps local development and CI working without credentials, and matches the
existing stubs' contract.

Existing callers are repointed at it:

- `sendResultsEmail`'s `deliver()` — currently `console.info` only.
- `sendEmailBlast` in `src/lib/marketing/providers.ts` — currently throws when
  `RESEND_API_KEY` is set, which means configuring the key today *breaks* the
  admin marketing panel. Sending the nudge emails while leaving those two paths
  stubbed would ship an inconsistent state.

`EMAIL_FROM` and `RESEND_API_KEY` go in Netlify's environment variables. This is
distinct from the SMTP settings already configured in Supabase, which only cover
Supabase Auth's own emails (password recovery, confirmations).

## Scheduler

Netlify Scheduled Function, `netlify/functions/nudge.mts`, every 30 minutes
(`netlify.toml` `[functions."nudge"] schedule = "*/30 * * * *"`).

Chosen over the alternatives because it stays in this repo, runs the same Node
runtime as the API routes, and can import the same TypeScript modules. Supabase
pg_cron would need a new authenticated webhook endpoint plus pg_net; a Supabase
Edge Function would introduce a second runtime and deploy target this repo does
not otherwise use.

Each run, with a one-hour threshold:

**Stage 1 — abandoned signup.** `signup_starts` where `created_at < now-1h`,
`followed_up_at is null`, and `email` not present in `leads`. Send, then stamp
`followed_up_at`.

**Stage 2 — registered, never uploaded.** `leads` where `created_at < now-1h`,
`upload_nudge_sent_at is null`, and no `pnl_uploads` row for that lead. Send,
then stamp `upload_nudge_sent_at`.

Stamp only on a successful send, so a Resend outage retries on the next run
rather than silently burning the one nudge each person gets. Sequential sends,
not `Promise.all` — the volume is tiny and a rate limit is the likelier failure
than latency.

## Testing

Following this repo's existing convention (`node --test`, `src/**/*.test.ts`,
pure functions, no live-service tests):

- `selectStage1` / `selectStage2` extracted as pure functions over arrays, so
  the eligibility rules are testable without a database. Covers: the one-hour
  threshold boundary, already-stamped rows, stage-1 cancelled by a matching
  `leads` row, stage-2 cancelled by an existing upload.
- Render functions for both emails, asserting the recipient's name and the
  call-to-action URL appear.

Not covered by automated tests: the scheduled function's Supabase and Resend
I/O, and the register route's no-file branch end to end. Both are verified
manually against the running app instead.

## Known gaps

- **No rate limiting on `/api/signup-start`.** An unauthenticated endpoint that
  writes a row per unique email. Worst case is a nudge sent to a bogus address,
  and the same abuse can already be aimed at `/api/register`. Add a per-IP limit
  if it is ever actually abused.
- **Nudges are not backfilled.** Only accounts and captures created after this
  ships are eligible, since existing `leads` predate the new column.
- **One shared send path, no per-message retry.** A failed send waits for the
  next 30-minute run.

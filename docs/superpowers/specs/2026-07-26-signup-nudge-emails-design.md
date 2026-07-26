# Signup follow-up email

A reminder for people who create an account without uploading a P&L, plus the
email sending it (and the existing results email) needs in order to actually
deliver anything.

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
Both are stubs awaiting a provider decision, which this change makes: SMTP on
the Google Workspace mailbox that already owns the sending address.

## Scope

Three pieces, in one change:

1. **Deferred upload** — an account can be created without a file. Lands on
   `/dashboard`, whose empty state already prompts for a first analysis.
2. **Abandoned-signup capture** — a valid email typed into the register form is
   captured on blur, before submit.
3. **Upload reminder** — sent inline at registration when no file came with it.

Wiring a real sender is a prerequisite of (3), not a separate project: a
reminder that only prints to a server log is not a feature.

## Non-goals

- Drip sequences. One reminder per account, at registration.
- Unsubscribe handling. These are transactional follow-ups to someone who
  entered their own address into a signup form.
- Rate limiting or CAPTCHA on the capture endpoint. See Known gaps.
- Chasing abandoned signups by email. See below — it cannot be done correctly
  without reintroducing a scheduler.

## Data model

New table, `signup_starts` — addresses captured before an account exists:

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `email` | text unique | conflict target for the upsert |
| `created_at` | timestamptz | |
| `followed_up_at` | timestamptz null | unused; nothing emails these yet |

No RLS policies. Written by the admin client only — matching how every other
write in this app already works. RLS is still enabled, so the
anon/authenticated roles get nothing.

`followed_up_at` is carried but never set, since no automated mail goes to these
addresses. It is left in place for whatever eventually chases them.

New column on `leads`:

| column | type | notes |
|---|---|---|
| `upload_nudge_sent_at` | timestamptz null | when the reminder actually went |

Deliberately no new table for the reminder: an account with no upload is already
a representable state (`leads` row exists, no `pnl_uploads` row). It only became
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

Nothing is emailed off the back of this. The rows exist so the addresses are
not lost, and the admin marketing panel can already segment and blast them by
hand.

## Sending

New module `src/lib/email/send.ts` exporting `sendEmail(to, subject, text)`,
over plain SMTP via nodemailer.

Resend was tried first and rejected. It works — a test message reached the
account owner — but an unverified account can only send to its own address, and
authorising `ikorek.com` means adding SPF/DKIM records for a third party. Every
hosted provider (SendGrid, Mailgun, Postmark, SES) imposes the same step.
Google Workspace already owns `keng@ikorek.com` and already publishes SPF and
DKIM for the domain, so sending through its SMTP skips domain verification
entirely. For a prototype that is the shorter path; the ceiling is Workspace's
~2,000 messages a day.

Netlify Forms was also considered and does not fit: it notifies the site owner
on submission and cannot template per recipient.

Reads `SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM`, with `SMTP_HOST`/`SMTP_PORT`
defaulting to `smtp.gmail.com:465`. `SMTP_PASSWORD` is a Google App Password;
Workspace rejects the account password for SMTP. When it is unset the module
renders, logs and reports not-sent, so local development and CI work without
credentials — the same contract the previous stubs had.

The App Password is stripped of whitespace before use. Google displays it as
four space-separated groups and it gets pasted that way; sent verbatim, SMTP
rejects it with "535 Username and Password not accepted", which reads like the
wrong password rather than the right one with spaces in it.

The transport is built per message and closed after, deliberately unpooled. A
pooled transporter holds its socket and keepalive timer open, so the event loop
never drains and a serverless invocation hangs until the platform timeout, long
after the mail has gone. One handshake per message is affordable at this
volume.

Existing callers are repointed at it:

- `sendResultsEmail`'s `deliver()` — currently `console.info` only.
- `sendEmailBlast` in `src/lib/marketing/providers.ts` — currently throws once a
  provider key is set, so configuring one *breaks* the admin marketing panel.
  Sending the reminder while leaving those two paths stubbed would ship an
  inconsistent state.

`SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM` go in Netlify's environment
variables. This is distinct from the SMTP settings already configured inside
Supabase, which only cover Supabase Auth's own emails (password recovery,
confirmations) and cannot carry arbitrary messages.

## When the reminder is sent

Inline in `POST /api/register`, on the no-file branch, immediately after the
`leads` row is inserted. Registration is the one moment we already know an
account has no analysis, so nothing has to go looking for it afterwards.

Awaited rather than fired and forgotten: this runs in a serverless function that
can be frozen the instant the response is returned. It costs roughly three
seconds of SMTP handshake on a request that is already creating an account.

A failure is never fatal. The account exists and the dashboard already prompts
for a first analysis; losing a registration over a mail server would be far
worse than a missing email. `upload_nudge_sent_at` is stamped only on success,
so the column records what actually went out.

There is deliberately no scheduler. An earlier revision ran a Netlify Scheduled
Function every 30 minutes over both stages; it was removed once the reminder
could be sent at the moment it is known. That also retired the endpoint's
`NUDGE_SECRET` guard, which existed because Netlify documents scheduled
functions as unreachable over HTTP yet the deployed one answered an
unauthenticated curl and did the work.

## Why abandoned signups get no email

Nothing chases the addresses captured in `signup_starts`, because "abandoned"
cannot be established at capture time. The capture fires on blur, while the
person is still filling the form in — an immediate "you did not finish signing
up" would reach people who are seconds from finishing.

This is not hypothetical. In testing, `keng@ikorek.com` was captured at
05:58:20 and completed registration at 05:58:37: seventeen seconds. An
immediate email would have arrived before they were done.

Establishing abandonment means waiting to see whether they came back, which is
a delay, which is a scheduler. The addresses are still recorded, so they remain
available to the admin marketing panel, which can already segment and blast
them by hand.

## Testing

Following this repo's existing convention (`node --test`, `src/**/*.test.ts`,
pure functions, no live-service tests):

- `renderUploadReminderEmail`, asserting the company and upload URL appear, and
  that the greeting uses the first name only and survives a blank one.

Not covered by automated tests: SMTP I/O and the register route end to end.
Both were verified manually against the running app — a no-file registration
sends and stamps, a with-file registration still produces an upload and result
and sends no reminder.

## Known gaps

- **No rate limiting on `/api/signup-start`.** An unauthenticated endpoint that
  writes a row per unique email. Nothing is emailed from it, so the worst case
  is junk rows, and the same abuse can already be aimed at `/api/register`. Add
  a per-IP limit if it is ever actually abused.
- **Accounts created before this shipped never get the reminder.** It is sent at
  registration, so it cannot reach anyone already registered. None of them need
  it: a file was required until now, so every existing lead already has an
  upload. Verified against the live table before ship.
- **A failed send is not retried.** The error is logged and registration
  proceeds; nothing tries again. Retrying would need the scheduler back.

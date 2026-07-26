# Module: Admin Push-Marketing (FB / Email / WhatsApp)

## Context

Monetizes the captured lead base — admin re-engages leads through paid (FB
Custom Audience), owned (email), and messaging (WhatsApp) channels. Built as
three tabs off one segment-selection flow, sharing the `marketing_campaigns`
log. WhatsApp ships as pluggable interface only — no live provider yet.

## Key Requirements

- Panel lives inside `/admin`, fed by lead selection from the [CRM lead
  table](04-admin-crm.md).
- **FB tab**: select leads → push to Meta Custom Audience (Meta Marketing API,
  requires Meta Business/Ads token stored server-side).
- **Email tab**: select segment → compose → send via Resend.
- **WhatsApp tab**: select segment → compose → send via pluggable provider
  interface — send action blocked/disabled until a provider (Twilio vs Meta
  Cloud API) is chosen and wired.
- Every send logged to `marketing_campaigns` (type, segment_filter, content,
  sent_at, sent_by).

## Supabase Touchpoints

- **Postgres**: `marketing_campaigns` insert on every send attempt (audit
  trail of what was sent, to whom, by which admin).
- **Auth**: admin-only route/RLS gating, same as [module 04](04-admin-crm.md).
- Segment selection reads `leads` table (filter by any lead field, or by
  saved/ad-hoc filter criteria).

## UX Flow

1. Admin, already in `/admin`, selects a segment of leads (via checkboxes in
   leads table, or a filter query).
2. Switches to one of three tabs:
   - **FB**: reviews selected leads → confirms → API call pushes emails/phones
     to Meta Custom Audience → success/failure shown, logged to
     `marketing_campaigns` (type `fb`).
   - **Email**: composes subject/body (or picks template) → preview → send →
     Resend dispatches → logged (type `email`).
   - **WhatsApp**: composes message → send button disabled with "provider not
     configured" state until interface is wired to a real provider → once
     wired, same compose → send → logged (type `whatsapp`) flow as email.
3. Admin can review send history (past `marketing_campaigns` rows) to avoid
   duplicate/spammy re-sends to the same segment.

## Open Items

- WhatsApp provider not chosen — Twilio vs Meta Cloud API decision pending.
  Interface built so a provider can be dropped in without touching UI/flow.
- Meta Business/Ads token must be supplied by user before FB tab is
  functional — until then, FB tab can be mocked/stubbed in dev.

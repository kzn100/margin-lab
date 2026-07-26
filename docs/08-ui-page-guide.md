# UI Page Guide

Per-route breakdown: purpose, layout, key elements, states, access. Complements
UX flows in module docs — this is page-level, not flow-level.

## `/` — Landing

**Module:** [01-landing-and-articles](01-landing-and-articles.md) · **Access:** public

**Layout (top to bottom):**
- Nav bar: logo, links (Articles, Login), primary CTA button ("Free P&L Analysis")
- Hero: Higgsfield graphic + headline + subhead pitch + CTA button → `/register`
- Sample analysis section: 2-3 static sample charts (proof of what user gets)
- Article teasers: 3-6 cards (title, excerpt, thumbnail) → `/articles/[slug]`
- Closing CTA band → `/register`
- Footer: links, contact

**States:** static, no loading/error states (fully server-rendered/static).

## `/articles/[slug]` — RGM 101 Article

**Module:** [01-landing-and-articles](01-landing-and-articles.md) · **Access:** public

**Layout:**
- Nav bar (same as landing)
- Article header: title, dek, hero image
- MDX body content
- Inline CTA (mid-article or end) → `/register`
- Related articles list

**States:** 404 if slug not found (invalid/removed article).

## `/register` — Registration + Upload

**Module:** [02-registration-and-pnl-upload](02-registration-and-pnl-upload.md) · **Access:** public

**Layout:**
- Minimal nav (logo only, no distracting links)
- Form, single column, grouped fields:
  - Identity: name, company, job role, mobile, email
  - Account: password (+ confirm)
  - P&L type: toggle/radio (full-year / monthly)
  - File upload: dropzone + "Download template" link
- Submit button ("Get My Free Analysis")

**States:**
- Default: empty form
- Field validation errors: inline, per-field (email format, password strength, required fields)
- File errors: wrong format/template mismatch — inline under dropzone
- Submitting: button → spinner, form disabled, "Analyzing your P&L..." message
- Success: redirect to `/results/[id]`
- Server error (parse failure, upload failure): banner error, form re-enabled, file re-upload allowed without re-typing other fields

## `/results/[id]` — Analysis Results

**Module:** [02-registration-and-pnl-upload](02-registration-and-pnl-upload.md) · **Access:** owner (or public-by-id right after registration, TBD access model — default to auth-required + owner-only via RLS)

**Layout:**
- Nav bar (logged-in state: shows Dashboard link)
- Summary header: company name, P&L period, headline metric callouts (net profit, margin %)
- Chart grid (Recharts):
  - Revenue trend (line)
  - Gross margin % (line/area)
  - Opex breakdown (stacked bar or pie)
  - Net profit trend (line)
  - MoM/YoY comparison (bar)
  - Revenue growth: price/volume/mix decomposition (waterfall or stacked bar)
- "Results emailed to you" confirmation banner
- CTA: link to dashboard / book consultation (no checkout in this build, just contact/interest CTA)

**States:**
- Loading: skeleton charts while data fetches
- Empty/error: "Results not found" if `id` invalid or not owned by viewer

## `/login` — Login

**Module:** [03-auth-and-dashboard](03-auth-and-dashboard.md) · **Access:** public

**Layout:**
- Minimal nav (logo only)
- Centered card: email field, password field, submit button
- "Forgot password?" link (Supabase Auth password reset)
- Link to `/register` for new users

**States:**
- Default: empty form
- Invalid credentials: inline/banner error
- Submitting: button spinner
- Success: redirect by role (`user` → `/dashboard`, `admin` → `/admin`)

## `/dashboard` — User Dashboard

**Module:** [03-auth-and-dashboard](03-auth-and-dashboard.md) · **Access:** authenticated user

**Layout:**
- Nav bar (logged-in: user menu, logout)
- Page header: "Your Analyses"
- List/table of past analyses: date, P&L type, headline metric, "View" link → `/results/[id]`
- Sorted newest first

**States:**
- Loading: skeleton rows
- Empty: "No analyses yet" (edge case, since analysis happens at registration — shouldn't normally be empty for a logged-in user, but handle for safety)
- Populated: list as above

## `/admin` — Admin Home (Leads + Usage)

**Module:** [04-admin-crm](04-admin-crm.md) · **Access:** admin only

**Layout:**
- Nav bar (admin variant: Leads, Marketing tabs, logout)
- Usage summary row: stat cards (total leads, analyses this week/month, signups trend)
- Leads table: columns — name, company, job role, email, mobile, P&L type, signup date
  - Search/filter bar above table
  - Row checkboxes for multi-select (feeds segment into Marketing panel)
  - Sortable columns
- "Send to Marketing" action bar (appears when rows selected) → jumps to `/admin/marketing`

**States:**
- Loading: skeleton table
- Empty: "No leads yet"
- Non-admin visiting: blocked (redirect to `/login` or 403 page)

## `/admin/marketing` — Push-Marketing Panel

**Module:** [05-marketing-push](05-marketing-push.md) · **Access:** admin only

**Layout:**
- Tab bar: FB | Email | WhatsApp
- Segment summary bar: shows currently selected lead count/filter (carried from Leads table, or ad-hoc filter builder here)
- **FB tab:** selected leads preview → "Push to Meta Custom Audience" button → result banner (success/fail + count synced)
- **Email tab:** subject field, body editor (rich text or markdown), preview pane, "Send" button
- **WhatsApp tab:** message compose field, "Send" button disabled + tooltip ("Provider not configured yet") until provider wired
- Send history table below tabs: past `marketing_campaigns` (type, segment, sent_at, sent_by)

**States:**
- FB tab, no Meta token configured: disabled state, "Connect Meta Business account" prompt
- Sending: button spinner, disabled during send
- Success: confirmation banner + row appended to send history
- Failure: error banner with reason (API error, invalid segment, etc.)

## Shared Components

- **Nav bar**: 3 variants — public (logo, articles, login, CTA), user (logo, dashboard, logout), admin (logo, leads, marketing, logout)
- **Chart card**: wraps each Recharts chart with title, optional info tooltip
- **Stat card**: label + big number, used in admin usage view
- **Empty state**: icon + message + optional action, reused across dashboard/admin
- **Form field**: label + input + inline error, reused across register/login

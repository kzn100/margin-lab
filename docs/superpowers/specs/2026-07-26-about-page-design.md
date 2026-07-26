# About page — Keng Zhing Ng (Margin Lab)

Date: 2026-07-26

## Purpose

A public `/about` page introducing the consultant behind Margin Lab: career
credibility for the RGM/pricing work the product is built on, plus a way to
contact him directly (WhatsApp, LinkedIn, office address). Linked in the
main site nav alongside Articles / How it works / Log in.

## Sources

- `KZN_CV2026_Feb v2 updated_phone.doc` — full career history, education,
  interests.
- CEOInsights Asia Magazine feature (July 2024) — quotes, quick facts
  (hobbies, cuisine, book, travel), leadership philosophy.
- LinkedIn profile `linkedin.com/in/kengzhing` — partial fetch only
  (LinkedIn blocks scraping); used for the official embeddable profile
  badge, not for scraped bio text.

## Route & files

- `src/app/about/page.tsx` — new static route, server component,
  `export const metadata`.
- `src/app/about/about.module.css` — page-local styles, reusing the type
  scale and class names already established in
  `src/app/articles/[slug]/article.module.css` (`.kicker`, `.head`, `.dek`,
  `.byline`, `.who`, `.prose`) so it reads as the same design system.
  Reuses global `.tiles`/`.tile`, `.card`, `.avatar-lg`, `.btn`,
  `.inlineCta` from `design-system/tokens.css` rather than redefining them.
- `src/components/SiteChrome.tsx` — add `About` link to the marketing nav;
  extend the `current` prop union with `"about"`.

Content is static JSX in the page component. Not added to
`src/lib/articles.ts`'s `ARTICLES` array — it isn't a dated, repeatable
content type like an RGM 101 post, and forcing it into that schema would
require a hero image and article card treatment it doesn't need.

## Page sections (top to bottom)

1. **Header** — kicker "About", h1 "Keng Zhing Ng", dek positioning him as
   the RGM/pricing consultant behind Margin Lab.
2. **Byline** — initials avatar ("KN", reusing `.avatar-lg`), role line,
   text link to LinkedIn profile. No date/read-time (this isn't a dated
   article).
3. **Stat row** (reuses global `.tiles`/`.tile`) — four credibility
   numbers pulled from the CV:
   - £51M — P&L managed, Reckitt Benckiser Europe/Turkey/ANZ ecommerce
   - 105% — YoY sales growth, KSK Land / 8 Conlay
   - 20M — subscribers affected by pricing changes he drove at CelcomDigi
   - MSc — Imperial College Business School
4. **Narrative prose** (`.prose`, plain `<p>`/`<h2>` blocks) — 4-6 short
   sections tracing the RGM/pricing arc, framed as "why Margin Lab exists"
   rather than a CV list: Reckitt Benckiser global ecommerce & pricing
   strategy → Mars Wrigley UK ecommerce → Stanley Black & Decker regional
   ecommerce → KSK Land CCO (the margin/pricing work at 8 Conlay that
   seeded Margin Lab) → CelcomDigi pricing analytics → OCR Group CMO today.
5. **Quick facts** (`.card` grid) — scuba diver (Elphinstone Reef, Blue
   Hole Dahab, Silfra Rift), startup investor (Brewdog, Landbay), languages
   (English, Bahasa Malaysia, Mandarin, Cantonese). The human-interest
   touch requested.
6. **Get in touch** (`.card`) — new block:
   - Office address: **placeholder** — `Unit 3-1, Level 3, Menara Ara
     Damansara, Jalan PJU 1A/7A, Ara Damansara, 47301 Petaling Jaya,
     Selangor`. Marked with a code comment as a placeholder to be replaced
     with the real address.
   - WhatsApp QR code linking to `https://wa.me/60128174628`.
   - LinkedIn QR code linking to `https://www.linkedin.com/in/kengzhing/`.
   - Official LinkedIn Profile Badge embed (`platform.linkedin.com/badges/
     js/profile.js`, `data-vanity="kengzhing"`) — LinkedIn's own sanctioned
     embed widget (photo, name, headline, "View profile" button). Not a
     scraped/fabricated card.
7. **Closing CTA** (`.inlineCta`, matching every other page) → `/register`,
   "Get my free analysis".

## QR codes

No QR-generation library exists in the project. Adding `qrcode` (npm,
MIT — the standard, well-maintained choice; hand-rolling QR encoding/error
correction is not a reasonable few-line alternative).

Generated **server-side at request/build time** via `QRCode.toString(url,
{ type: "svg" })` and inlined directly into the page markup. Deliberately
not a client-side script and not a call to a third-party QR image API:
- no runtime network dependency on an external service's uptime
- no page-load-time request that leaks the target URL/phone number to a
  third party
- inline SVG scales cleanly and matches the site's icon style

A small helper (`qr(url: string): Promise<string>` returning raw SVG
markup) lives in `src/app/about/page.tsx` itself — two call sites, not
worth a shared lib module.

## Out of scope

- No CMS/array entry for this content (see above).
- No new nav sections beyond the single "About" link.
- Real office address — placeholder only until the user supplies it.

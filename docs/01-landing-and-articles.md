# Module: Landing Page + RGM 101 Articles

## Context

First touchpoint for cold traffic. Job: establish credibility (RGM 101 content,
sample analysis graphics), pitch free P&L analysis offer, drive to `/register`.
No auth required — fully public. Articles double as SEO/content-marketing
surface and pre-sell the value of the analysis before asking for data.

Visuals (hero, section graphics) generated via Higgsfield at design time —
static/animated images, not video, not runtime-generated per visitor.

## Key Requirements

- `/` — hero (Higgsfield graphic) + pitch copy + CTA button → `/register`,
  article teasers, sample graphs (static examples of what a real analysis looks like).
- `/articles/[slug]` — MDX-rendered RGM 101 articles, git-versioned (no CMS,
  content authored as MDX files in repo).
- No login needed anywhere in this module.

## Supabase Touchpoints

None required for rendering — this module is fully static/MDX. If article
view-tracking or teaser personalization is added later, it would read Supabase,
but MVP has no such requirement.

## UX Flow

1. Visitor lands on `/` (organic, ad, or referral).
2. Sees hero graphic + pitch ("Free P&L Analysis") + CTA.
3. Scrolls: article teasers (RGM 101 topics) + sample analysis graphics build trust.
4. Either:
   - Clicks article teaser → `/articles/[slug]` → reads MDX article → CTA back to `/register`, or
   - Clicks primary CTA directly → `/register`.
5. Lands on registration form ([module 02](02-registration-and-pnl-upload.md)).

## Open Items

None specific to this module — Higgsfield asset generation happens design-time,
outside runtime app flow.

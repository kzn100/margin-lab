# Design System

The token and rule set every page in this platform is built from. Agent-consumable:
if you are generating a page, read this file first and build only from these tokens.

**Design read:** analytics product for SME owners and finance managers. Bright,
saturated data colors on a quiet neutral shell. The data is the only loud thing on
the page.

## Two places this system lives

| | Where | Status |
|---|---|---|
| **The app** | `src/app/**` (Next.js 16, App Router) | `/`, `/articles`, `/articles/[slug]` are built |
| **The reference** | `design-system/*.html` | All 18 screens, static, no build step |

`design-system/tokens.css` is a **symlink** to `src/app/tokens.css`, so the reference
pages and the app share one stylesheet by construction. Edit either path and both move.
Note that tools which refuse to write through symlinks will silently skip it: write to
`src/app/tokens.css` and verify the rule actually landed.

There is **no `index.html`**. In the App Router the landing page is `src/app/page.tsx`.

**Article photography is placeholder.** `/public/articles/*.jpg` are random stock
frames that do not match their articles. Replace them with real or generated imagery
(the spec calls for Higgsfield at design time) before this goes in front of traffic.
Keep the two-crop convention: `-wide.jpg` at 16:9 and `-square.jpg` at 1:1.

## Reference implementations

One stylesheet holds every token and the shared shell. The three pages link it and add
only what is unique to them. Open each in a browser, toggle light and dark, and try the
interactive bits before porting.

**Start here: [`design-system/board.html`](../design-system/board.html)** puts all 18
screens on one pan-and-zoom canvas, grouped by surface. It embeds the real pages in
frames rather than redrawing them as mockups, so the board cannot drift from the
implementation: change a page, reload the board, it is current. Drag to pan, ctrl or ⌘
with the wheel to zoom, `Fit` to frame everything, `Interactive` to click into a frame,
`Open` on any frame to load that exact state as its own page.

| File | Covers | What is unique to it |
|---|---|---|
| [`design-system/board.html`](../design-system/board.html) | **Review canvas** | All 18 frames on one page, theme toggle that drives every frame at once |
| [`design-system/chart.js`](../design-system/chart.js) | **Shared chart runtime** | `responsiveChart`, svg + bar-path helpers, `niceStep`, the tooltip |
| [`design-system/tokens.css`](../design-system/tokens.css) | **All tokens + every shared component** | Colors, type, radius, header, buttons, cards, controls, form fields, stat tiles, hero figure, badges, data table, tabs, pager, toolbar, banners, empty/loading states, chart tooltip, footer |
| [`design-system/pnl-results.html`](../design-system/pnl-results.html) | `/results/[id]` | 5 chart forms, crosshair tooltips, P&L statement table |
| [`design-system/article.html`](../design-system/article.html) | `/articles/[slug]` | Reading layout, prose scale, sticky table of contents, inline chart, related cards |
| [`design-system/auth.html`](../design-system/auth.html) | `/login` **and** `/register` | Split-screen auth, every form state, dropzone, password meter |
| [`design-system/dashboard.html`](../design-system/dashboard.html) | `/dashboard` | Analysis history table, status badges, populated / loading / empty |
| [`design-system/admin.html`](../design-system/admin.html) | `/admin` **and** `/admin/marketing` | Leads table with multi-select, usage chart, channel tabs, live email preview, 403 |

Four pages carry a **reference-only toolbar** at the top that switches route and state
without editing code. Delete every `.refbar` block when porting; it is not product UI.

| Page | Routes | States you can switch to |
|---|---|---|
| `auth.html` | `/login`, `/register` | default, error, submitting |
| `dashboard.html` | `/dashboard` | populated, loading, empty |
| `admin.html` | `/admin`, `/admin/marketing` | populated, loading, empty, no access |

Every state is also **deep-linkable by URL**, which is how the board embeds them:

```
auth.html?route=register&state=submitting
admin.html?route=marketing&tab=email
admin.html?state=forbidden
dashboard.html?state=empty
pnl-results.html?table=1
```

Shared params: `?theme=light|dark` pins the theme, `?ref=0` hides the reference bar.
`ref=0` **hides** the bar rather than removing it, because the route and state buttons
live inside it and `setRoute`/`setState` read them. Removing it made every deep link
silently fail.

---

## 1. Foundations

### 1.1 Typeface

`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` everywhere, including the
hero figure. No display face, no serif, no webfont (keeps LCP clean).

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Hero figure | 56px / 44px mobile | 600 | -0.03em |
| Page title | 30px | 600 | -0.02em |
| Section title | 20px | 600 | -0.01em |
| Card title | 15px | 600 | 0 |
| Body | 15px | 400 | 0 |
| Stat value | 28px | 600 | -0.02em |
| Label / axis / legend | 12px | 500 | 0.01em |
| Micro | 11px | 500 | 0.02em |

Figures: proportional by default. `font-variant-numeric: tabular-nums` **only** in
table columns and axis ticks.

**Reading scale** (articles only, `.prose`):

| Role | Size | Line height | Notes |
|---|---|---|---|
| Article title | 40px / 30px mobile | 1.12 | max 20ch, weight 600, tracking -0.025em |
| Dek | 19px | 1.55 | secondary ink, max 58ch |
| Prose body | 17px | 1.7 | secondary ink, **max 68ch measure** |
| Prose h2 | 24px | 1.25 | primary ink, 48px top margin |
| Prose h3 | 18px | 1.4 | primary ink, 34px top margin |
| Caption / byline | 13px | 1.5 | muted ink |

Body copy is secondary ink, not primary. `<strong>` promotes to primary ink, which is
what makes bold actually read as emphasis instead of just heavier gray.

### 1.2 Icons

`@phosphor-icons/react` only, one family across the whole app, `weight="regular"` at
16px and 20px. Never hand-roll an SVG icon path in the Next.js app. (The static
reference page inlines a handful of glyphs because it ships zero dependencies. That is
the exception, not the pattern.)

### 1.3 Spacing

4px base. Allowed steps: `4 8 12 16 20 24 32 40 56 72`. Section vertical rhythm is
`56px` desktop / `40px` mobile. Card padding `20px`.

### 1.4 Radius (locked, do not mix)

| Element | Radius |
|---|---|
| Card / panel | `10px` |
| Button / input / select / chip | `6px` |
| Data-end of a bar | `4px` |
| Avatar / dot | full |

### 1.5 Elevation

No drop shadows on cards. Cards are `1px` hairline border + surface fill. Shadows are
reserved for genuinely floating layers only (tooltip, dropdown), tinted to the
background hue, never pure black.

```
--shadow-float: 0 6px 24px rgba(11,11,11,0.10);   /* light */
--shadow-float: 0 6px 24px rgba(0,0,0,0.55);      /* dark  */
```

### 1.6 Layout

- Page container `max-width: 1280px`, `padding-inline: 24px` (16px < 768px).
- Grid, never flex percentage math. Every multi-column block declares its `< 768px`
  collapse to one column.
- Sticky header `64px`, single line at desktop **and on a phone**. When it stops
  fitting, drop ornament first (the `Admin` chip), then identity text, then secondary
  links (`Log in` goes before the primary CTA on a marketing page). Never let it wrap.
- **Measuring header height does not prove the header fits.** Without
  `white-space: nowrap` the bar silently stays 64px while the wordmark and link labels
  break across two lines each. The brand and every nav link carry `nowrap`, so a header
  that does not fit fails loudly instead of degrading into wrapped text.
- Full-height sections use `min-height: 100dvh`, never `100vh`.

### 1.7 Images and art direction

A 16:9 hero letterboxed into a phone is about 200px tall and reads as a banner, not as
a picture. **Change the crop, do not just scale the frame.**

| Viewport | Hero ratio | Source served |
|---|---|---|
| > 620px | 16:9 | `1600/900` |
| ≤ 620px | **1:1 square tile** | `900/900`, same seed, same photo |

Use `<picture>` with a `media` source, never `object-fit` alone. `object-fit: cover` on
a wide file crops blindly and will cut the subject; a genuinely square source is
composed for that shape and also ships fewer bytes to the device that can least afford
them.

```html
<picture>
  <source media="(max-width: 620px)" srcset="…/900/900" width="900" height="900">
  <img src="…/1600/900" alt="…" width="1600" height="900" fetchpriority="high">
</picture>
```

Two rules that are easy to get wrong:

- **The CSS `aspect-ratio` must match the source actually served at that width.**
  Otherwise the browser reserves the wrong box (layout shift) and `object-fit` crops the
  square a second time.
- **`img { height: auto }` is required, not cosmetic.** The HTML `width`/`height`
  attributes are presentational hints; with both definite, the used height wins and any
  CSS `aspect-ratio` is silently ignored. Keep the attributes, since they reserve the box
  and prevent CLS, and let `aspect-ratio` drive the shape.

Card and thumbnail images stay at their desktop ratio on mobile. They stack full width,
and a square would turn three cards into three full screens of scrolling.

### 1.8 Touch

Target sizing is keyed to `@media (pointer: coarse), (max-width: 620px)`. The pointer
query is the real question: a large tablet needs 44px targets even though it is wide,
and a narrow desktop window does not. The width clause is a companion so narrow
windows, and the review board's mobile frames, show the same sizing honestly.

| Element | Touch minimum |
|---|---|
| Buttons, links styled as buttons | 44px |
| Icon buttons | 44 × 44px |
| Inputs, selects, textareas | 44px |
| Segmented, tab and pager buttons | 40px |
| Table sort controls | 38px (17px by default, inside a `th`) |
| Table row checkboxes | 20px control in a 44px cell |

Nothing may push the page sideways. Wide tables scroll inside `.dtable-wrap`; charts
re-lay-out. Verify with `window.scrollX` after `scrollTo(400, 0)`: it must stay `0`.
Measure this in a real viewport, not a nested iframe, which reports phantom overflow.

---

## 2. Color tokens

One accent for the whole product: **blue `#2a78d6`** (light) / `#3987e5` (dark). It is
the primary CTA, the focus ring, the sequential hue, and categorical slot 1. No section
introduces a second accent.

### 2.1 Shell (chrome and ink)

| Token | Light | Dark |
|---|---|---|
| `--page` | `#f9f9f7` | `#0d0d0d` |
| `--surface` | `#fcfcfb` | `#1a1a19` |
| `--surface-2` | `#f2f1ed` | `#232322` |
| `--text-primary` | `#0b0b0b` | `#ffffff` |
| `--text-secondary` | `#52514e` | `#c3c2b7` |
| `--text-muted` | `#898781` | `#898781` |
| `--border` | `rgba(11,11,11,0.10)` | `rgba(255,255,255,0.10)` |
| `--grid` | `#e1e0d9` | `#2c2c2a` |
| `--axis` | `#c3c2b7` | `#383835` |
| `--accent` | `#2a78d6` | `#3987e5` |
| `--accent-ink` | `#ffffff` | `#0d0d0d` |
| `--success-text` | `#006300` | `#0ca30c` |

### 2.2 Categorical series (fixed order, assigned in sequence, never cycled)

| Slot | Hue | Light | Dark |
|---|---|---|---|
| 1 | blue | `#2a78d6` | `#3987e5` |
| 2 | orange | `#eb6834` | `#d95926` |
| 3 | aqua | `#1baf7a` | `#199e70` |
| 4 | yellow | `#eda100` | `#c98500` |
| 5 | magenta | `#e87ba4` | `#d55181` |
| 6 | green | `#008300` | `#008300` |
| 7 | violet | `#4a3aa7` | `#9085e9` |
| 8 | red | `#e34948` | `#e66767` |

Validated (OKLab ΔE ×100, Machado 2009 at severity 1.0, adjacent pairlist):

```
light  CVD 9.1 · normal-vision 19.6 · aqua/yellow/magenta sub-3:1 on surface
dark   CVD 8.4 · normal-vision 19.3 · all slots >= 3:1
```

**Caps.**
- Scatter, bubble, and small-multiples use `--pairs all` rules: **maximum 3 series**.
  Past 3, fold to "Other" or facet. Do not invent a 9th hue.
- The three sub-3:1 light slots ship with visible direct labels or the table view.
  That relief is mandatory, not optional.

### 2.3 Sequential (magnitude: heatmaps, choropleth, intensity)

One hue, blue, light to dark.

```
100 #cde2fb · 200 #9ec5f4 · 300 #6da7ec · 400 #3987e5
500 #256abf · 600 #184f95 · 700 #0d366b
```

Ordinal ramps (funnel stages, tiers) start no lighter than `250 #86b6ef` on light and
no darker than `600 #184f95` on dark, so the end step still clears 2:1.

### 2.4 Diverging (polarity: variance vs budget, YoY swing)

blue `#2a78d6` ↔ red `#e34948`, neutral gray midpoint `#f0efec` light / `#383835` dark.
Equal step count per arm. Never a hue at the midpoint, never a rainbow.

### 2.5 Status (fixed, reserved, never reused as "series 4")

| Role | Hex | Use |
|---|---|---|
| good | `#0ca30c` | favourable variance, on-target |
| warning | `#fab219` | watch |
| serious | `#ec835a` | at risk |
| critical | `#d03b3b` | unfavourable variance, breach |

Always shipped with an icon **and** a label. On the light surface `warning` and
`serious` sit below 3:1 by design; the icon + label pairing is the mitigation.

### 2.6 The collision rule (matters constantly in P&L)

A series that **means** good/bad wears status tokens. A series that is just "another
line" wears categorical. Never both in one chart. So:

- Revenue, COGS, Opex trend lines → categorical slots 1, 2, 3.
- Variance vs budget, margin delta, waterfall step direction → status good/critical.
- Never color a revenue bar green because revenue is nice.

---

## 3. Chart rules

### 3.1 Mark specs (fixed across every chart)

| Mark | Spec |
|---|---|
| Bar / column | ≤ 24px thick, 4px rounded data-end, square at the baseline |
| Line | 2px, round join and cap |
| Marker / end-dot | ≥ 8px diameter, filled series color, 2px surface ring |
| Area fill | series hue at ~10% opacity |
| Gridline / axis | hairline 1px, **solid** (never dashed), recessive gray |

### 3.2 The two spacers

- **Surface gap:** 2px in the surface color between every touching mark. Stacked
  segments and adjacent bars alike, one consistent width.
- **Surface ring:** 2px in the surface color around dots and end markers, so they stay
  legible where they cross. The ring is part of the hover hit target.

Never draw a border around a mark to separate it. The gap and the ring are the mechanism.

### 3.3 Hard prohibitions

- **No dual axis. Ever.** Two measures of different scale (RM and %) go in two charts.
  This is the single most common P&L chart mistake.
- No pie chart above 4 slices. Opex breakdown is a horizontal bar chart, sorted
  descending, single hue.
- No number on every data point. Label the endpoint, the extreme, or the one series the
  story is about.
- Color follows the entity, never its rank. Filtering out a series must not repaint the
  survivors.
- Text never wears the data color. Values, labels, legends, and axis text use text
  tokens; a colored dot or swatch beside the text carries identity. Exception: a label
  set inside a colored fill picks white or ink by that fill's luminance.

### 3.4 Charts must re-lay-out, never just shrink

**A fixed `viewBox` with `width: 100%` scales the entire drawing, text included.**
A 12px axis label on a 1180-unit viewBox rendered into a 390px phone comes out at
**3.2px**. This is the single worst mobile defect a chart can have, and it is invisible
on a desktop monitor.

Every chart therefore runs through `responsiveChart(svg, heightFor, draw)` in
`chart.js`: the viewBox width tracks the container's pixel width, so **1 user unit is
always 1 CSS pixel** and text renders at its true size at any width. `draw` re-runs on
resize via `ResizeObserver`, so it must be idempotent.

Below `NARROW` (560px) a chart changes **what it draws**, not just its size:

| Adaptation | Why |
|---|---|
| Abbreviated category labels (`Operating profit` becomes `OP`) | Two-line names need ~70px of band; a phone gives ~40px |
| Thinned axis ticks (every 2nd or 3rd) | Tick labels need ~30px each; overlap is worse than absence |
| Value labels move to the tooltip and the table | They do not fit above a 24px bar |
| Label gutters become a share of width, not a fixed 132px | A fixed gutter eats a third of a phone screen |
| Fewer gridlines | Same reason as ticks |

Axis ticks always round to clean numbers via `niceStep(range, targetTicks)`. Dividing
the range by a tick count gives `0 / 2,333 / 4,667`, which is not an axis.

Guard the resize handler on **width only**. Re-setting the viewBox changes the
element's height, which re-triggers the observer and loops forever.

### 3.5 Legend and labels

- Two or more series: legend always present.
- One series: **no legend box**. The card title already names it.
- Four or fewer series: also direct-label them, so identity is never color-alone.
- When end labels collide, use leader lines or small multiples. Never stack labels.

### 3.6 Form selection for this product

| Question the reader has | Form |
|---|---|
| What did we make? | Hero figure, one per view |
| Where did the money go? | Waterfall bridge (revenue to net profit) |
| Is it trending up? | Grouped columns + net profit line, all RM, one axis |
| Are margins improving? | Multi-line, % axis, separate chart |
| What is the cost stack? | Horizontal bars, descending, single hue |
| Why did revenue move? | Diverging bars (price / volume / mix) with status colors |
| Exact numbers | Table view, always available |

### 3.7 Interaction (default on, not an extra)

- Line and column time charts: **crosshair + shared tooltip** on the whole x-band.
- Bar, dot, cell: **per-mark tooltip**.
- The only form that ships without hover is a bare stat tile with no plot.
- Hit targets are larger than the mark.
- Filters live in **one row above the charts**, never inside a card.

### 3.8 Recharts mapping

```
CartesianGrid   stroke=var(--grid)  strokeDasharray=none  vertical={false}
XAxis / YAxis   stroke=var(--axis)  tick={{fill:'var(--text-muted)',fontSize:12}}
                axisLine={false} tickLine={false}
Bar             maxBarSize={24} radius={[4,4,0,0]}
Line            strokeWidth={2} dot={false} activeDot={{r:5,strokeWidth:2,stroke:'var(--surface)'}}
Area            fill=<series hue> fillOpacity={0.10} strokeWidth={2}
Tooltip         content={<ChartTooltip/>}   // custom, never the Recharts default
Legend          content={<ChartLegend/>}    // custom, dot + text token
```

The stacked-bar 2px surface gap is not a Recharts prop. Get it with
`stroke="var(--surface)" strokeWidth={2}` on each `<Bar>` in the stack.

---

## 4. Components

### 4.1 Stat tile

`label` (sentence case, no trailing colon) · `value` (semibold, auto-compact:
1,284 / 12.9K / RM 4.2M) · `delta` (optional, signed, names its comparison period,
colored by direction × whether up is good, always with an arrow glyph) ·
`trend` (optional, 12-point sparkline, muted hue with the current period in accent).

### 4.2 Hero figure

The one number a view leads with. ≥ 48px, same sans as everything else. **Exactly one
per view.** Carries its delta and its period label.

### 4.3 Chart card

Hairline border, 10px radius, 20px padding. Header row: title (15px/600) + optional
subtitle (12px muted) on the left, optional unit chip on the right. Plot below.
Legend under the plot, left-aligned. Footnote in 11px muted if the numbers need a
caveat.

### 4.4 Table view

Every chart section has a reachable table. `tabular-nums`, right-aligned numerics,
hairline row separators only (never both top and bottom borders on every row), a single
2px rule under each subtotal. Variance columns wear status good/critical **and** carry
the sign in the number, so the meaning never rides on color alone.

Do not make the header sticky inside an `overflow-x` wrapper: the wrapper becomes the
scroll ancestor and `top` resolves against it, not the viewport. Sticky headers need a
scroll container that is actually the page.

### 4.5 States (all four required, no exceptions)

- **Loading:** skeleton in the shape of the final chart. No spinner.
- **Empty:** icon + one sentence + the action that populates it.
- **Error:** inline for fields, banner for the page, with the actual reason.
- **Active:** `transform: translateY(-1px)` or `scale(0.98)` on press.

### 4.6 Form field

Fixed order, no exceptions: **label above, helper below the label, control, error
below the control.** Never placeholder-as-label. A placeholder may only show format
(`+60 12 345 6789`), never the field's name.

```html
<div class="field">                    <!-- add .field-error to turn the ring red -->
  <label for="email">Work email</label>
  <p class="help">We send the finished analysis here.</p>
  <input class="input" id="email" type="email">
  <p class="err">…icon… That email is already registered.</p>
</div>
```

Two composite controls wrap their own input and therefore carry a class
(`.drop`, `.choice`). **The plain-label rule in `tokens.css` deliberately excludes
anything with a class** (`.field label:not([class])`). Without that exclusion it
outranks their own layout and flattens them into a flex row. It is a descendant
selector, not a child selector, because a label inside `.label-row` (label on the
left, "Forgot password?" on the right) is a grandchild.

Error copy names the fix, not the failure. "Missing the Revenue and COGS columns.
Compare against the template." beats "Invalid file."

### 4.7 Auth surface

Split screen, form on the left (max 420px), proof panel on the right. Never a centered
card floating on a gradient. Below 900px the panel drops under the form.

The right panel is product UI, so it uses real proof (three stats, three deliverables,
one attributed quote) rather than stock photography. Marketing pages get photography;
auth pages get evidence.

**Every auth form ships three states**, and the reference page lets you switch between
them: default, error (page banner + per-field ring + inline message), and submitting
(button shows a spinner and its own label, every input disabled). A submitting state
that only spins the button while inputs stay live is incomplete.

The dropzone is the one place a dashed border is allowed. The "never dashed" rule in
§3.1 governs chart gridlines and axes, where dashes read as data.

### 4.8 Data table

For lists of records (analyses, leads, send history). Distinct from the P&L statement
table in §4.4, which is a financial statement and follows accounting conventions.

- Uppercase 11px column headers, one 1px rule under the header, one hairline between
  rows. **Never a border on both sides of every row.**
- Text columns left-aligned. Numeric columns right-aligned with `tabular-nums`.
  The last column is right-aligned and holds the row action.
- Sortable headers are a `<button>` inside the `<th>`, with `aria-sort` on the `th`.
  The caret is invisible until hover or until that column is the active sort.
- Row hover tints to `--surface-2`. Selected rows tint to `--accent-wash`.
- Multi-select: checkbox column first, a select-all in the header that goes
  **indeterminate** on a partial selection, and an action bar that appears only when
  something is selected.
- Pagination sits below the table and always states the range and the total
  ("Showing 1 to 7 of 284"). A pager with no total is a dead end.

Wrap in `.dtable-wrap` for horizontal overflow. Do not make the header sticky inside
it, for the reason in §4.4.

### 4.9 Status badge

State wears the reserved status palette and **always ships the word next to the dot**.
A bare colored dot is banned: it fails colorblind readers and screen readers at once.

| State | Class | Reads as |
|---|---|---|
| Ready, Delivered | `.badge-good` | done, nothing to do |
| Processing, queued, neutral counts | `.badge-neutral` | in flight, not a judgement |
| Partial, needs attention | `.badge-warning` | landed, but check it |
| Failed, expired | `.badge-critical` | broken, act now |

Processing is deliberately neutral, not warning. A job that is running normally is not
a problem, and coloring it amber trains people to ignore amber.

### 4.10 Admin surfaces

- **Filters in one row above the table**, never inside it, never in a sidebar.
- The leads table selection feeds the marketing segment. Selecting rows and pressing
  "Send to marketing" carries the segment across; the marketing page always states the
  segment it received in plain language.
- **A 403 must not leak the page it guards.** Swap the heading to a neutral one, hide
  nav links to the areas the user cannot reach, and give one route back out.
- Unconfigured integrations get an explicit disabled state with the reason and the
  steps to fix it, not a hidden tab. The WhatsApp panel is the worked example: compose
  and save work, sending is disabled until a provider is wired.
- Any panel that composes a message carries a **live preview** with sample
  personalisation resolved. Never ship a send button without showing what gets sent.
- Send history is permanent and shows who sent what, to how many, and the outcome.

### 4.11 Article page

- Prose column plus a sticky table of contents at 232px. Under 940px the rail is
  removed, not collapsed into an accordion.
- Active TOC state is driven by `IntersectionObserver`. Never a scroll listener.
- The reading progress rail uses native scroll-driven animation
  (`animation-timeline: scroll(root block)`) behind an `@supports` guard and a
  reduced-motion guard. No JavaScript, no scroll handler.
- Charts inside articles use the identical mark specs and tokens as the product. An
  article chart that looks different from a product chart undermines both.

---

## 5. Accessibility (non-negotiable)

- Contrast: WCAG AA minimum for body text, 3:1 for marks. The three sub-3:1 light
  categorical slots ship with visible labels or the table view.
- Identity is never color-alone: legend + direct label + table for every chart, icon +
  label for every status.
- Focus ring: 2px `--accent` at 2px offset, on every interactive element.
- `prefers-reduced-motion: reduce` collapses every transition and entry animation to
  instant. Charts render in final state.
- `prefers-contrast: more` and `forced-colors` swap fills for the texture channel: one
  hand-drawn line fill at 45° and its 135° mirror only. Never decorative, never on by
  default.
- Page theme lock: the whole page is light, or the whole page is dark. No section
  inverts mid-scroll. Default follows `prefers-color-scheme`; a manual toggle wins both
  ways.

---

## 6. Voice

Concrete, quantitative, no filler verbs. Banned: elevate, seamless, unleash,
next-gen, revolutionize, "quietly trusted by". No em-dashes anywhere in visible copy.

Numbers are either real, or explicitly marked as sample data. Never fake precision the
analysis does not actually compute.

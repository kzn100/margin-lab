/* ============================================================
   SHARED CHART RUNTIME  ·  see docs/09-design-system.md §3.8
   Loaded by pnl-results.html, article.html, admin.html
   ============================================================ */

/* ------------------------------------------------------------
   responsiveChart(svg, heightFor, draw)

   A fixed viewBox with width:100% scales the ENTIRE drawing to fit,
   text included. A 12px axis label on a 1180-unit viewBox rendered
   into a 390px phone comes out at 3.2px, which is unreadable.

   So the viewBox tracks the container's pixel width instead:
   1 user unit == 1 CSS px at every size, text stays 12px, and the
   chart re-lays-out rather than shrinking. `draw` is re-run on
   resize, so it must be idempotent.
   ------------------------------------------------------------ */
function responsiveChart(svg, heightFor, draw) {
  let lastW = 0;
  const render = () => {
    const w = Math.round(svg.getBoundingClientRect().width);
    /* Guard on width only. Re-setting the viewBox changes the element's
       height (aspect-ratio from width:100%/height:auto), which would
       re-trigger the observer and loop forever. */
    if (!w || w === lastW) return;
    lastW = w;
    const h = heightFor(w);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    draw(svg, w, h);
  };
  render();
  new ResizeObserver(render).observe(svg);
  return render;
}

/* Single breakpoint for chart layout decisions. Below this a chart
   changes what it draws (abbreviated labels, fewer ticks), it does
   not just get smaller. */
const NARROW = 560;
const isNarrow = w => w < NARROW;

/* ---------- svg helpers ---------- */
const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function text(parent, x, y, str, o = {}) {
  const t = el('text', {
    x, y,
    fill: o.fill || 'var(--text-muted)',
    'text-anchor': o.anchor || 'middle',
    style: `font-size:${o.size || 12}px;font-weight:${o.weight || 500};` +
           (o.tabular ? 'font-variant-numeric:tabular-nums;' : '')
  }, parent);
  t.textContent = str;
  return t;
}

/* Mark specs: 4px rounded data-end, square at the baseline. */
function barPath(x, y, w, h, r, dir) {
  r = Math.max(0, Math.min(r, w / 2, Math.abs(h)));
  if (h <= 0.5) return `M${x},${y} h${w} v${Math.max(h, 0.5)} h${-w} Z`;
  return dir === 'down'
    ? `M${x},${y} h${w} v${h - r} q0,${r} ${-r},${r} h${-(w - 2*r)} q${-r},0 ${-r},${-r} Z`
    : `M${x},${y + r} q0,${-r} ${r},${-r} h${w - 2*r} q${r},0 ${r},${r} v${h - r} h${-w} Z`;
}
function barPathRight(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, h / 2, w));
  if (w <= 0.5) return `M${x},${y} v${h} h0.5 v${-h} Z`;
  return `M${x},${y} h${w - r} q${r},0 ${r},${r} v${h - 2*r} q0,${r} ${-r},${r} h${-(w - r)} Z`;
}
function barPathLeft(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, h / 2, w));
  if (w <= 0.5) return `M${x},${y} v${h} h-0.5 v${-h} Z`;
  return `M${x},${y} h${-(w - r)} q${-r},0 ${-r},${r} v${h - 2*r} q0,${r} ${r},${r} h${w - r} Z`;
}

/* ------------------------------------------------------------
   niceStep(range, targetTicks)
   Axis ticks round to clean numbers (0 / 2,000 / 4,000), never to
   whatever range/n happens to produce (0 / 2,333 / 4,667). Narrow
   charts carry fewer ticks, so the step has to be recomputed per
   width rather than fixed.
   ------------------------------------------------------------ */
function niceStep(range, targetTicks) {
  const raw = range / Math.max(1, targetTicks);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return mult * mag;
}

/* ---------- number formatting ---------- */
const fmtK = v => Math.round(v).toLocaleString('en-US');
const fmtSigned = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtK(Math.abs(v));

/* ---------- shared tooltip ----------
   Hover is a default, not an extra. Hit targets are always the full
   band, never just the mark.
   ------------------------------------------------------------ */
const tip = (() => {
  let node = document.getElementById('tip');
  if (!node) {
    node = document.createElement('div');
    node.id = 'tip';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    document.body.appendChild(node);
  }
  return node;
})();

let tipOn = false;

function moveTip(evt) {
  const pad = 8, w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.transform = (evt.clientY - h - 12 < pad)
    ? 'translate(-50%, 16px)'
    : 'translate(-50%, calc(-100% - 12px))';
  tip.style.left = Math.min(Math.max(evt.clientX, w / 2 + pad), window.innerWidth - w / 2 - pad) + 'px';
  tip.style.top = evt.clientY + 'px';
}
function showTip(evt, html) { tip.innerHTML = html; tip.style.opacity = '1'; tipOn = true; moveTip(evt); }
function hideTip() { tip.style.opacity = '0'; tipOn = false; }

window.addEventListener('pointermove', e => { if (tipOn) moveTip(e); }, { passive: true });
window.addEventListener('scroll', () => { if (tipOn) hideTip(); }, { passive: true });

function row(color, k, v) {
  return `<div class="t-row">${color ? `<i style="background:${color}"></i>` : ''}` +
         `<span class="k">${k}</span>${v != null ? `<span class="v">${v}</span>` : ''}</div>`;
}

/* Touch needs an explicit dismiss, and a tap must not leave the tooltip
   stuck over the chart. Pointer events cover mouse, pen and touch. */
function bindTip(node, builder) {
  node.addEventListener('pointerenter', e => showTip(e, builder()));
  node.addEventListener('pointerdown',  e => showTip(e, builder()));
  node.addEventListener('pointerleave', hideTip);
  node.addEventListener('pointercancel', hideTip);
}

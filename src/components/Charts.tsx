"use client";

/**
 * Sample charts for the marketing surface.
 *
 * These are proof visuals, so they are deliberately non-interactive: no
 * tooltips, no crosshair. The product charts in /results carry those.
 *
 * Every chart re-lays-out on resize rather than scaling. A fixed viewBox with
 * width:100% scales the whole drawing including text, which renders a 12px
 * axis label at ~3px on a phone. See docs/09-design-system.md section 3.4.
 */

import { useEffect, useRef } from "react";

const SVG_NS = "http://www.w3.org/2000/svg";
const NARROW = 560;
const isNarrow = (w: number) => w < NARROW;

type Attrs = Record<string, string | number>;

function el(tag: string, attrs: Attrs, parent: SVGElement): SVGElement {
  const n = document.createElementNS(SVG_NS, tag) as SVGElement;
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  parent.appendChild(n);
  return n;
}

function text(
  parent: SVGElement,
  x: number,
  y: number,
  str: string | number,
  o: { size?: number; weight?: number; fill?: string; anchor?: string; tabular?: boolean } = {},
) {
  const t = el(
    "text",
    {
      x,
      y,
      fill: o.fill ?? "var(--text-muted)",
      "text-anchor": o.anchor ?? "middle",
      style:
        `font-size:${o.size ?? 12}px;font-weight:${o.weight ?? 500};` +
        (o.tabular ? "font-variant-numeric:tabular-nums;" : ""),
    },
    parent,
  );
  t.textContent = String(str);
  return t;
}

/** 4px rounded data-end, square at the baseline. */
function barPath(x: number, y: number, w: number, h: number, r: number, dir: "up" | "down") {
  r = Math.max(0, Math.min(r, w / 2, Math.abs(h)));
  if (h <= 0.5) return `M${x},${y} h${w} v${Math.max(h, 0.5)} h${-w} Z`;
  return dir === "down"
    ? `M${x},${y} h${w} v${h - r} q0,${r} ${-r},${r} h${-(w - 2 * r)} q${-r},0 ${-r},${-r} Z`
    : `M${x},${y + r} q0,${-r} ${r},${-r} h${w - 2 * r} q${r},0 ${r},${r} v${h - r} h${-w} Z`;
}
function barRight(x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, h / 2, w));
  if (w <= 0.5) return `M${x},${y} v${h} h0.5 v${-h} Z`;
  return `M${x},${y} h${w - r} q${r},0 ${r},${r} v${h - 2 * r} q0,${r} ${-r},${r} h${-(w - r)} Z`;
}
function barLeft(x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, h / 2, w));
  if (w <= 0.5) return `M${x},${y} v${h} h-0.5 v${-h} Z`;
  return `M${x},${y} h${-(w - r)} q${-r},0 ${-r},${r} v${h - 2 * r} q0,${r} ${r},${r} h${w - r} Z`;
}

/** Axis ticks round to clean numbers, never to range/n. */
function niceStep(range: number, targetTicks: number) {
  const raw = range / Math.max(1, targetTicks);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return mult * mag;
}

const fmtK = (v: number) => Math.round(v).toLocaleString("en-US");
const fmtSigned = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmtK(Math.abs(v));

type Draw = (svg: SVGSVGElement, w: number, h: number) => void;

function ResponsiveChart({
  heightFor,
  draw,
  label,
}: {
  heightFor: (w: number) => number;
  draw: Draw;
  label: string;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    let lastW = 0;
    const render = () => {
      const w = Math.round(svg.getBoundingClientRect().width);
      // Guard on width only: re-setting the viewBox changes the element's
      // height, which would re-trigger the observer and loop forever.
      if (!w || w === lastW) return;
      lastW = w;
      const h = heightFor(w);
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      draw(svg, w, h);
    };
    render();
    const ro = new ResizeObserver(render);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [draw, heightFor]);

  return (
    <svg
      ref={ref}
      role="img"
      aria-label={label}
      style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}
    />
  );
}

/* ---------------- data (sample, RM '000) ---------------- */

const BRIDGE = [
  { label: "Revenue", abbr: "Rev", full: "Revenue", type: "total", value: 6034 },
  { label: "COGS", abbr: "COGS", full: "Cost of goods sold", type: "dec", value: -3517 },
  { label: "Gross profit", abbr: "GP", full: "Gross profit", type: "total", value: 2517 },
  { label: "Opex", abbr: "Opex", full: "Operating expenses", type: "dec", value: -2148 },
  { label: "Net profit", abbr: "NP", full: "Net profit", type: "total", value: 240 },
] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GM = [40.0, 39.2, 40.0, 41.2, 39.6, 41.4, 41.9, 42.6, 42.6, 43.2, 42.7, 43.7];
const OM = [-0.7, -2.8, 1.6, 3.0, 0.2, 5.0, 6.3, 7.3, 9.1, 10.2, 10.1, 15.1];
const NM = [-3.4, -5.7, -0.9, 0.7, -2.3, 2.8, 4.2, 5.1, 7.1, 8.5, 8.4, 13.6];

const PVM = [
  { label: "Price", value: 512 },
  { label: "Volume", value: 389 },
  { label: "Mix", value: -75 },
];

/* ---------------- 1. margin bridge ---------------- */

const bridgeHeight = (w: number) => (isNarrow(w) ? 260 : 300);

const drawBridge: Draw = (svg, W, H) => {
  const narrow = isNarrow(W);
  const M = { t: 28, r: narrow ? 10 : 16, b: 34, l: narrow ? 42 : 56 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;

  let run = 0;
  let max = 0;
  const geo = BRIDGE.map((s) => {
    const start = s.type === "total" ? 0 : run;
    const end = s.type === "total" ? s.value : run + s.value;
    run = end;
    max = Math.max(max, start, end);
    return { ...s, start, end };
  });

  const niceMax = Math.ceil(max / 1000) * 1000;
  const Y = (v: number) => M.t + ih - (v / niceMax) * ih;
  const step = niceStep(niceMax, narrow ? 3 : 4);

  for (let v = 0; v <= niceMax; v += step) {
    el(
      "line",
      {
        x1: M.l,
        x2: W - M.r,
        y1: Y(v),
        y2: Y(v),
        stroke: v === 0 ? "var(--axis)" : "var(--grid)",
        "stroke-width": 1,
        "vector-effect": "non-scaling-stroke",
      },
      svg,
    );
    text(svg, M.l - 8, Y(v) + 4, fmtK(v), { anchor: "end", size: narrow ? 11 : 12, tabular: true });
  }

  const band = iw / geo.length;
  const BW = Math.min(24, band - (narrow ? 10 : 20));

  geo.forEach((s, i) => {
    const cx = M.l + band * i + band / 2;
    const x = cx - BW / 2;
    const top = Math.min(Y(s.start), Y(s.end));
    const h = Math.abs(Y(s.end) - Y(s.start));
    const fill = s.type === "total" ? "var(--s1)" : "var(--critical)";

    if (i > 0) {
      el(
        "line",
        {
          x1: M.l + band * (i - 1) + band / 2 + BW / 2 + 2,
          x2: x - 2,
          y1: Y(geo[i - 1].end),
          y2: Y(geo[i - 1].end),
          stroke: "var(--axis)",
          "stroke-width": 1,
          "vector-effect": "non-scaling-stroke",
        },
        svg,
      );
    }

    el(
      "path",
      { d: barPath(x, top, BW, Math.max(h, 2), 4, s.end >= s.start ? "up" : "down"), fill },
      svg,
    );

    if (!narrow) {
      text(
        svg,
        cx,
        top - 9,
        (s.type === "total" ? "" : "−") + fmtK(Math.abs(s.value)),
        { size: 12, weight: 600, fill: "var(--text-primary)", tabular: true },
      );
    }
    text(svg, cx, M.t + ih + 20, narrow ? s.abbr : s.label, {
      size: narrow ? 11 : 12,
      fill: "var(--text-secondary)",
    });
  });
};

export function MarginBridgeChart() {
  return (
    <ResponsiveChart
      heightFor={bridgeHeight}
      draw={drawBridge}
      label="Margin bridge from 6,034 thousand ringgit of revenue down to 240 thousand ringgit of net profit"
    />
  );
}

/* ---------------- 2. margin ladder ---------------- */

const ladderHeight = (w: number) => (isNarrow(w) ? 240 : 280);

const drawLadder: Draw = (svg, W, H) => {
  const narrow = isNarrow(W);
  const M = { t: 20, r: narrow ? 14 : 20, b: 34, l: narrow ? 38 : 42 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const lo = -10;
  const hi = 50;
  const Y = (v: number) => M.t + ih - ((v - lo) / (hi - lo)) * ih;
  const X = (i: number) => M.l + (i * iw) / (MONTHS.length - 1);

  for (let v = lo; v <= hi; v += 10) {
    el(
      "line",
      {
        x1: M.l,
        x2: W - M.r,
        y1: Y(v),
        y2: Y(v),
        stroke: v === 0 ? "var(--axis)" : "var(--grid)",
        "stroke-width": 1,
        "vector-effect": "non-scaling-stroke",
      },
      svg,
    );
    text(svg, M.l - 8, Y(v) + 4, `${v}%`, { anchor: "end", size: narrow ? 11 : 12, tabular: true });
  }

  const every = Math.max(1, Math.ceil(30 / (iw / (MONTHS.length - 1))));
  MONTHS.forEach((m, i) => {
    if (i % every) return;
    text(svg, X(i), M.t + ih + 20, m, { size: narrow ? 11 : 12, fill: "var(--text-secondary)" });
  });

  const series = [
    { data: GM, color: "var(--s1)" },
    { data: OM, color: "var(--s2)" },
    { data: NM, color: "var(--s3)" },
  ];
  series.forEach((s) => {
    const d = s.data
      .map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`)
      .join(" ");
    el(
      "path",
      {
        d,
        fill: "none",
        stroke: s.color,
        "stroke-width": 2,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        "vector-effect": "non-scaling-stroke",
      },
      svg,
    );
    el(
      "circle",
      {
        cx: X(11),
        cy: Y(s.data[11]),
        r: 4,
        fill: s.color,
        stroke: "var(--surface)",
        "stroke-width": 2,
        "vector-effect": "non-scaling-stroke",
      },
      svg,
    );
  });
};

export function MarginLadderChart() {
  return (
    <ResponsiveChart
      heightFor={ladderHeight}
      draw={drawLadder}
      label="Gross, operating and net margin percentages by month, all rising through the year"
    />
  );
}

/* ---------------- 3. revenue split ---------------- */

const splitHeight = (w: number) => (isNarrow(w) ? 190 : 220);

const drawSplit: Draw = (svg, W, H) => {
  const narrow = isNarrow(W);
  const M = { t: 14, r: narrow ? 48 : 78, b: 32, l: Math.min(96, Math.round(W * 0.22)) };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const lo = -200;
  const hi = 600;
  const X = (v: number) => M.l + ((v - lo) / (hi - lo)) * iw;

  for (let v = lo; v <= hi; v += narrow ? 400 : 200) {
    el(
      "line",
      {
        x1: X(v),
        x2: X(v),
        y1: M.t,
        y2: M.t + ih,
        stroke: v === 0 ? "var(--axis)" : "var(--grid)",
        "stroke-width": 1,
        "vector-effect": "non-scaling-stroke",
      },
      svg,
    );
    text(svg, X(v), M.t + ih + 20, fmtSigned(v), { size: 11, tabular: true });
  }

  const band = ih / PVM.length;
  const BH = Math.min(24, band - 12);
  PVM.forEach((s, i) => {
    const y = M.t + band * i + (band - BH) / 2;
    const x0 = X(0);
    const x1 = X(s.value);
    const pos = s.value >= 0;
    const len = Math.max(Math.abs(x1 - x0), 2);
    el(
      "path",
      {
        d: pos ? barRight(x0, y, len, BH, 4) : barLeft(x0, y, len, BH, 4),
        fill: pos ? "var(--good)" : "var(--critical)",
      },
      svg,
    );
    text(svg, M.l - 10, y + BH / 2 + 4, s.label, {
      anchor: "end",
      size: narrow ? 12 : 13,
      weight: 600,
      fill: "var(--text-primary)",
    });
    text(svg, pos ? x1 + 8 : x1 - 8, y + BH / 2 + 4, fmtSigned(s.value), {
      anchor: pos ? "start" : "end",
      size: narrow ? 11 : 12,
      weight: 600,
      fill: "var(--text-primary)",
      tabular: true,
    });
  });
};

export function RevenueSplitChart() {
  return (
    <ResponsiveChart
      heightFor={splitHeight}
      draw={drawSplit}
      label="Price added 512, volume added 389 and mix removed 75 thousand ringgit of revenue growth"
    />
  );
}

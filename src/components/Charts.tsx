"use client";

/**
 * Every chart on the platform. The marketing surface calls them with no props
 * and gets the sample figures; /results calls them with a client's real
 * numbers. One implementation, so a fix to an axis fixes it in both places.
 *
 * Every chart re-lays-out on resize rather than scaling. A fixed viewBox with
 * width:100% scales the whole drawing including text, which renders a 12px
 * axis label at ~3px on a phone. See docs/09-design-system.md section 3.4.
 */

import { useCallback } from "react";
import { useEffect, useRef } from "react";
import anim from "./charts.module.css";

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
  o: {
    size?: number;
    weight?: number;
    fill?: string;
    anchor?: string;
    tabular?: boolean;
    /** Position in the series, so labels resolve with their own geometry. */
    i?: number;
  } = {},
) {
  const t = el(
    "text",
    {
      x,
      y,
      fill: o.fill ?? "var(--text-muted)",
      "text-anchor": o.anchor ?? "middle",
      class: anim.fade,
      style:
        `font-size:${o.size ?? 12}px;font-weight:${o.weight ?? 500};` +
        (o.tabular ? "font-variant-numeric:tabular-nums;" : "") +
        (o.i === undefined ? "" : `--i:${o.i};`),
    },
    parent,
  );
  t.textContent = String(str);
  return t;
}

/** Shorthand for the two attributes every animated shape carries. */
const animated = (name: string, i: number) => ({ class: name, style: `--i:${i};` });

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

/**
 * A domain that covers the data, includes zero, and lands on round ticks.
 * Real P&Ls go negative — a loss month has to have somewhere to be drawn.
 */
function niceDomain(values: number[], targetTicks: number) {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const step = niceStep(hi - lo || 1, targetTicks);
  return {
    lo: Math.floor(lo / step) * step,
    hi: Math.ceil(hi / step) * step || step,
    step,
  };
}

const fmtK = (v: number) => Math.round(v).toLocaleString("en-US");
const fmtSigned = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmtK(Math.abs(v));

/**
 * Axis labels in thousands or millions, so a 6,034,000 tick reads "6.0M"
 * instead of overrunning the plot. Returns the divisor and the unit note to
 * print near the chart title.
 */
function scaleFor(max: number) {
  if (max >= 1_000_000) return { div: 1_000_000, unit: "millions", dp: 1 };
  if (max >= 10_000) return { div: 1_000, unit: "thousands", dp: 0 };
  return { div: 1, unit: "", dp: 0 };
}
const fmtScaled = (v: number, s: { div: number; dp: number }) =>
  (v / s.div).toFixed(s.dp).replace(/\.0$/, "");

/** "2025-01" → "Jan", falling back to the raw label for anything else. */
function monthLabel(month: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return month;
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    +m[2] - 1
  ];
}

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

  // The entrance animation is armed by a class rather than played on mount, so
  // a chart three screens down does not animate to nobody and arrive static.
  // Once armed it stays armed: this fires once and disconnects.
  useEffect(() => {
    const svg = ref.current;
    if (!svg || svg.classList.contains(anim.animated)) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        svg.classList.add(anim.animated);
        io.disconnect();
      },
      { threshold: 0.15 },
    );
    io.observe(svg);
    return () => io.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      role="img"
      aria-label={label}
      className="plot"
      style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}
    />
  );
}

/* ---------------- sample data (RM '000), used when no props are passed ---------------- */

export type BridgeStep = { label: string; type: "total" | "dec"; value: number };

const SAMPLE_BRIDGE: BridgeStep[] = [
  { label: "Revenue", type: "total", value: 6034 },
  { label: "COGS", type: "dec", value: -3517 },
  { label: "Gross profit", type: "total", value: 2517 },
  { label: "Opex", type: "dec", value: -2148 },
  { label: "Net profit", type: "total", value: 240 },
];

const SAMPLE_MONTHS = [
  "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
  "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
];
const SAMPLE_LADDER = {
  months: SAMPLE_MONTHS,
  gross: [40.0, 39.2, 40.0, 41.2, 39.6, 41.4, 41.9, 42.6, 42.6, 43.2, 42.7, 43.7],
  operating: [-0.7, -2.8, 1.6, 3.0, 0.2, 5.0, 6.3, 7.3, 9.1, 10.2, 10.1, 15.1],
  net: [-3.4, -5.7, -0.9, 0.7, -2.3, 2.8, 4.2, 5.1, 7.1, 8.5, 8.4, 13.6],
};
const SAMPLE_SPLIT = [
  { label: "Price", value: 512 },
  { label: "Volume", value: 389 },
  { label: "Mix", value: -75 },
];

/** Short labels for the bridge on a phone. */
const ABBR: Record<string, string> = {
  Revenue: "Rev",
  COGS: "COGS",
  "Gross profit": "GP",
  Opex: "Opex",
  "Net profit": "NP",
};

/* ---------------- 1. margin bridge ---------------- */

export function MarginBridgeChart({ data = SAMPLE_BRIDGE }: { data?: BridgeStep[] }) {
  const heightFor = useCallback((w: number) => (isNarrow(w) ? 260 : 300), []);

  const draw = useCallback<Draw>(
    (svg, W, H) => {
      const narrow = isNarrow(W);
      const M = { t: 28, r: narrow ? 10 : 16, b: 34, l: narrow ? 46 : 60 };
      const iw = W - M.l - M.r;
      const ih = H - M.t - M.b;

      let run = 0;
      const geo = data.map((s) => {
        const start = s.type === "total" ? 0 : run;
        const end = s.type === "total" ? s.value : run + s.value;
        run = end;
        return { ...s, start, end };
      });

      const { lo, hi, step } = niceDomain(
        geo.flatMap((g) => [g.start, g.end]),
        narrow ? 3 : 4,
      );
      const scale = scaleFor(Math.max(Math.abs(lo), hi));
      const Y = (v: number) => M.t + ih - ((v - lo) / (hi - lo)) * ih;

      for (let v = lo; v <= hi + step / 2; v += step) {
        el(
          "line",
          {
            x1: M.l,
            x2: W - M.r,
            y1: Y(v),
            y2: Y(v),
            stroke: Math.abs(v) < step / 1000 ? "var(--axis)" : "var(--grid)",
            "stroke-width": 1,
            "vector-effect": "non-scaling-stroke",
          },
          svg,
        );
        text(svg, M.l - 8, Y(v) + 4, fmtScaled(v, scale), {
          anchor: "end",
          size: narrow ? 11 : 12,
          tabular: true,
        });
      }

      const band = iw / geo.length;
      const BW = Math.min(28, band - (narrow ? 10 : 20));

      geo.forEach((s, i) => {
        const cx = M.l + band * i + band / 2;
        const x = cx - BW / 2;
        const top = Math.min(Y(s.start), Y(s.end));
        const h = Math.abs(Y(s.end) - Y(s.start));
        // Totals are the neutral series colour; a negative total is a loss and
        // has to read as one.
        const fill =
          s.type === "total"
            ? s.end < 0
              ? "var(--critical)"
              : "var(--s1)"
            : "var(--critical)";

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

        const up = s.end >= s.start;
        el(
          "path",
          {
            d: barPath(x, top, BW, Math.max(h, 2), 4, up ? "up" : "down"),
            fill,
            // A decrement hangs off the running total above it, so it has to
            // grow downward or it detaches from the step it belongs to.
            ...animated(up ? anim.grow : anim.growDown, i),
          },
          svg,
        );

        if (!narrow) {
          text(svg, cx, top - 9, (s.value < 0 ? "−" : "") + fmtScaled(Math.abs(s.value), scale), {
            size: 12,
            weight: 600,
            fill: "var(--text-primary)",
            tabular: true,
            i,
          });
        }
        text(svg, cx, M.t + ih + 20, narrow ? (ABBR[s.label] ?? s.label) : s.label, {
          size: narrow ? 11 : 12,
          fill: "var(--text-secondary)",
          i,
        });
      });
    },
    [data],
  );

  const last = data[data.length - 1];
  return (
    <ResponsiveChart
      heightFor={heightFor}
      draw={draw}
      label={`Margin bridge from ${fmtK(data[0]?.value ?? 0)} of revenue down to ${fmtK(
        last?.value ?? 0,
      )} of net profit`}
    />
  );
}

/* ---------------- 2. margin ladder ---------------- */

export type LadderData = {
  months: string[];
  gross: number[];
  operating: number[];
  net: number[];
};

export function MarginLadderChart({ data = SAMPLE_LADDER }: { data?: LadderData }) {
  const heightFor = useCallback((w: number) => (isNarrow(w) ? 240 : 280), []);

  const draw = useCallback<Draw>(
    (svg, W, H) => {
      const narrow = isNarrow(W);
      const M = { t: 20, r: narrow ? 14 : 20, b: 34, l: narrow ? 40 : 46 };
      const iw = W - M.l - M.r;
      const ih = H - M.t - M.b;
      const n = data.months.length;

      const { lo, hi, step } = niceDomain(
        [...data.gross, ...data.operating, ...data.net],
        narrow ? 4 : 6,
      );
      const Y = (v: number) => M.t + ih - ((v - lo) / (hi - lo)) * ih;
      const X = (i: number) => (n === 1 ? M.l + iw / 2 : M.l + (i * iw) / (n - 1));

      for (let v = lo; v <= hi + step / 2; v += step) {
        el(
          "line",
          {
            x1: M.l,
            x2: W - M.r,
            y1: Y(v),
            y2: Y(v),
            stroke: Math.abs(v) < step / 1000 ? "var(--axis)" : "var(--grid)",
            "stroke-width": 1,
            "vector-effect": "non-scaling-stroke",
          },
          svg,
        );
        text(svg, M.l - 8, Y(v) + 4, `${Math.round(v)}%`, {
          anchor: "end",
          size: narrow ? 11 : 12,
          tabular: true,
        });
      }

      const every = Math.max(1, Math.ceil(30 / (iw / Math.max(1, n - 1))));
      data.months.forEach((m, i) => {
        if (i % every) return;
        text(svg, X(i), M.t + ih + 20, monthLabel(m), {
          size: narrow ? 11 : 12,
          fill: "var(--text-secondary)",
        });
      });

      const series = [
        { values: data.gross, color: "var(--s1)" },
        { values: data.operating, color: "var(--s2)" },
        { values: data.net, color: "var(--s3)" },
      ];
      series.forEach((s, si) => {
        const d = s.values
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
            // Normalises the path to a length of 1 so the draw-in dash needs no
            // getTotalLength() call.
            pathLength: 1,
            ...animated(anim.line, si * 2),
          },
          svg,
        );
        el(
          "circle",
          {
            cx: X(n - 1),
            cy: Y(s.values[n - 1]),
            r: 4,
            fill: s.color,
            stroke: "var(--surface)",
            "stroke-width": 2,
            "vector-effect": "non-scaling-stroke",
            // Lands after its own line has finished drawing.
            ...animated(anim.dot, si * 2 + 18),
          },
          svg,
        );
      });
    },
    [data],
  );

  return (
    <ResponsiveChart
      heightFor={heightFor}
      draw={draw}
      label="Gross, operating and net margin percentages by month"
    />
  );
}

/* ---------------- 3. revenue split (price / volume / mix) ---------------- */

export type SplitItem = { label: string; value: number };

export function RevenueSplitChart({ data = SAMPLE_SPLIT }: { data?: SplitItem[] }) {
  const heightFor = useCallback(
    (w: number) => (isNarrow(w) ? 60 + data.length * 44 : 70 + data.length * 50),
    [data.length],
  );

  const draw = useCallback<Draw>(
    (svg, W, H) => {
      const narrow = isNarrow(W);
      const M = { t: 14, r: narrow ? 52 : 84, b: 32, l: Math.min(96, Math.round(W * 0.22)) };
      const iw = W - M.l - M.r;
      const ih = H - M.t - M.b;

      const { lo, hi, step } = niceDomain(
        data.map((d) => d.value),
        narrow ? 2 : 4,
      );
      const scale = scaleFor(Math.max(Math.abs(lo), hi));
      const X = (v: number) => M.l + ((v - lo) / (hi - lo)) * iw;

      for (let v = lo; v <= hi + step / 2; v += step) {
        el(
          "line",
          {
            x1: X(v),
            x2: X(v),
            y1: M.t,
            y2: M.t + ih,
            stroke: Math.abs(v) < step / 1000 ? "var(--axis)" : "var(--grid)",
            "stroke-width": 1,
            "vector-effect": "non-scaling-stroke",
          },
          svg,
        );
        text(svg, X(v), M.t + ih + 20, fmtSigned(v / scale.div), { size: 11, tabular: true });
      }

      const band = ih / data.length;
      const BH = Math.min(24, band - 12);
      data.forEach((s, i) => {
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
            // Both directions grow out of the zero line, never out of thin air.
            ...animated(pos ? anim.growRight : anim.growLeft, i),
          },
          svg,
        );
        text(svg, M.l - 10, y + BH / 2 + 4, s.label, {
          anchor: "end",
          size: narrow ? 12 : 13,
          weight: 600,
          fill: "var(--text-primary)",
          i,
        });
        text(svg, pos ? x1 + 8 : x1 - 8, y + BH / 2 + 4, fmtSigned(s.value / scale.div), {
          anchor: pos ? "start" : "end",
          size: narrow ? 11 : 12,
          weight: 600,
          fill: "var(--text-primary)",
          tabular: true,
          i,
        });
      });
    },
    [data],
  );

  return (
    <ResponsiveChart
      heightFor={heightFor}
      draw={draw}
      label={data.map((d) => `${d.label} ${d.value >= 0 ? "added" : "removed"} ${fmtK(Math.abs(d.value))}`).join(", ")}
    />
  );
}

/* ---------------- 4. revenue trend ---------------- */

export function RevenueTrendChart({
  data,
}: {
  data: { months: string[]; revenue: number[] };
}) {
  const heightFor = useCallback((w: number) => (isNarrow(w) ? 220 : 260), []);

  const draw = useCallback<Draw>(
    (svg, W, H) => {
      const narrow = isNarrow(W);
      const M = { t: 22, r: narrow ? 12 : 18, b: 34, l: narrow ? 46 : 58 };
      const iw = W - M.l - M.r;
      const ih = H - M.t - M.b;
      const n = data.months.length;

      const { lo, hi, step } = niceDomain(data.revenue, narrow ? 3 : 5);
      const scale = scaleFor(hi);
      const Y = (v: number) => M.t + ih - ((v - lo) / (hi - lo)) * ih;

      for (let v = lo; v <= hi + step / 2; v += step) {
        el(
          "line",
          {
            x1: M.l,
            x2: W - M.r,
            y1: Y(v),
            y2: Y(v),
            stroke: Math.abs(v) < step / 1000 ? "var(--axis)" : "var(--grid)",
            "stroke-width": 1,
            "vector-effect": "non-scaling-stroke",
          },
          svg,
        );
        text(svg, M.l - 8, Y(v) + 4, fmtScaled(v, scale), {
          anchor: "end",
          size: narrow ? 11 : 12,
          tabular: true,
        });
      }

      const band = iw / n;
      const BW = Math.min(34, band - (narrow ? 6 : 12));
      const every = Math.max(1, Math.ceil(32 / band));

      data.revenue.forEach((v, i) => {
        const cx = M.l + band * i + band / 2;
        const top = Math.min(Y(v), Y(0));
        const h = Math.abs(Y(v) - Y(0));
        el(
          "path",
          {
            d: barPath(cx - BW / 2, top, BW, Math.max(h, 2), 4, v >= 0 ? "up" : "down"),
            fill: "var(--s1)",
            ...animated(v >= 0 ? anim.grow : anim.growDown, i),
          },
          svg,
        );
        if (i % every === 0) {
          text(svg, cx, M.t + ih + 20, monthLabel(data.months[i]), {
            size: narrow ? 11 : 12,
            fill: "var(--text-secondary)",
            i,
          });
        }
      });
    },
    [data],
  );

  return <ResponsiveChart heightFor={heightFor} draw={draw} label="Revenue by month" />;
}

/* ---------------- 5. leads per week (admin) ---------------- */

export function LeadsPerWeekChart({
  data,
}: {
  data: { weekStart: string; count: number; partial?: boolean }[];
}) {
  const heightFor = useCallback((w: number) => (isNarrow(w) ? 200 : 240), []);

  const draw = useCallback<Draw>(
    (svg, W, H) => {
      const narrow = isNarrow(W);
      const M = { t: 20, r: narrow ? 10 : 16, b: 34, l: narrow ? 34 : 42 };
      const iw = W - M.l - M.r;
      const ih = H - M.t - M.b;

      const { lo, hi, step } = niceDomain(
        data.map((d) => d.count),
        narrow ? 3 : 4,
      );
      const Y = (v: number) => M.t + ih - ((v - lo) / (hi - lo)) * ih;

      for (let v = lo; v <= hi + step / 2; v += step) {
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
        text(svg, M.l - 8, Y(v) + 4, fmtK(v), {
          anchor: "end",
          size: narrow ? 11 : 12,
          tabular: true,
        });
      }

      const band = iw / Math.max(1, data.length);
      const BW = Math.min(30, band - (narrow ? 5 : 10));
      const every = Math.max(1, Math.ceil(38 / band));

      data.forEach((d, i) => {
        const cx = M.l + band * i + band / 2;
        el(
          "path",
          {
            d: barPath(cx - BW / 2, Y(d.count), BW, Math.max(Y(0) - Y(d.count), 2), 4, "up"),
            fill: "var(--s1)",
            // The current week is still running, so its bar is not comparable
            // to the completed ones. Hatching would need a pattern def; opacity
            // says "provisional" with no extra machinery.
            "fill-opacity": d.partial ? 0.45 : 1,
            ...animated(anim.grow, i),
          },
          svg,
        );
        if (i % every === 0) {
          text(svg, cx, M.t + ih + 20, weekLabel(d.weekStart), {
            size: narrow ? 10 : 11,
            fill: "var(--text-secondary)",
            i,
          });
        }
      });
    },
    [data],
  );

  return (
    <ResponsiveChart
      heightFor={heightFor}
      draw={draw}
      label={`New leads per week: ${data.map((d) => d.count).join(", ")}`}
    />
  );
}

/** "2026-07-20" → "20 Jul" */
function weekLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
      d.getUTCMonth()
    ]
  }`;
}

/* ---------------- 6. opex breakdown ---------------- */

export function OpexBreakdownChart({
  data,
}: {
  data: { category: string; amount: number; pctOfRevenue: number }[];
}) {
  const heightFor = useCallback(
    (w: number) => (isNarrow(w) ? 24 + data.length * 40 : 24 + data.length * 44),
    [data.length],
  );

  const draw = useCallback<Draw>(
    (svg, W, H) => {
      const narrow = isNarrow(W);
      const labelW = Math.min(narrow ? 96 : 150, Math.round(W * 0.3));
      const M = { t: 6, r: narrow ? 54 : 76, b: 6, l: labelW };
      const iw = W - M.l - M.r;
      const ih = H - M.t - M.b;
      const max = Math.max(...data.map((d) => d.amount), 1);
      const band = ih / data.length;
      const BH = Math.min(22, band - 12);

      data.forEach((d, i) => {
        const y = M.t + band * i + (band - BH) / 2;
        const len = Math.max((d.amount / max) * iw, 2);
        el(
          "path",
          // Fixed order, never cycled: the largest category is always s1, so
          // the eye lands on the biggest lever first.
          {
            d: barRight(M.l, y, len, BH, 4),
            fill: `var(--s${Math.min(i + 1, 8)})`,
            ...animated(anim.growRight, i),
          },
          svg,
        );
        text(svg, M.l - 10, y + BH / 2 + 4, d.category, {
          anchor: "end",
          size: narrow ? 12 : 13,
          weight: 600,
          fill: "var(--text-primary)",
          i,
        });
        text(svg, M.l + len + 8, y + BH / 2 + 4, `${d.pctOfRevenue.toFixed(1)}%`, {
          anchor: "start",
          size: narrow ? 11 : 12,
          weight: 600,
          fill: "var(--text-secondary)",
          tabular: true,
          i,
        });
      });
    },
    [data],
  );

  return (
    <ResponsiveChart
      heightFor={heightFor}
      draw={draw}
      label={`Operating expenses by category as a share of revenue: ${data
        .map((d) => `${d.category} ${d.pctOfRevenue.toFixed(1)} percent`)
        .join(", ")}`}
    />
  );
}

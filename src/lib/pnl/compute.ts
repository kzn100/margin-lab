/**
 * Monthly rows → the metrics blob stored on pnl_results.metrics and rendered by
 * /results/[id]. Shapes here mirror the charts in src/components/Charts.tsx:
 * bridge, margin ladder, opex breakdown, revenue split.
 */

import type { PnlRow } from "./parse";

export type PnlMetrics = {
  period: { start: string; end: string; months: number };
  totals: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    opex: number;
    operatingProfit: number;
    netProfit: number;
    units: number | null;
  };
  margins: { grossPct: number; operatingPct: number; netPct: number };
  monthly: {
    month: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    opex: number;
    operatingProfit: number;
    netProfit: number;
    grossMarginPct: number;
    operatingMarginPct: number;
    netMarginPct: number;
    units: number | null;
    asp: number | null;
    /** Revenue change vs the previous month, %. null for the first month. */
    revenueMomPct: number | null;
    /** Revenue change vs the same month a year earlier, %. Needs 13+ months. */
    revenueYoyPct: number | null;
  }[];
  /** Waterfall: revenue → −COGS → gross profit → −opex → net profit. */
  bridge: { label: string; type: "total" | "dec"; value: number }[];
  opexBreakdown: { category: string; amount: number; pctOfRevenue: number }[];
  /**
   * Why revenue moved, comparing the later half of the period to the earlier
   * half on a per-month run-rate basis. null when the file carries no units.
   */
  revenueSplit: {
    basis: string;
    price: number;
    volume: number;
    mix: number;
    total: number;
  } | null;
  headline: {
    netProfit: number;
    netMarginPct: number;
    /** Largest opex category as a share of revenue — the usual first lever. */
    biggestOpex: { category: string; pctOfRevenue: number } | null;
    revenueTrendPct: number;
  };
};

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const pct = (part: number, whole: number) => (whole === 0 ? 0 : round((part / whole) * 100, 2));
const round = (n: number, dp = 2) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

export function computeMetrics(rows: PnlRow[]): PnlMetrics {
  const monthly = rows.map((r, i) => {
    const opex = sum(Object.values(r.opex));
    const grossProfit = r.revenue - r.cogs;
    const operatingProfit = grossProfit - opex;
    // Trust the file's net profit when it has one: below operating profit sit
    // interest, tax and other income that the template does not model.
    const netProfit = r.netProfit ?? operatingProfit;
    const prev = rows[i - 1];
    const yearAgo = rows[i - 12];

    return {
      month: r.month,
      revenue: round(r.revenue),
      cogs: round(r.cogs),
      grossProfit: round(grossProfit),
      opex: round(opex),
      operatingProfit: round(operatingProfit),
      netProfit: round(netProfit),
      grossMarginPct: pct(grossProfit, r.revenue),
      operatingMarginPct: pct(operatingProfit, r.revenue),
      netMarginPct: pct(netProfit, r.revenue),
      units: r.units,
      asp: r.units ? round(r.revenue / r.units, 2) : null,
      revenueMomPct: prev && prev.revenue !== 0 ? pct(r.revenue - prev.revenue, prev.revenue) : null,
      revenueYoyPct:
        yearAgo && yearAgo.revenue !== 0
          ? pct(r.revenue - yearAgo.revenue, yearAgo.revenue)
          : null,
    };
  });

  const revenue = sum(monthly.map((m) => m.revenue));
  const cogs = sum(monthly.map((m) => m.cogs));
  const opex = sum(monthly.map((m) => m.opex));
  const grossProfit = revenue - cogs;
  const operatingProfit = grossProfit - opex;
  const netProfit = sum(monthly.map((m) => m.netProfit));
  const unitsTotal = rows.every((r) => r.units === null)
    ? null
    : sum(rows.map((r) => r.units ?? 0));

  const categories = new Set<string>();
  for (const r of rows) for (const c of Object.keys(r.opex)) categories.add(c);
  const opexBreakdown = [...categories]
    .map((category) => {
      const amount = round(sum(rows.map((r) => r.opex[category] ?? 0)));
      return { category, amount, pctOfRevenue: pct(amount, revenue) };
    })
    .sort((a, b) => b.amount - a.amount);

  const first = monthly[0];
  const last = monthly[monthly.length - 1];

  return {
    period: { start: first.month, end: last.month, months: monthly.length },
    totals: {
      revenue: round(revenue),
      cogs: round(cogs),
      grossProfit: round(grossProfit),
      opex: round(opex),
      operatingProfit: round(operatingProfit),
      netProfit: round(netProfit),
      units: unitsTotal,
    },
    margins: {
      grossPct: pct(grossProfit, revenue),
      operatingPct: pct(operatingProfit, revenue),
      netPct: pct(netProfit, revenue),
    },
    monthly,
    bridge: [
      { label: "Revenue", type: "total", value: round(revenue) },
      { label: "COGS", type: "dec", value: round(-cogs) },
      { label: "Gross profit", type: "total", value: round(grossProfit) },
      { label: "Opex", type: "dec", value: round(-opex) },
      { label: "Net profit", type: "total", value: round(netProfit) },
    ],
    opexBreakdown,
    revenueSplit: revenueSplit(rows),
    headline: {
      netProfit: round(netProfit),
      netMarginPct: pct(netProfit, revenue),
      biggestOpex: opexBreakdown.length
        ? { category: opexBreakdown[0].category, pctOfRevenue: opexBreakdown[0].pctOfRevenue }
        : null,
      revenueTrendPct: first.revenue === 0 ? 0 : pct(last.revenue - first.revenue, first.revenue),
    },
  };
}

/**
 * Price / volume / mix on a per-month run rate, later half vs earlier half.
 *
 *   ΔRevenue = (P_late − P_early)·U_early  +  (U_late − U_early)·P_early  +  residual
 *              └── price ──┘                  └── volume ──┘                └─ mix ─┘
 *
 * ponytail: with one aggregate row per month there is no product dimension, so
 * "mix" is the price×volume interaction residual, not true SKU mix. A real mix
 * effect needs product-level rows — add a Product column to the template and
 * decompose per product when a client can supply that.
 */
function revenueSplit(rows: PnlRow[]): PnlMetrics["revenueSplit"] {
  if (rows.some((r) => !r.units)) return null;

  const cut = Math.floor(rows.length / 2);
  const early = rows.slice(0, cut);
  const late = rows.slice(cut);
  if (!early.length || !late.length) return null;

  const rate = (part: PnlRow[]) => {
    const revenue = sum(part.map((r) => r.revenue)) / part.length;
    const units = sum(part.map((r) => r.units ?? 0)) / part.length;
    return { revenue, units, price: units === 0 ? 0 : revenue / units };
  };

  const e = rate(early);
  const l = rate(late);
  const price = round((l.price - e.price) * e.units);
  const volume = round((l.units - e.units) * e.price);
  const total = round(l.revenue - e.revenue);

  return {
    basis: `${late[0].month}–${late[late.length - 1].month} vs ${early[0].month}–${
      early[early.length - 1].month
    }, average month`,
    price,
    volume,
    // Derived from the already-rounded parts so the three effects always sum to
    // the total exactly. Rounding each of the four independently leaves a cent
    // of drift, which reads as an error in a chart that is meant to reconcile.
    mix: round(total - price - volume),
    total,
  };
}

/**
 * Regenerates the sample P&Ls in public/examples — `node scripts/gen-examples.mjs`.
 *
 * Two kinds of file:
 *   quarterly()  Malaysian listcos report quarterly, so published quarterly
 *                revenue / net profit (and operating income where the series is
 *                reliable) are split across the three months of each quarter.
 *   monthly()    figures anchored to published annual results only, with the
 *                whole monthly shape synthesized.
 *
 * Nothing here is audited monthly data. Provenance per file lives on the Notes
 * sheet of the workbook and in public/examples/README.md.
 */
import ExcelJS from "exceljs";
import { mkdirSync } from "node:fs";

const OUT = "public/examples";
mkdirSync(OUT, { recursive: true });

const M = 1_000_000;
/** Within-quarter monthly weights: the third month of a quarter closes heaviest. */
const QW = [0.3, 0.33, 0.37];
const r = Math.round;

const addMonths = (start, i) => {
  const [y, m] = start.split("-").map(Number);
  const t = y * 12 + m - 1 + i;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
};

/** Straight-line ramp between two endpoints, for store/subscriber counts. */
const ramp = (from, to, n) => (i) => from + ((to - from) * i) / (n - 1);

async function write(file, notes, { header, rows }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("P&L");
  ws.addRow(header).font = { bold: true };
  rows.forEach((row) => ws.addRow(row));
  ws.columns.forEach((c, i) => {
    c.width = i === 0 ? 12 : 22;
    if (i > 0) c.numFmt = "#,##0";
  });
  const n = wb.addWorksheet("Notes");
  notes.forEach((line) => n.addRow([line]));
  n.getColumn(1).width = 120;
  await wb.xlsx.writeFile(`${OUT}/${file}`);
  console.log(file.padEnd(46), rows.length, "months");
}

/**
 * quarters: { startMonth, revenue, netProfit, gpMargin, opInc? } in RM millions.
 * opex:     [[label, ratioOfRevenue], …]
 * residual: label for the category that absorbs GP − operating income − fixed
 *           opex, so the file reconciles to reported operating income.
 * units:    (globalMonthIndex, revenue) => number, or null.
 */
function quarterly({ quarters, opex, residual, units }) {
  const header = [
    "Month",
    "Revenue",
    ...(units ? ["Units"] : []),
    "COGS",
    ...opex.map(([l]) => l),
    ...(residual ? [residual] : []),
    "Net Profit",
  ];
  const rows = [];
  let i = 0;
  for (const q of quarters) {
    const gp = q.revenue * q.gpMargin;
    const fixed = opex.reduce((a, [, ratio]) => a + q.revenue * ratio, 0);
    const res = residual ? gp - q.opInc - fixed : 0;
    if (residual && res < 0)
      throw new Error(`${residual} went negative at ${q.startMonth}`);
    for (let k = 0; k < 3; k++, i++) {
      const rev = q.revenue * M * QW[k];
      rows.push([
        addMonths(q.startMonth, k),
        r(rev),
        ...(units ? [r(units(i, rev))] : []),
        r(rev * (1 - q.gpMargin)),
        ...opex.map(([, ratio]) => r(rev * ratio)),
        ...(residual ? [r(res * M * QW[k])] : []),
        r(q.netProfit * M * QW[k]),
      ]);
    }
  }
  return { header, rows };
}

/* ============================================================== 99 Speed Mart
 * Mini-market chain, calendar FY. 2024: revenue RM9.98bn, gross profit
 * RM1.89bn (19.0%), operating income RM646m, net profit RM465m.
 * 2025: RM11.43bn, 21.3%, RM808m, RM609m. Q1 2026 as reported.
 * Units = outlets trading, so ASP reads as revenue per outlet per month.
 */
const speedOutlets = ramp(2300, 2900, 27);
await write(
  "99-speed-mart-malaysia-pnl-2024-2026q1.xlsx",
  [
    "99 Speed Mart Retail Holdings Berhad — illustrative monthly P&L, RM (not thousands).",
    "Calendar financial year. Covers Jan 2024 – Mar 2026.",
    "Quarterly revenue, operating income and net profit are as published. 2024: revenue RM9.98bn, gross profit RM1.89bn (19.0%), operating income RM646m, net profit RM465m. 2025: RM11.43bn, RM2.43bn (21.3%), RM808m, RM609m.",
    "Gross margin is the annual margin applied evenly (per-quarter gross profit was not reliably extractable). Outlet operations and distribution are fixed ratios of revenue; Administrative is the balancing figure that reconciles each quarter to reported operating income — which is why it jumps in Q4 2024, the IPO quarter.",
    "Units = outlets trading, ramped 2,300 (Jan 2024) to 2,900 (Mar 2026) from published outlet counts. ASP therefore reads as revenue per outlet per month.",
    "The monthly split inside each quarter is synthesized (30/33/37%). Not audited monthly accounts.",
    "Source: 99 Speed Mart quarterly announcements and IPO prospectus / annual report (99speedmart.com.my), via stockanalysis.com.",
  ],
  quarterly({
    quarters: [
      {
        startMonth: "2024-01",
        revenue: 2426,
        netProfit: 133.15,
        opInc: 183.73,
        gpMargin: 0.19,
      },
      {
        startMonth: "2024-04",
        revenue: 2420,
        netProfit: 125.53,
        opInc: 174.99,
        gpMargin: 0.19,
      },
      {
        startMonth: "2024-07",
        revenue: 2551,
        netProfit: 107.16,
        opInc: 172.74,
        gpMargin: 0.19,
      },
      {
        startMonth: "2024-10",
        revenue: 2585,
        netProfit: 99.54,
        opInc: 114.59,
        gpMargin: 0.19,
      },
      {
        startMonth: "2025-01",
        revenue: 2612,
        netProfit: 144.9,
        opInc: 203.44,
        gpMargin: 0.213,
      },
      {
        startMonth: "2025-04",
        revenue: 2708,
        netProfit: 153.21,
        opInc: 202.18,
        gpMargin: 0.213,
      },
      {
        startMonth: "2025-07",
        revenue: 3038,
        netProfit: 160.65,
        opInc: 206.41,
        gpMargin: 0.213,
      },
      {
        startMonth: "2025-10",
        revenue: 3076,
        netProfit: 150.25,
        opInc: 196.12,
        gpMargin: 0.213,
      },
      {
        startMonth: "2026-01",
        revenue: 3068,
        netProfit: 188.56,
        opInc: 261.86,
        gpMargin: 0.204,
      },
    ],
    opex: [
      ["Opex Outlet Operations", 0.06],
      ["Opex Distribution & Logistics", 0.025],
    ],
    residual: "Opex Administrative",
    units: (i) => speedOutlets(i),
  }),
);

/* ================================================================== Senheng
 * Consumer-electronics retailer, calendar FY. Thin and getting thinner:
 * 2024 revenue RM1.22bn, gross profit RM256.8m (21.1%), net profit RM11.0m;
 * 2025 RM1.15bn, RM244.4m (21.3%), RM9.4m; Q1 2026 a small net loss.
 */
const senhengStores = ramp(105, 122, 27);
await write(
  "senheng-malaysia-pnl-2024-2026q1.xlsx",
  [
    "Senheng New Retail Berhad — illustrative monthly P&L, RM (not thousands).",
    "Calendar financial year. Covers Jan 2024 – Mar 2026.",
    "Quarterly revenue, gross profit, operating income and net profit are as published; the 2024 quarters sum exactly to the reported FY2024 revenue RM1,216.85m, gross profit RM256.82m and net profit RM11.04m.",
    "Net margin under 1% on a ~21% gross margin: the whole result sits in the operating expense lines. Q1 2026 is a net loss. Store operations, staff and marketing are fixed ratios of revenue; Administrative & Depreciation is the balancing figure that reconciles each quarter to reported operating income.",
    "Units = stores trading, ramped 105 to 122 from the published store network. ASP reads as revenue per store per month.",
    "The monthly split inside each quarter is synthesized (30/33/37%). Not audited monthly accounts.",
    "Source: Senheng New Retail Berhad quarterly reports and Annual Report 2024 (senheng.com), via stockanalysis.com.",
  ],
  quarterly({
    quarters: [
      {
        startMonth: "2024-01",
        revenue: 322.02,
        netProfit: 6.23,
        opInc: 8.22,
        gpMargin: 0.2097,
      },
      {
        startMonth: "2024-04",
        revenue: 307.61,
        netProfit: 3.64,
        opInc: 5.21,
        gpMargin: 0.2067,
      },
      {
        startMonth: "2024-07",
        revenue: 278.95,
        netProfit: 3.62,
        opInc: 5.08,
        gpMargin: 0.2104,
      },
      {
        startMonth: "2024-10",
        revenue: 308.26,
        netProfit: -2.45,
        opInc: 1.19,
        gpMargin: 0.2174,
      },
      {
        startMonth: "2025-01",
        revenue: 276.98,
        netProfit: 4.72,
        opInc: 6.27,
        gpMargin: 0.2114,
      },
      {
        startMonth: "2025-04",
        revenue: 270.39,
        netProfit: 1.2,
        opInc: 2.15,
        gpMargin: 0.21,
      },
      {
        startMonth: "2025-07",
        revenue: 272.7,
        netProfit: 0.66,
        opInc: 2.65,
        gpMargin: 0.221,
      },
      {
        startMonth: "2025-10",
        revenue: 328.22,
        netProfit: 2.86,
        opInc: 3.75,
        gpMargin: 0.2096,
      },
      {
        startMonth: "2026-01",
        revenue: 250.84,
        netProfit: -1.29,
        opInc: -1.09,
        gpMargin: 0.2144,
      },
    ],
    opex: [
      ["Opex Store Operations", 0.08],
      ["Opex Staff", 0.06],
      ["Opex Marketing", 0.02],
    ],
    residual: "Opex Administrative & Depreciation",
    units: (i) => senhengStores(i),
  }),
);

/* ============================================================== CelcomDigi
 * Telco, calendar FY. Fat gross margin (~64%), heavy depreciation from the
 * network integration. 2024: revenue RM12.75bn, gross profit RM8.20bn,
 * operating income RM3.79bn, net profit RM1.38bn — Q4 2024 net profit collapses
 * to RM158m on accelerated depreciation. 2025: RM13.03bn, RM8.17bn, RM3.92bn,
 * RM1.51bn. Q1 2026 as reported.
 */
const cdSubs = ramp(20_000_000, 20_600_000, 27);
await write(
  "celcomdigi-malaysia-pnl-2024-2026q1.xlsx",
  [
    "CelcomDigi Berhad — illustrative monthly P&L, RM (not thousands).",
    "Calendar financial year. Covers Jan 2024 – Mar 2026.",
    "Quarterly revenue, gross profit, operating income and net profit are as published. 2024: revenue RM12.75bn, gross profit RM8.20bn (64.3%), operating income RM3.79bn, net profit RM1.38bn. 2025: RM13.03bn, RM8.17bn, RM3.92bn, RM1.51bn.",
    "Q4 2024 net profit drops to RM158m against RM437m the quarter before — accelerated depreciation on the network integration. Depreciation & Amortisation is the balancing figure that reconciles each quarter to reported operating income, so that shock lands there.",
    "Network & IT, Staff and Sales & Marketing are indicative fixed ratios of revenue (6.0/4.5/3.5%); the split between them is not separately published.",
    "Units = mobile subscribers, ramped 20.0m to 20.6m from the published subscriber base. ASP reads as revenue per subscriber per month.",
    "The monthly split inside each quarter is synthesized (30/33/37%). Not audited monthly accounts.",
    "Source: CelcomDigi Berhad quarterly announcements and annual reports (celcomdigi.com), via stockanalysis.com.",
  ],
  quarterly({
    quarters: [
      {
        startMonth: "2024-01",
        revenue: 3190,
        netProfit: 376.46,
        opInc: 925.37,
        gpMargin: 0.6075,
      },
      {
        startMonth: "2024-04",
        revenue: 3118,
        netProfit: 406.02,
        opInc: 1008,
        gpMargin: 0.6453,
      },
      {
        startMonth: "2024-07",
        revenue: 3156,
        netProfit: 436.98,
        opInc: 1069,
        gpMargin: 0.653,
      },
      {
        startMonth: "2024-10",
        revenue: 3289,
        netProfit: 158.28,
        opInc: 783.95,
        gpMargin: 0.6661,
      },
      {
        startMonth: "2025-01",
        revenue: 3224,
        netProfit: 384,
        opInc: 1068,
        gpMargin: 0.6244,
      },
      {
        startMonth: "2025-04",
        revenue: 3197,
        netProfit: 438.94,
        opInc: 1127,
        gpMargin: 0.6443,
      },
      {
        startMonth: "2025-07",
        revenue: 3151,
        netProfit: 341.23,
        opInc: 1044,
        gpMargin: 0.6363,
      },
      {
        startMonth: "2025-10",
        revenue: 3456,
        netProfit: 349.59,
        opInc: 679.09,
        gpMargin: 0.6056,
      },
      {
        startMonth: "2026-01",
        revenue: 3219,
        netProfit: 418,
        opInc: 1109,
        gpMargin: 0.6285,
      },
    ],
    opex: [
      ["Opex Network & IT", 0.06],
      ["Opex Staff", 0.045],
      ["Opex Sales & Marketing", 0.035],
    ],
    residual: "Opex Depreciation & Amortisation",
    units: (i) => cdSubs(i),
  }),
);

/* =============================================================== Sime Darby */
await write(
  "sime-darby-malaysia-pnl-fy2025-fy2026q3.xlsx",
  [
    "Sime Darby Berhad — illustrative monthly P&L, RM (not thousands).",
    "Financial year ends 30 June. Covers FY2025 (Jul 2024–Jun 2025) plus FY2026 Q1–Q3 (Jul 2025–Mar 2026).",
    "Quarterly revenue and net profit are as published. FY2025: revenue RM70.06bn, gross profit RM10.64bn (15.2%), operating income RM2.00bn, net profit RM2.06bn (the quarterly net profits in this file sum to RM2.01bn; the gap is minority/discontinued items).",
    "Gross margin is the published annual margin applied evenly; opex ratios (4.5/5.5/1.4/0.9% of revenue) are back-solved from published operating income.",
    "The monthly split inside each quarter is synthesized (30/33/37%). Not audited monthly accounts.",
    "No Units column: a diversified industrial/motors group has no single volume metric, so price/volume/mix will not run.",
    "Source: Sime Darby Berhad quarterly announcements and FY2024/FY2025 annual reports (simedarby.com), via stockanalysis.com.",
  ],
  quarterly({
    quarters: [
      {
        startMonth: "2024-07",
        revenue: 18_264,
        netProfit: 800,
        gpMargin: 0.152,
      },
      {
        startMonth: "2024-10",
        revenue: 17_726,
        netProfit: 305,
        gpMargin: 0.152,
      },
      {
        startMonth: "2025-01",
        revenue: 16_313,
        netProfit: 193,
        gpMargin: 0.152,
      },
      {
        startMonth: "2025-04",
        revenue: 17_758,
        netProfit: 711,
        gpMargin: 0.152,
      },
      {
        startMonth: "2025-07",
        revenue: 18_031,
        netProfit: 355,
        gpMargin: 0.15,
      },
      {
        startMonth: "2025-10",
        revenue: 18_974,
        netProfit: 431,
        gpMargin: 0.15,
      },
      {
        startMonth: "2026-01",
        revenue: 15_752,
        netProfit: 654,
        gpMargin: 0.15,
      },
    ],
    opex: [
      ["Opex Selling & Distribution", 0.045],
      ["Opex Administrative", 0.055],
      ["Opex Other Operating", 0.014],
      ["Opex Finance Costs", 0.009],
    ],
    residual: null,
    units: null,
  }),
);

/* =================================================================== Gamuda */
await write(
  "gamuda-malaysia-pnl-fy2024-fy2025.xlsx",
  [
    "Gamuda Berhad — illustrative monthly P&L, RM (not thousands).",
    "Financial year ends 31 July. Covers FY2024 (Aug 2023–Jul 2024) and FY2025 (Aug 2024–Jul 2025).",
    "Quarterly revenue and net profit are as published. FY2024: revenue RM13.35bn, gross profit RM1.79bn (13.4%), operating income RM697m, net profit RM912m. FY2025: RM15.97bn, RM2.34bn (14.6%), RM1.02bn, RM1.00bn.",
    "Gross margin is the published annual margin applied evenly; opex ratios (4.6/2.4/1.2% of revenue) are back-solved from published operating income.",
    "Net profit exceeds operating profit in the thin quarters — Gamuda's JV/associate income (concessions, overseas JVs) sits below the operating line. The analyser trusts the Net Profit column, so this is intentional.",
    "The monthly split inside each quarter is synthesized (30/33/37%). Not audited monthly accounts.",
    "No Units column: construction and property revenue has no single volume metric, so price/volume/mix will not run.",
    "Source: Gamuda Berhad quarterly announcements and Integrated Reports 2024/2025 (gamuda.listedcompany.com), via stockanalysis.com.",
  ],
  quarterly({
    quarters: [
      {
        startMonth: "2023-08",
        revenue: 2805,
        netProfit: 195.0,
        gpMargin: 0.1339,
      },
      {
        startMonth: "2023-11",
        revenue: 3331,
        netProfit: 208.8,
        gpMargin: 0.1339,
      },
      {
        startMonth: "2024-02",
        revenue: 2490,
        netProfit: 235.8,
        gpMargin: 0.1339,
      },
      {
        startMonth: "2024-05",
        revenue: 4721,
        netProfit: 272.5,
        gpMargin: 0.1339,
      },
      {
        startMonth: "2024-08",
        revenue: 4136,
        netProfit: 205.4,
        gpMargin: 0.1462,
      },
      {
        startMonth: "2024-11",
        revenue: 3902,
        netProfit: 218.9,
        gpMargin: 0.1462,
      },
      {
        startMonth: "2025-02",
        revenue: 3090,
        netProfit: 246.8,
        gpMargin: 0.1462,
      },
      {
        startMonth: "2025-05",
        revenue: 4842,
        netProfit: 332.2,
        gpMargin: 0.1462,
      },
    ],
    opex: [
      ["Opex Administrative", 0.046],
      ["Opex Other Operating", 0.024],
      ["Opex Finance Costs", 0.012],
    ],
    residual: null,
    units: null,
  }),
);

/* ==================================================================== Mr DIY
 * Anchored to published annual results only: FY2023 revenue RM4.32bn, gross
 * margin 45.4%, net profit ~RM500m; FY2024 RM4.85bn, 45.8%, ~RM570m.
 */
const SEASON = [
  0.092, 0.085, 0.08, 0.085, 0.078, 0.08, 0.078, 0.08, 0.078, 0.082, 0.088,
  0.094,
];
{
  const rows = [];
  for (const [year, revYear, gp, basket, ratios] of [
    [2023, 4.32e9, 0.454, 25.5, [0.17, 0.045, 0.016, 0.07]],
    [2024, 4.85e9, 0.458, 25.9, [0.172, 0.045, 0.016, 0.07]],
  ]) {
    SEASON.forEach((w, i) => {
      const rev = revYear * w;
      const opex = ratios.map((p) => rev * p);
      const pbt = rev * gp - opex.reduce((a, b) => a + b, 0);
      rows.push([
        `${year}-${String(i + 1).padStart(2, "0")}`,
        r(rev),
        r(rev / basket),
        r(rev * (1 - gp)),
        ...opex.map(r),
        r(pbt * 0.76),
      ]);
    });
  }
  await write(
    "mr-diy-malaysia-pnl-2023-2024.xlsx",
    [
      "Mr DIY Group (M) Berhad — illustrative monthly P&L, RM (not thousands).",
      "Anchored to published annual results only: FY2023 revenue RM4.32bn, gross margin 45.4%, net profit ~RM500m; FY2024 RM4.85bn, 45.8%, ~RM570m.",
      "The entire monthly shape is synthesized: CNY and year-end seasonality weights, straight-line cost ratios, tax at 24%. Not audited monthly accounts, and not quarter-accurate.",
      "Units = transactions, derived from an assumed RM25.50 (2023) / RM25.90 (2024) average basket.",
      "Source: Mr DIY Group annual reports (mrdiy.com).",
    ],
    {
      header: [
        "Month",
        "Revenue",
        "Units",
        "COGS",
        "Opex Store Operations",
        "Opex Distribution",
        "Opex Marketing",
        "Opex Admin",
        "Net Profit",
      ],
      rows,
    },
  );
}

/* ================================================================ Top Glove
 * Post-glut distress: COGS above revenue through 2023, recovering toward
 * breakeven in 2024, with lumpy plant-closure charges.
 */
{
  const rev = [
    155, 148, 143, 150, 158, 162, 168, 160, 172, 178, 175, 183, 188, 182, 195,
    201, 198, 208, 215, 210, 222, 228, 225, 235,
  ];
  const asp = [
    78, 77, 76, 76, 77, 78, 79, 79, 80, 81, 82, 83, 84, 84, 85, 86, 86, 87, 88,
    89, 90, 90, 91, 92,
  ];
  const cogsRatio = [
    1.14, 1.16, 1.17, 1.13, 1.1, 1.08, 1.06, 1.07, 1.04, 1.02, 1.02, 1.0, 0.99,
    0.99, 0.97, 0.96, 0.96, 0.95, 0.94, 0.94, 0.93, 0.92, 0.92, 0.91,
  ];
  const oneOff = { 2: 90, 5: 180, 10: 150, 14: 60 };
  const rows = rev.map((rm, i) => {
    const revenue = rm * M;
    const opex = [0.038, 0.045, 0.062].map((p) => revenue * p);
    const other = revenue * 0.012 + (oneOff[i] ?? 0) * M;
    const pbt =
      revenue -
      revenue * cogsRatio[i] -
      opex.reduce((a, b) => a + b, 0) -
      other;
    const year = 2023 + Math.floor(i / 12);
    return [
      `${year}-${String((i % 12) + 1).padStart(2, "0")}`,
      r(revenue),
      r(revenue / asp[i]),
      r(revenue * cogsRatio[i]),
      ...opex.map(r),
      r(other),
      r(pbt < 0 ? pbt : pbt * 0.76),
    ];
  });
  await write(
    "top-glove-malaysia-pnl-2023-2024.xlsx",
    [
      "Top Glove Corporation Bhd — illustrative monthly P&L, RM (not thousands).",
      "Post-glut distress, shaped to the published FY2023/FY2024 picture: ~RM2bn annual revenue with heavy losses, recovering toward breakeven. Financial year actually ends 31 August; this file uses calendar months.",
      "COGS exceeds revenue through 2023 — negative gross margin on low utilisation — and Opex Other carries lumpy plant-closure and impairment charges (Mar/Jun/Nov 2023, Mar 2024). Losses carry no tax charge.",
      "Units = thousand pieces; ASP is RM per '000 pieces, recovering RM78 to RM92.",
      "The entire monthly shape is synthesized. Not audited monthly accounts, and not quarter-accurate.",
      "Source: Top Glove Corporation annual and quarterly reports (topglove.com).",
    ],
    {
      header: [
        "Month",
        "Revenue",
        "Units",
        "COGS",
        "Opex Selling",
        "Opex Distribution",
        "Opex Admin",
        "Opex Other",
        "Net Profit",
      ],
      rows,
    },
  );
}

/* ================================================================== Maybank
 * Bank chart of accounts: Revenue = total income, cost of sales = interest
 * expense, so gross profit is net operating income. No Units column.
 */
{
  const w = [
    0.0795, 0.08, 0.083, 0.082, 0.0825, 0.084, 0.0835, 0.084, 0.085, 0.0845,
    0.0855, 0.0865,
  ];
  const impW = [
    0.07, 0.07, 0.09, 0.08, 0.08, 0.09, 0.08, 0.08, 0.09, 0.08, 0.09, 0.1,
  ];
  const norm = (xs) => xs.map((x) => x / xs.reduce((a, b) => a + b, 0));
  const wn = norm(w);
  const impn = norm(impW);
  const rows = [];
  for (const [year, revYear, intExp, opexYear, impYear] of [
    [2023, 52e9, 24.6e9, 13.3e9, 1.8e9],
    [2024, 54.5e9, 25.5e9, 13.9e9, 1.8e9],
  ]) {
    wn.forEach((wt, i) => {
      const opex = [0.55, 0.25, 0.2].map((share) => opexYear * share * wt);
      const imp = impYear * impn[i];
      const pbt =
        revYear * wt - intExp * wt - opex.reduce((a, b) => a + b, 0) - imp;
      rows.push([
        `${year}-${String(i + 1).padStart(2, "0")}`,
        r(revYear * wt),
        r(intExp * wt),
        ...opex.map(r),
        r(imp),
        r(pbt * 0.76),
      ]);
    });
  }
  await write(
    "maybank-malaysia-pnl-2023-2024.xlsx",
    [
      "Malayan Banking Berhad — illustrative monthly P&L, RM (not thousands).",
      "Bank chart of accounts mapped onto the template: Revenue = total income, cost of sales = interest expense, so gross profit is net operating income.",
      "Anchored to published annual results only: FY2023 net operating income ~RM27.4bn, net profit ~RM9.35bn, cost-to-income ~48.5%; FY2024 ~RM29.0bn and ~RM10.1bn.",
      "The entire monthly shape is synthesized. Not audited monthly accounts, and not quarter-accurate.",
      "No Units column — banks have no volume metric, so this file exercises the optional-column path.",
      "Source: Malayan Banking Berhad annual reports (maybank.com).",
    ],
    {
      header: [
        "Month",
        "Revenue (total income)",
        "Cost of sales (interest expense)",
        "Opex Personnel",
        "Opex Establishment",
        "Opex Administrative",
        "Opex Impairment",
        "Net Profit",
      ],
      rows,
    },
  );
}

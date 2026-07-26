import type { PnlMetrics } from "@/lib/pnl/compute";

/**
 * The internal email raised when somebody asks for an RGM consultation from
 * their results page, and the PDF that travels with it.
 *
 * Written for whoever picks the lead up, not for the customer: contact details
 * first so it can be actioned from a phone, then the numbers that decide
 * whether the conversation is worth having.
 *
 * No link back to the results page, deliberately. The recipient is not the
 * account owner, and RLS scopes /results to the owner — a link would only ever
 * 404 for them. Everything needed to prepare the conversation is in the PDF.
 */

const money = (n: number) =>
  (n < 0 ? "−RM " : "RM ") +
  Math.abs(Math.round(n)).toLocaleString("en-US", { maximumFractionDigits: 0 });

/** Table figures carry no currency prefix — the column heading states it once. */
const num = (n: number) =>
  (n < 0 ? "-" : "") +
  Math.abs(Math.round(n)).toLocaleString("en-US", { maximumFractionDigits: 0 });

const pct = (n: number) => `${n.toFixed(1)}%`;

/** Who is asking. Known even for somebody who has not uploaded a P&L yet. */
export type ConsultContact = {
  name: string;
  company: string;
  jobRole: string;
  mobile: string;
  email: string;
  requestedAt: string;
};

export type ConsultRequest = ConsultContact & { metrics: PnlMetrics };

/** Lines with a null in them are conditional and drop out; "" is a real blank. */
const compact = (lines: (string | null)[]) => lines.filter((l): l is string => l !== null);

const contactBlock = (req: ConsultContact) => [
  "CONTACT",
  `Name      ${req.name}`,
  `Company   ${req.company}`,
  `Role      ${req.jobRole || "—"}`,
  `Mobile    ${req.mobile || "—"}`,
  `Email     ${req.email}`,
  `Requested ${req.requestedAt}`,
];

/** The five figures that decide whether the conversation is worth having. */
const headlineBlock = (metrics: PnlMetrics) => {
  const { totals, margins, period } = metrics;
  return [
    "HEADLINE",
    `Period           ${period.start} to ${period.end} (${period.months} months)`,
    `Revenue          ${money(totals.revenue)}`,
    `Gross profit     ${money(totals.grossProfit)}  (${margins.grossPct}%)`,
    `Operating profit ${money(totals.operatingProfit)}  (${margins.operatingPct}%)`,
    `Net profit       ${money(totals.netProfit)}  (${margins.netPct}%)`,
  ];
};

export function renderConsultRequestEmail(req: ConsultRequest) {
  const { headline, revenueSplit } = req.metrics;

  const lines = compact([
    `${req.name} at ${req.company} has requested an RGM consultation.`,
    "",
    ...contactBlock(req),
    "",
    ...headlineBlock(req.metrics),
    headline.biggestOpex
      ? `Biggest cost line: ${headline.biggestOpex.category}, ${headline.biggestOpex.pctOfRevenue}% of revenue.`
      : null,
    revenueSplit
      ? `Revenue moved ${money(revenueSplit.total)} a month: price ${money(
          revenueSplit.price,
        )}, volume ${money(revenueSplit.volume)}, mix ${money(revenueSplit.mix)}.`
      : "Revenue split unavailable — the file carried no units.",
    "",
    "The full analysis, month by month, is attached as a PDF.",
    "",
    "— Margin Lab",
  ]);

  return {
    subject: `RGM consultation request — ${req.company} (${req.name})`,
    text: lines.join("\n"),
  };
}

/**
 * The message a signed-in user sends to Melvin from the app header.
 *
 * Shorter than the email on purpose: it has to survive percent-encoding into a
 * wa.me URL and be readable on a phone, so it carries the contact block and the
 * headline only. The month-by-month detail is what the PDF is for.
 *
 * Both the metrics and the link are optional. Somebody who registered but has
 * not uploaded yet still gets to start the conversation, and a storage failure
 * downgrades the message rather than blocking it.
 */
export function renderConsultWhatsappText(
  contact: ConsultContact,
  metrics: PnlMetrics | null,
  pdfUrl: string | null,
) {
  return compact([
    metrics
      ? "Hi Melvin, I would like a phone consultation about my P&L."
      : "Hi Melvin, I would like a phone consultation. I have not uploaded a P&L yet.",
    "",
    ...contactBlock(contact),
    ...(metrics ? ["", ...headlineBlock(metrics)] : []),
    ...(pdfUrl ? ["", `Full analysis (link expires in ${PDF_LINK_DAYS} days):`, pdfUrl] : []),
    "",
    "Sent from Margin Lab",
  ]).join("\n");
}

/** Stated in the message, so it has to match the expiry the route signs with. */
export const PDF_LINK_DAYS = 7;

/**
 * Column widths for the month-by-month table. They add up to 102 characters,
 * inside the 107 that fit across an A4 page at the PDF writer's body size —
 * past that it folds the line and the columns stop lining up. The figure
 * columns are two wider than the longest number they can hold, so a P&L in the
 * billions still leaves a gap between cells instead of running them together.
 */
const COLS = [9, 15, 9, 15, 15, 15, 15, 9];

const row = (cells: string[]) =>
  cells.map((c, i) => (i === 0 ? c.padEnd(COLS[0]) : c.padStart(COLS[i]))).join("");

/** The document that gets attached. Fuller than the email: every month is here. */
export function renderConsultRequestPdfLines(req: ConsultRequest): string[] {
  const { totals, margins, period, monthly, opexBreakdown, revenueSplit } = req.metrics;

  return compact([
    ...contactBlock(req),
    "",
    `PERIOD    ${period.start} to ${period.end} (${period.months} months)`,
    "",
    "TOTALS (RM)",
    `Revenue          ${num(totals.revenue)}`,
    `COGS             ${num(totals.cogs)}`,
    `Gross profit     ${num(totals.grossProfit)}   ${pct(margins.grossPct)}`,
    `Opex             ${num(totals.opex)}`,
    `Operating profit ${num(totals.operatingProfit)}   ${pct(margins.operatingPct)}`,
    `Net profit       ${num(totals.netProfit)}   ${pct(margins.netPct)}`,
    "",
    "MONTH BY MONTH (RM)",
    row(["Month", "Revenue", "MoM", "COGS", "Gross", "Opex", "Net", "Net %"]),
    ...monthly.map((m) =>
      row([
        m.month,
        num(m.revenue),
        m.revenueMomPct === null ? "—" : pct(m.revenueMomPct),
        num(m.cogs),
        num(m.grossProfit),
        num(m.opex),
        num(m.netProfit),
        pct(m.netMarginPct),
      ]),
    ),
    row([
      "Total",
      num(totals.revenue),
      "—",
      num(totals.cogs),
      num(totals.grossProfit),
      num(totals.opex),
      num(totals.netProfit),
      pct(margins.netPct),
    ]),
    "",
    "COST LINES (RM)",
    // Its own two-column layout: a category name is text, not a figure, so it
    // would not line up under the month table's numeric columns.
    ...opexBreakdown.map(
      (o) =>
        o.category.slice(0, 40).padEnd(41) +
        num(o.amount).padStart(13) +
        pct(o.pctOfRevenue).padStart(11),
    ),
    "",
    "WHY REVENUE MOVED",
    revenueSplit
      ? `${revenueSplit.basis}: price ${num(revenueSplit.price)}, volume ${num(
          revenueSplit.volume,
        )}, mix ${num(revenueSplit.mix)}, total ${num(revenueSplit.total)} a month.`
      : "Not available — the uploaded P&L carried no unit volumes.",
  ]);
}

export const consultPdfTitle = (req: ConsultRequest) =>
  `RGM consultation — ${req.company}`;

/** Same sanitising as the upload path: nothing but the safe filename set. */
export const consultPdfFilename = (req: ConsultRequest) =>
  `RGM-analysis-${req.company}-${req.metrics.period.start}-${req.metrics.period.end}`
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 80) + ".pdf";

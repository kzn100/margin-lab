import type { PnlMetrics } from "@/lib/pnl/compute";

/**
 * The internal email raised when somebody asks for an RGM consultation from
 * their results page.
 *
 * Written for whoever picks the lead up, not for the customer: contact details
 * first so it can be actioned from a phone, then the numbers that decide
 * whether the conversation is worth having, then the link to the full charts.
 */

const money = (n: number) =>
  (n < 0 ? "−RM " : "RM ") +
  Math.abs(Math.round(n)).toLocaleString("en-US", { maximumFractionDigits: 0 });

export type ConsultRequest = {
  name: string;
  company: string;
  jobRole: string;
  mobile: string;
  email: string;
  resultUrl: string;
  requestedAt: string;
  metrics: PnlMetrics;
};

export function renderConsultRequestEmail(req: ConsultRequest) {
  const { totals, margins, period, headline, opexBreakdown, revenueSplit } = req.metrics;

  const lines = [
    `${req.name} at ${req.company} has requested an RGM consultation.`,
    "",
    "CONTACT",
    `Name      ${req.name}`,
    `Company   ${req.company}`,
    `Role      ${req.jobRole || "—"}`,
    `Mobile    ${req.mobile || "—"}`,
    `Email     ${req.email}`,
    `Requested ${req.requestedAt}`,
    "",
    "ANALYSIS",
    `Period           ${period.start} to ${period.end} (${period.months} months)`,
    `Revenue          ${money(totals.revenue)}`,
    `COGS             ${money(totals.cogs)}`,
    `Gross profit     ${money(totals.grossProfit)}  (${margins.grossPct}%)`,
    `Opex             ${money(totals.opex)}`,
    `Operating profit ${money(totals.operatingProfit)}  (${margins.operatingPct}%)`,
    `Net profit       ${money(totals.netProfit)}  (${margins.netPct}%)`,
    headline.biggestOpex
      ? `Biggest cost line: ${headline.biggestOpex.category}, ${money(
          headline.biggestOpex.amount,
        )} — ${headline.biggestOpex.pctOfRevenue}% of revenue.`
      : "",
    revenueSplit
      ? `Revenue moved ${money(revenueSplit.total)} a month: price ${money(
          revenueSplit.price,
        )}, volume ${money(revenueSplit.volume)}, mix ${money(revenueSplit.mix)}.`
      : "Revenue split unavailable — the file carried no units.",
    "",
    "TOP COST LINES",
    ...opexBreakdown
      .slice(0, 5)
      .map((o) => `  ${o.category} — ${money(o.amount)} (${o.pctOfRevenue}% of revenue)`),
    "",
    `Full analysis: ${req.resultUrl}`,
    "",
    "— Margin Lab",
  ].filter((l) => l !== "");

  return {
    subject: `RGM consultation request — ${req.company} (${req.name})`,
    text: lines.join("\n"),
  };
}

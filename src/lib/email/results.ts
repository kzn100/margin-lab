import { sendEmail } from "@/lib/email/send";
import type { PnlMetrics } from "@/lib/pnl/compute";

/**
 * Emails a lead their analysis summary.
 *
 * Never throws. By the time this runs the lead has already handed over their
 * P&L and the analysis is saved — losing the registration because an email API
 * hiccuped would be the worst failure in the flow.
 */
export async function sendResultsEmail(input: {
  to: string;
  name: string;
  company: string;
  resultUrl: string;
  metrics: PnlMetrics;
}) {
  try {
    const message = renderResultsEmail(input);
    await deliver(input.to, message);
  } catch (error) {
    console.error("[email] results email failed", {
      to: input.to,
      error: error instanceof Error ? error.message : error,
    });
  }
}

function renderResultsEmail({
  name,
  company,
  resultUrl,
  metrics,
}: {
  name: string;
  company: string;
  resultUrl: string;
  metrics: PnlMetrics;
}) {
  const money = (n: number) =>
    "RM " + Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  const { totals, margins, headline, period } = metrics;

  const lines = [
    `Hi ${name.split(" ")[0]},`,
    "",
    `Your P&L analysis for ${company} is ready — ${period.start} to ${period.end}, ${period.months} months.`,
    "",
    `Revenue          ${money(totals.revenue)}`,
    `Gross profit     ${money(totals.grossProfit)}  (${margins.grossPct}%)`,
    `Operating profit ${money(totals.operatingProfit)}  (${margins.operatingPct}%)`,
    `Net profit       ${money(totals.netProfit)}  (${margins.netPct}%)`,
    "",
    headline.biggestOpex
      ? `Biggest cost line: ${headline.biggestOpex.category}, at ${headline.biggestOpex.pctOfRevenue}% of revenue.`
      : "",
    metrics.revenueSplit
      ? `Revenue moved ${money(metrics.revenueSplit.total)} a month: price ${money(
          metrics.revenueSplit.price,
        )}, volume ${money(metrics.revenueSplit.volume)}, mix ${money(metrics.revenueSplit.mix)}.`
      : "",
    "",
    `Full charts: ${resultUrl}`,
    "",
    "— Margin Lab",
  ].filter((l) => l !== "");

  return {
    subject: `Your P&L analysis — ${company}`,
    text: lines.join("\n"),
  };
}

async function deliver(to: string, message: { subject: string; text: string }) {
  const result = await sendEmail(to, message.subject, message.text);
  if (!result.sent) console.error("[email] results email not sent", { to, error: result.error });
}

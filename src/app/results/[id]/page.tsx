import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { roleOf } from "@/lib/auth";
import {
  MarginBridgeChart,
  MarginLadderChart,
  OpexBreakdownChart,
  RevenueSplitChart,
  RevenueTrendChart,
} from "@/components/Charts";
import type { PnlMetrics } from "@/lib/pnl/compute";
import { createClient } from "@/lib/supabase/server";
import s from "../results.module.css";

export const metadata: Metadata = { title: "Your P&L analysis" };

const money = (n: number) =>
  (n < 0 ? "−RM " : "RM ") +
  Math.abs(Math.round(n)).toLocaleString("en-US", { maximumFractionDigits: 0 });

// Typographic minus, matching money() — a hyphen next to tabular figures reads
// as a dash rather than a sign.
const pct = (n: number) => `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;

const monthName = (m: string) => {
  const parts = /^(\d{4})-(\d{2})$/.exec(m);
  if (!parts) return m;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[+parts[2] - 1]} ${parts[1].slice(2)}`;
};

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/results/${id}`);

  // RLS restricts this to the owning user (or an admin), so a valid id belonging
  // to somebody else comes back empty and 404s rather than leaking a company's
  // P&L to whoever guesses the uuid.
  const { data } = await supabase
    .from("pnl_results")
    .select("id, created_at, metrics, leads (company, name, pnl_type)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const metrics = data.metrics as unknown as PnlMetrics;
  const lead = (Array.isArray(data.leads) ? data.leads[0] : data.leads) as {
    company: string;
    name: string;
    pnl_type: string;
  } | null;

  const { totals, margins, monthly, period, opexBreakdown, revenueSplit, headline } = metrics;
  const profitable = totals.netProfit >= 0;

  return (
    <>
      <AppHeader
        role={roleOf(user)}
        name={user.user_metadata?.name as string | undefined}
        email={user.email ?? ""}
      />

      <main className="wrap" style={{ paddingBlock: "28px 80px" }}>
        <div className="pagehead">
          <h1>{lead?.company ?? "Your"} P&amp;L analysis</h1>
          <p className="meta">
            {monthName(period.start)} to {monthName(period.end)} · {period.months} months ·{" "}
            {lead?.pnl_type === "monthly" ? "Part year" : "Full year"}
          </p>
          <div className="banner" role="status">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1.8 4.2h12.4v7.6H1.8z" />
              <path d="m2.2 4.6 5.8 4 5.8-4" />
            </svg>
            <span>
              A copy of this analysis has been sent to your inbox. It also stays on your{" "}
              <Link href="/dashboard">dashboard</Link>.
            </span>
          </div>
        </div>

        {/* ---------- headline ---------- */}
        <div className="card">
          <div className="hero">
            <span className="lbl">Net profit, {period.months} months</span>
            <span className="fig" style={{ color: profitable ? undefined : "var(--critical)" }}>
              {money(totals.netProfit)}
            </span>
            <span className="sub">
              {pct(margins.netPct)} of {money(totals.revenue)} revenue.{" "}
              {headline.biggestOpex
                ? `${headline.biggestOpex.category} is your largest cost line at ${pct(
                    headline.biggestOpex.pctOfRevenue,
                  )} of revenue.`
                : "No operating expense columns were found in your file."}
            </span>
          </div>
        </div>

        <div className={`tiles ${s.sec}`}>
          <div className="card tile">
            <div className="lbl">Revenue</div>
            <div className="val">{money(totals.revenue)}</div>
          </div>
          <div className="card tile">
            <div className="lbl">Gross margin</div>
            <div className="val">{pct(margins.grossPct)}</div>
          </div>
          <div className="card tile">
            <div className="lbl">Operating margin</div>
            <div className="val">{pct(margins.operatingPct)}</div>
          </div>
          <div className="card tile">
            <div className="lbl">Revenue, first to last month</div>
            <div className={headline.revenueTrendPct >= 0 ? s.good : s.bad}>
              <span className="val">
                {headline.revenueTrendPct >= 0 ? "+" : "−"}
                {pct(Math.abs(headline.revenueTrendPct))}
              </span>
            </div>
          </div>
        </div>

        {/* ---------- bridge ---------- */}
        <section className={`card ${s.sec}`}>
          <div className="chdr">
            <div>
              <h2>Where the revenue went</h2>
              <p>Revenue less cost of goods and operating expenses, {period.months} months.</p>
            </div>
            <span className="chip">Ringgit</span>
          </div>
          <MarginBridgeChart data={metrics.bridge} />
        </section>

        {/* ---------- trend + margin ladder ---------- */}
        <div className={`${s.grid2} ${s.sec}`}>
          <section className="card">
            <div className="chdr">
              <div>
                <h2>Revenue by month</h2>
                <p>The shape of the year, not just the total.</p>
              </div>
            </div>
            <RevenueTrendChart
              data={{ months: monthly.map((m) => m.month), revenue: monthly.map((m) => m.revenue) }}
            />
          </section>

          <section className="card">
            <div className="chdr">
              <div>
                <h2>Margin ladder</h2>
                <p>Gross, operating and net margin as a share of each month&apos;s revenue.</p>
              </div>
              <span className="chip">Percent</span>
            </div>
            <MarginLadderChart
              data={{
                months: monthly.map((m) => m.month),
                gross: monthly.map((m) => m.grossMarginPct),
                operating: monthly.map((m) => m.operatingMarginPct),
                net: monthly.map((m) => m.netMarginPct),
              }}
            />
            <div className={s.legend}>
              <span>
                <i className="line" style={{ background: "var(--s1)" }} />
                Gross margin
              </span>
              <span>
                <i className="line" style={{ background: "var(--s2)" }} />
                Operating margin
              </span>
              <span>
                <i className="line" style={{ background: "var(--s3)" }} />
                Net margin
              </span>
            </div>
          </section>
        </div>

        {/* ---------- opex + revenue split ---------- */}
        <div className={`${s.grid2} ${s.sec}`}>
          {opexBreakdown.length > 0 && (
            <section className="card">
              <div className="chdr">
                <div>
                  <h2>Operating expenses against revenue</h2>
                  <p>Largest first. The top line is usually the first lever worth pulling.</p>
                </div>
              </div>
              <OpexBreakdownChart data={opexBreakdown} />
              <p className={s.foot}>
                {money(totals.opex)} of operating expense, {pct(pctOf(totals.opex, totals.revenue))}{" "}
                of revenue.
              </p>
            </section>
          )}

          <section className="card">
            <div className="chdr">
              <div>
                <h2>Why revenue moved</h2>
                <p>
                  {revenueSplit
                    ? revenueSplit.basis
                    : "Add a Units column to your file to see the price, volume and mix split."}
                </p>
              </div>
            </div>
            {revenueSplit ? (
              <>
                <RevenueSplitChart
                  data={[
                    { label: "Price", value: revenueSplit.price },
                    { label: "Volume", value: revenueSplit.volume },
                    { label: "Mix", value: revenueSplit.mix },
                  ]}
                />
                <div className={s.legend}>
                  <span>
                    <i style={{ background: "var(--good)" }} />
                    Added
                  </span>
                  <span>
                    <i style={{ background: "var(--critical)" }} />
                    Removed
                  </span>
                </div>
                <p className={s.foot}>
                  Net change {money(revenueSplit.total)} a month. Mix is the price and volume
                  interaction; a true product mix effect needs product-level rows.
                </p>
              </>
            ) : (
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                Your file had no Units column, so we cannot separate a price rise from selling more.
                Re-upload with units per month and this chart fills in.
              </p>
            )}
          </section>
        </div>

        {/* ---------- monthly table ---------- */}
        <section className={`card ${s.sec}`}>
          <div className="chdr">
            <div>
              <h2>Month by month</h2>
              <p>The figures behind every chart on this page.</p>
            </div>
          </div>
          <div className={s.tablewrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Revenue</th>
                  <th scope="col">MoM</th>
                  <th scope="col">COGS</th>
                  <th scope="col">Gross profit</th>
                  <th scope="col">Opex</th>
                  <th scope="col">Net profit</th>
                  <th scope="col">Net margin</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.month}>
                    <td>{monthName(m.month)}</td>
                    <td>{money(m.revenue)}</td>
                    <td className={m.revenueMomPct === null ? undefined : m.revenueMomPct >= 0 ? s.good : s.bad}>
                      {m.revenueMomPct === null
                        ? "—"
                        : `${m.revenueMomPct >= 0 ? "+" : "−"}${pct(Math.abs(m.revenueMomPct))}`}
                    </td>
                    <td>{money(m.cogs)}</td>
                    <td>{money(m.grossProfit)}</td>
                    <td>{money(m.opex)}</td>
                    <td className={m.netProfit >= 0 ? s.good : s.bad}>{money(m.netProfit)}</td>
                    <td>{pct(m.netMarginPct)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td>{money(totals.revenue)}</td>
                  <td>—</td>
                  <td>{money(totals.cogs)}</td>
                  <td>{money(totals.grossProfit)}</td>
                  <td>{money(totals.opex)}</td>
                  <td>{money(totals.netProfit)}</td>
                  <td>{pct(margins.netPct)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className={s.sec}>
          <div className="cta">
            <div>
              <h2>Want the levers ranked, with the workings?</h2>
              <p>
                This analysis shows where the margin sits. A revenue growth management review turns
                it into a priced list of moves (pricing, mix, promotional spend, cost lines) in
                the order worth doing.
              </p>
            </div>
            <Link className="btn btn-primary" href="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

const pctOf = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);

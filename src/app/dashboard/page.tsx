import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteChrome";
import { homeFor, roleOf } from "@/lib/auth";
import type { PnlMetrics } from "@/lib/pnl/compute";
import { createClient } from "@/lib/supabase/server";
import s from "./dashboard.module.css";

export const metadata: Metadata = { title: "Your analyses" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const monthName = (m: string) => {
  const parts = /^(\d{4})-(\d{2})$/.exec(m);
  return parts ? `${MONTHS[+parts[2] - 1]} ${parts[1]}` : m;
};

const uploadedOn = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const pct = (n: number) => `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;
/** Percentage-point gap, which is not the same thing as a percentage change. */
const pp = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}pp`;

function EmptyIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2.5V8h5.5" />
      <path d="M8.5 17V12.5M12 17v-7M15.5 17v-3" />
    </svg>
  );
}

function Arrow({ up }: { up: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={up ? undefined : { transform: "rotate(180deg)" }}
    >
      <path d="M5.5 9V2M2.3 5.2 5.5 2l3.2 3.2" />
    </svg>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware already bounces anonymous visitors; this covers the route being
  // reached another way and satisfies the type checker.
  if (!user) redirect("/login?next=/dashboard");

  const role = roleOf(user);
  if (role === "admin") redirect(homeFor(role));

  // RLS scopes this to the caller's own leads — no user_id filter needed here,
  // and adding one would imply the filter is what protects the data.
  const { data: rows } = await supabase
    .from("pnl_results")
    .select("id, created_at, metrics, leads (company, pnl_type)")
    .order("created_at", { ascending: false });

  const analyses = (rows ?? []).map((row) => {
    const metrics = row.metrics as unknown as PnlMetrics;
    const lead = (Array.isArray(row.leads) ? row.leads[0] : row.leads) as {
      company: string;
      pnl_type: string;
    } | null;
    return {
      id: row.id,
      uploaded: row.created_at,
      period: `${monthName(metrics.period.start)} to ${monthName(metrics.period.end)}`,
      months: metrics.period.months,
      type: lead?.pnl_type === "monthly" ? "Part year" : "Full year",
      company: lead?.company ?? "—",
      netMarginPct: metrics.margins.netPct,
    };
  });

  const latest = analyses[0];
  const previous = analyses[1];
  // analyses is newest-first, so the first upload is the last element.
  const first = analyses[analyses.length - 1];
  const thisYear = analyses.filter(
    (a) => new Date(a.uploaded).getUTCFullYear() === new Date().getUTCFullYear(),
  ).length;

  return (
    <>
      <AppHeader
        role={role}
        name={user.user_metadata?.name as string | undefined}
        email={user.email ?? ""}
        current="dashboard"
      />

      <main className="wrap" style={{ paddingBlock: "28px 0" }}>
        <section className={`pagehead ${s.head}`}>
          <div>
            <h1>Your analyses</h1>
            <p className="meta">
              {analyses.length === 0
                ? "Nothing here yet."
                : `${analyses.length} ${analyses.length === 1 ? "analysis" : "analyses"}. Most recent ${uploadedOn(latest.uploaded)}.`}
            </p>
          </div>
          <Link className={`btn btn-primary ${s.headCta}`} href="/analyses/new">
            New analysis
          </Link>
        </section>

        {analyses.length === 0 ? (
          <section className={`card ${s.sec}`}>
            <div className="empty">
              <EmptyIcon />
              <h3>No analyses yet</h3>
              <p>
                Upload twelve months of P&amp;L in our template and your margin bridge, cost
                breakdown and revenue split appear here.
              </p>
              <Link className="btn btn-primary" href="/analyses/new" style={{ marginTop: 6 }}>
                Run your first analysis
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className={`tiles ${s.tiles3}`}>
              <figure className="card tile">
                <span className="lbl">Analyses run</span>
                <div className="val">{analyses.length}</div>
                <span className="delta">
                  <span className="per">
                    {thisYear} this year
                  </span>
                </span>
              </figure>

              <figure className="card tile">
                <span className="lbl">Latest net margin</span>
                <div className="val">{pct(latest.netMarginPct)}</div>
                {previous ? (
                  <span
                    className={
                      latest.netMarginPct >= previous.netMarginPct ? "delta up" : "delta down"
                    }
                  >
                    <Arrow up={latest.netMarginPct >= previous.netMarginPct} />
                    {pp(latest.netMarginPct - previous.netMarginPct)}{" "}
                    <span className="per">vs previous upload</span>
                  </span>
                ) : (
                  <span className="delta">
                    <span className="per">No earlier upload to compare</span>
                  </span>
                )}
              </figure>

              <figure className="card tile">
                <span className="lbl">Margin since first upload</span>
                <div className="val">
                  {analyses.length > 1 ? pp(latest.netMarginPct - first.netMarginPct) : "—"}
                </div>
                <span
                  className={
                    analyses.length > 1 && latest.netMarginPct >= first.netMarginPct
                      ? "delta up"
                      : analyses.length > 1
                        ? "delta down"
                        : "delta"
                  }
                >
                  {analyses.length > 1 && <Arrow up={latest.netMarginPct >= first.netMarginPct} />}
                  <span className="per">
                    {analyses.length > 1
                      ? `from ${pct(first.netMarginPct)} in ${uploadedOn(first.uploaded)}`
                      : "Needs a second upload"}
                  </span>
                </span>
              </figure>
            </section>

            <section className={`card ${s.sec}`}>
              <div className="dtable-wrap">
                <table className="dtable">
                  <thead>
                    <tr>
                      <th scope="col">Uploaded</th>
                      <th scope="col">Period</th>
                      <th scope="col">Type</th>
                      <th scope="col" className="num">
                        Net margin
                      </th>
                      <th scope="col">
                        <span className="vh">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyses.map((a) => (
                      <tr key={a.id}>
                        <td className="strong">{uploadedOn(a.uploaded)}</td>
                        <td className="muted">
                          {a.period} <span className="muted">({a.months} months)</span>
                        </td>
                        <td className="muted">{a.type}</td>
                        <td className="num">{pct(a.netMarginPct)}</td>
                        <td>
                          <Link className="btn btn-quiet" href={`/results/${a.id}`}>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pager" style={{ marginTop: 16 }}>
                <span>
                  Showing {analyses.length} of {analyses.length}
                </span>
              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

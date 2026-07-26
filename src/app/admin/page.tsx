import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LeadsPerWeekChart } from "@/components/Charts";
import { LeadsTable, type LeadRow } from "@/components/LeadsTable";
import { SiteFooter } from "@/components/SiteChrome";
import {
  JOB_ROLES,
  PAGE_SIZE,
  SINCE_OPTIONS,
  fetchLeadsPage,
  parseFilters,
  sinceDate,
  weeklyBuckets,
  withParam,
} from "@/lib/admin/leads";
import { roleOf } from "@/lib/auth";
import type { PnlMetrics } from "@/lib/pnl/compute";
import { createClient } from "@/lib/supabase/server";
import s from "./admin.module.css";

export const metadata: Metadata = { title: "Leads and usage" };

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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  // Route guard and RLS both gate this page. The guard exists so a non-admin
  // gets an explanation instead of an empty table; RLS is what actually stops
  // the data reaching them.
  if (roleOf(user) !== "admin") {
    return (
      <>
        <AppHeader role="user" name={user.user_metadata?.name as string | undefined} email={user.email ?? ""} />
        <main className="wrap">
          <div className={s.forbidden}>
            <h1>This page is for administrators</h1>
            <p>
              Your account does not have admin access. If you think it should, ask whoever set up
              the workspace.
            </p>
            <div className="actions">
              <Link className="btn btn-primary" href="/dashboard">
                Go to your dashboard
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const filters = parseFilters(await searchParams);
  const now = new Date();

  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const startOfLastMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  ).toISOString();
  const sevenDaysAgo = sinceDate("7", now)!;
  const twelveWeeksAgo = sinceDate("84", now)!;

  const [
    { leads, total },
    totalLeads,
    newLeads,
    analysesThisMonth,
    analysesLastMonth,
    signupHistory,
  ] = await Promise.all([
    fetchLeadsPage(supabase, filters, now),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase
      .from("pnl_results")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth),
    supabase
      .from("pnl_results")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfLastMonth)
      .lt("created_at", startOfMonth),
    supabase.from("leads").select("created_at").gte("created_at", twelveWeeksAgo),
  ]);

  // Only the analyses for the leads actually on screen, so the page cost does
  // not grow with the size of the CRM.
  const pageLeadIds = leads.map((l) => l.id);
  const { data: results } = pageLeadIds.length
    ? await supabase
        .from("pnl_results")
        .select("id, lead_id, created_at, metrics")
        .in("lead_id", pageLeadIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const latestByLead = new Map<string, { id: string; netMarginPct: number }>();
  for (const r of results ?? []) {
    // Ordered newest-first, so the first one seen for a lead is the latest.
    if (latestByLead.has(r.lead_id)) continue;
    latestByLead.set(r.lead_id, {
      id: r.id,
      netMarginPct: (r.metrics as unknown as PnlMetrics).margins?.netPct ?? 0,
    });
  }

  const rows: LeadRow[] = leads.map((lead) => ({
    ...lead,
    result: latestByLead.get(lead.id) ?? null,
  }));

  const buckets = weeklyBuckets(
    (signupHistory.data ?? []).map((r) => r.created_at),
    now,
  );

  const thisMonth = analysesThisMonth.count ?? 0;
  const lastMonth = analysesLastMonth.count ?? 0;
  const monthDeltaPct = lastMonth === 0 ? null : ((thisMonth - lastMonth) / lastMonth) * 100;
  const leadsWithAnalysis = latestByLead.size;

  // Built here rather than passed as a function: props crossing into a Client
  // Component have to be serialisable. Clicking the active column flips the
  // direction, any other column starts newest/A-first.
  const sortHref = (column: typeof filters.sort) =>
    withParam(filters, {
      sort: column,
      dir: filters.sort === column && filters.dir === "desc" ? "asc" : "desc",
      page: 1,
    });
  const sortHrefs = {
    name: sortHref("name"),
    company: sortHref("company"),
    created_at: sortHref("created_at"),
  };

  const firstShown = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(filters.page * PAGE_SIZE, total);
  const filtered =
    filters.q !== "" || filters.type !== "" || filters.role !== "" || filters.since !== "all";

  return (
    <>
      <AppHeader
        role="admin"
        name={user.user_metadata?.name as string | undefined}
        email={user.email ?? ""}
        current="leads"
      />

      <main className="wrap" style={{ paddingBlock: "28px 0" }}>
        <section className="pagehead">
          <h1>Leads and usage</h1>
          <p className="meta">
            {totalLeads.count ?? 0} lead{totalLeads.count === 1 ? "" : "s"}.{" "}
            {newLeads.count ?? 0} new in the last 7 days.
          </p>
        </section>

        <section className="tiles">
          <figure className="card tile">
            <span className="lbl">Total leads</span>
            <div className="val">{totalLeads.count ?? 0}</div>
            <span className={newLeads.count ? "delta up" : "delta"}>
              {newLeads.count ? <Arrow up /> : null}
              {newLeads.count ?? 0} <span className="per">last 7 days</span>
            </span>
          </figure>

          <figure className="card tile">
            <span className="lbl">Analyses this month</span>
            <div className="val">{thisMonth}</div>
            {monthDeltaPct === null ? (
              <span className="delta">
                <span className="per">
                  {lastMonth === 0 && thisMonth === 0 ? "None yet" : "No last month to compare"}
                </span>
              </span>
            ) : (
              <span className={monthDeltaPct >= 0 ? "delta up" : "delta down"}>
                <Arrow up={monthDeltaPct >= 0} />
                {Math.abs(monthDeltaPct).toFixed(1)}% <span className="per">vs last month</span>
              </span>
            )}
          </figure>

          <figure className="card tile">
            <span className="lbl">Analyses on this page</span>
            <div className="val">{leadsWithAnalysis}</div>
            <span className="delta">
              <span className="per">of {rows.length} leads shown</span>
            </span>
          </figure>

          <figure className="card tile">
            <span className="lbl">New leads, last 12 weeks</span>
            <div className="val">{buckets.reduce((n, b) => n + b.count, 0)}</div>
            <span className="delta">
              <span className="per">
                {buckets[buckets.length - 1].count} in the running week
              </span>
            </span>
          </figure>
        </section>

        <section className={`card ${s.sec}`}>
          <div className="chdr">
            <div>
              <h2>New leads by week</h2>
              <p>Last 12 weeks. The current week is still running, so its bar is faded.</p>
            </div>
            <span className="chip">Leads</span>
          </div>
          <LeadsPerWeekChart data={buckets} />
        </section>

        <section className={`card ${s.sec}`}>
          {/* A GET form: filters live in the URL, so a filtered view is
              shareable and the page still works with JavaScript off. */}
          <form className="toolbar" method="GET" action="/admin" style={{ marginBottom: 18 }}>
            <label className="search grow">
              <span className="vh">Search leads</span>
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="7" cy="7" r="4.6" />
                <path d="m10.4 10.4 3.1 3.1" />
              </svg>
              <input
                className="input"
                type="search"
                name="q"
                defaultValue={filters.q}
                placeholder="Name, company or email"
              />
            </label>

            <select className="ctrl" name="type" aria-label="P&L type" defaultValue={filters.type}>
              <option value="">All types</option>
              <option value="full-year">Full year</option>
              <option value="monthly">Part year</option>
            </select>

            <select className="ctrl" name="role" aria-label="Job role" defaultValue={filters.role}>
              <option value="">All roles</option>
              {JOB_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select className="ctrl" name="since" aria-label="Signed up" defaultValue={filters.since}>
              {SINCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {filters.sort !== "created_at" && <input type="hidden" name="sort" value={filters.sort} />}
            {filters.dir !== "desc" && <input type="hidden" name="dir" value={filters.dir} />}

            <button className="btn btn-ghost" type="submit">
              Apply
            </button>
            {filtered && (
              <Link className="btn btn-quiet" href="/admin">
                Reset
              </Link>
            )}
          </form>

          {rows.length === 0 ? (
            <div className="empty">
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
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m15.4 15.4 4.1 4.1" />
              </svg>
              <h3>{filtered ? "No leads match those filters" : "No leads yet"}</h3>
              <p>
                {filtered
                  ? "Widen the date range or clear the search."
                  : "Leads appear here the moment somebody completes a free analysis."}
              </p>
              {filtered && (
                <Link className="btn btn-ghost" href="/admin" style={{ marginTop: 6 }}>
                  Clear filters
                </Link>
              )}
            </div>
          ) : (
            <>
              <LeadsTable leads={rows} sort={filters.sort} dir={filters.dir} sortHrefs={sortHrefs} />

              <div className="pager" style={{ marginTop: 16 }}>
                <span>
                  Showing {firstShown} to {lastShown} of {total}
                </span>
                <span className="spacer" />
                {filters.page > 1 ? (
                  <Link
                    className="btn btn-ghost"
                    href={withParam(filters, { page: filters.page - 1 })}
                  >
                    Previous
                  </Link>
                ) : (
                  <button type="button" disabled>
                    Previous
                  </button>
                )}
                {lastShown < total ? (
                  <Link
                    className="btn btn-ghost"
                    href={withParam(filters, { page: filters.page + 1 })}
                  >
                    Next
                  </Link>
                ) : (
                  <button type="button" disabled>
                    Next
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

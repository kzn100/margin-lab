import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { EmailPanel, FacebookPanel, WhatsappPanel } from "@/components/CampaignForms";
import { SiteFooter } from "@/components/SiteChrome";
import { roleOf } from "@/lib/auth";
import { metaConfigured } from "@/lib/marketing/meta";
import { emailConfigured, whatsappConfigured, whatsappProvider } from "@/lib/marketing/providers";
import {
  describeSegment,
  parseSegment,
  resolveSegment,
  segmentQuery,
} from "@/lib/marketing/segment";
import { createClient } from "@/lib/supabase/server";
import s from "@/components/marketing.module.css";
import a from "../admin.module.css";

export const metadata: Metadata = { title: "Push marketing" };

const TABS = [
  { key: "fb", label: "Facebook audience" },
  { key: "email", label: "Email blast" },
  { key: "whatsapp", label: "WhatsApp" },
] as const;

const CHANNEL_LABEL: Record<string, string> = {
  fb: "Facebook",
  email: "Email",
  whatsapp: "WhatsApp",
};

const sentOn = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/marketing");

  if (roleOf(user) !== "admin") {
    return (
      <>
        <AppHeader role="user" name={user.user_metadata?.name as string | undefined} email={user.email ?? ""} />
        <main className="wrap">
          <div className={a.forbidden}>
            <h1>This page is for administrators</h1>
            <p>Your account does not have admin access.</p>
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

  const params = await searchParams;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab = (TABS.find((t) => t.key === rawTab) ?? TABS[0]).key;

  const segment = parseSegment(params);
  const leads = await resolveSegment(supabase, segment, new Date());
  const query = segmentQuery(segment);
  const description = describeSegment(segment, leads.length);

  const { data: history } = await supabase
    .from("marketing_campaigns")
    .select("id, type, segment_filter, content, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // Tab state lives in the URL: the panel survives a reload and a send, and the
  // page needs no client-side tab machinery.
  const tabHref = (key: string) => `/admin/marketing?${query ? `${query}&` : ""}tab=${key}`;

  return (
    <>
      <AppHeader
        role="admin"
        name={user.user_metadata?.name as string | undefined}
        email={user.email ?? ""}
        current="marketing"
      />

      <main className="wrap" style={{ paddingBlock: "28px 0" }}>
        <section className="pagehead">
          <h1>Push marketing</h1>
          <p className="meta">
            Compose once, send to the segment carried over from the leads table.
          </p>
        </section>

        <section className={`card ${s.sec}`}>
          <div className="selbar" style={{ marginBottom: 20 }}>
            <span>
              <span className="n">{leads.length}</span> lead{leads.length === 1 ? "" : "s"} in this
              segment
            </span>
            <span style={{ color: "var(--text-secondary)" }}>{description}</span>
            <span className="spacer" />
            <Link className="btn btn-quiet" href="/admin">
              Change segment
            </Link>
          </div>

          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <Link
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                href={tabHref(t.key)}
                className="btn btn-quiet"
                style={{
                  borderRadius: 0,
                  fontWeight: tab === t.key ? 600 : 500,
                  color: tab === t.key ? "var(--text-primary)" : undefined,
                  boxShadow: tab === t.key ? "inset 0 -2px 0 var(--accent)" : undefined,
                }}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {leads.length === 0 && (
            <div className="banner banner-error" style={{ marginTop: 20 }}>
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
                <circle cx="8" cy="8" r="6.5" />
                <path d="M8 4.7v3.8M8 10.9v.1" />
              </svg>
              <span>
                This segment is empty. <Link href="/admin">Pick leads</Link> from the table or widen
                the filter.
              </span>
            </div>
          )}

          {tab === "fb" && (
            <FacebookPanel segmentQuery={query} leads={leads} configured={metaConfigured()} />
          )}
          {tab === "email" && (
            <EmailPanel segmentQuery={query} leads={leads} configured={emailConfigured()} />
          )}
          {tab === "whatsapp" && (
            <WhatsappPanel
              segmentQuery={query}
              leads={leads}
              configured={whatsappConfigured()}
              provider={whatsappProvider()}
            />
          )}
        </section>

        <section className={`card ${s.sec}`}>
          <div className="chdr">
            <div>
              <h2>Send history</h2>
              <p>Every campaign, who sent it, and how it landed.</p>
            </div>
          </div>

          {!history?.length ? (
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
                <path d="M2.5 5.5h19v13h-19z" />
                <path d="m3 6 9 6.5L21 6" />
              </svg>
              <h3>No campaigns yet</h3>
              <p>Every push, blast and draft shows up here with its segment and outcome.</p>
            </div>
          ) : (
            <div className="dtable-wrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th scope="col">Sent</th>
                    <th scope="col">Channel</th>
                    <th scope="col">Segment</th>
                    <th scope="col" className="num">
                      Recipients
                    </th>
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const filter = (row.segment_filter ?? {}) as {
                      description?: string;
                      recipients?: number;
                    };
                    const content = (row.content ?? {}) as {
                      blocked?: string | null;
                      error?: string | null;
                      received?: number;
                      sent?: number;
                      subject?: string;
                    };
                    const delivered = Boolean(row.sent_at);
                    const reason = content.blocked ?? content.error ?? null;
                    return (
                      <tr key={row.id}>
                        <td className="strong">
                          {delivered ? sentOn(row.sent_at!) : sentOn(row.created_at)}
                        </td>
                        <td>{CHANNEL_LABEL[row.type] ?? row.type}</td>
                        <td className="muted">
                          {filter.description ?? "—"}
                          {content.subject ? <div className="muted">{content.subject}</div> : null}
                        </td>
                        <td className="num">{filter.recipients ?? 0}</td>
                        <td>
                          <span
                            className={`badge ${delivered ? "badge-good" : reason ? "badge-warning" : "badge-neutral"}`}
                            title={reason ?? undefined}
                          >
                            {delivered ? "Sent" : reason ? "Not sent" : "Recorded"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

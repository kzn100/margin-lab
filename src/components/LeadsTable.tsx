"use client";

import { useState } from "react";
import Link from "next/link";

export type LeadRow = {
  id: string;
  name: string;
  company: string;
  job_role: string;
  email: string;
  mobile: string;
  pnl_type: string;
  created_at: string;
  /** Latest analysis for this lead, if one exists. */
  result: { id: string; netMarginPct: number } | null;
  /** Storage paths, not signed URLs — signing happens in /api/files on click. */
  files: { pnl: string | null; consult: string | null };
};

export const fileHref = (path: string) => `/api/files?path=${encodeURIComponent(path)}`;

export const signedUp = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const pct = (n: number) => `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;

/**
 * Sort hrefs are computed on the server and passed as strings. A function prop
 * cannot cross the server/client boundary — React has to serialise these props.
 */
export type SortHrefs = Record<"name" | "company" | "created_at", string>;

function SortLink({
  label,
  active,
  dir,
  href,
  className,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  href: string;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={className}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <Link href={href} style={{ color: "inherit", textDecoration: "none" }}>
        {label}
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            marginLeft: 4,
            opacity: active ? 1 : 0.35,
            transform: active && dir === "asc" ? undefined : "rotate(180deg)",
          }}
        >
          <path d="M6 9.5V2.5M3.2 5.3 6 2.5l2.8 2.8" />
        </svg>
      </Link>
    </th>
  );
}

export function LeadsTable({
  leads,
  sort,
  dir,
  sortHrefs,
  filterQuery,
}: {
  leads: LeadRow[];
  sort: string;
  dir: "asc" | "desc";
  sortHrefs: SortHrefs;
  /** Current filter as a querystring, so an untouched table can still be a segment. */
  filterQuery: string | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allOnPage = leads.length > 0 && leads.every((l) => selected.has(l.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {selected.size > 0 && (
        <div className="selbar" role="status">
          <span>
            <span className="n">{selected.size}</span> lead{selected.size === 1 ? "" : "s"} selected
          </span>
          <button className="btn btn-quiet" type="button" onClick={() => setSelected(new Set())}>
            Clear
          </button>
          <span className="spacer" />
          <Link
            className="btn btn-primary"
            href={`/admin/marketing?ids=${[...selected].join(",")}`}
          >
            Send to marketing
          </Link>
        </div>
      )}

      {selected.size === 0 && filterQuery !== null && (
        <div className="selbar" role="status">
          <span>Nothing ticked</span>
          <span style={{ color: "var(--text-secondary)" }}>
            Send to every lead matching the current filter instead
          </span>
          <span className="spacer" />
          <Link
            className="btn btn-ghost"
            href={`/admin/marketing${filterQuery ? `?${filterQuery}` : ""}`}
          >
            Use this filter as the segment
          </Link>
        </div>
      )}

      <div className="dtable-wrap" style={{ marginTop: 18 }}>
        <table className="dtable">
          <thead>
            <tr>
              <th scope="col" className="pick">
                <input
                  type="checkbox"
                  aria-label="Select all leads on this page"
                  checked={allOnPage}
                  onChange={(e) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      for (const l of leads) {
                        if (e.target.checked) next.add(l.id);
                        else next.delete(l.id);
                      }
                      return next;
                    })
                  }
                />
              </th>
              <SortLink
                label="Name"
                active={sort === "name"}
                dir={dir}
                href={sortHrefs.name}
              />
              <SortLink
                label="Company"
                active={sort === "company"}
                dir={dir}
                href={sortHrefs.company}
              />
              <th scope="col">Role</th>
              <th scope="col">Contact</th>
              <th scope="col">Type</th>
              <SortLink
                label="Signed up"
                active={sort === "created_at"}
                dir={dir}
                href={sortHrefs.created_at}
              />
              <th scope="col">Analysis</th>
              <th scope="col">Files</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} data-selected={selected.has(lead.id) ? "true" : undefined}>
                <td className="pick">
                  <input
                    type="checkbox"
                    aria-label={`Select ${lead.name}`}
                    checked={selected.has(lead.id)}
                    onChange={() => toggle(lead.id)}
                  />
                </td>
                <td className="strong">{lead.name}</td>
                <td>{lead.company}</td>
                <td className="muted">{lead.job_role}</td>
                <td className="muted">
                  <a href={`mailto:${lead.email}`}>{lead.email}</a>
                  <br />
                  <a href={`tel:${lead.mobile.replace(/\s+/g, "")}`}>{lead.mobile}</a>
                </td>
                <td className="muted">{lead.pnl_type === "monthly" ? "Part year" : "Full year"}</td>
                <td className="muted">{signedUp(lead.created_at)}</td>
                <td>
                  {lead.result ? (
                    <Link className="btn btn-quiet" href={`/results/${lead.result.id}`}>
                      {pct(lead.result.netMarginPct)}
                    </Link>
                  ) : (
                    <span className="muted">None</span>
                  )}
                </td>
                <td>
                  {lead.files.pnl || lead.files.consult ? (
                    <>
                      {lead.files.pnl && (
                        <a className="btn btn-quiet" href={fileHref(lead.files.pnl)}>
                          P&amp;L
                        </a>
                      )}
                      {lead.files.consult && (
                        <a className="btn btn-quiet" href={fileHref(lead.files.consult)}>
                          PDF
                        </a>
                      )}
                    </>
                  ) : (
                    <span className="muted">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

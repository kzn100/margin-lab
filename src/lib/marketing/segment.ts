import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
// Relative with the extension so `node --test` can resolve this too: the "@/"
// alias is a bundler feature the plain Node runner does not know about.
import { JOB_ROLES, sinceDate } from "../admin/leads.ts";

/**
 * Who a campaign goes to. Either an explicit tick-list carried over from the
 * leads table, or the filter the admin was looking at — "everyone matching
 * this" survives new signups, a tick-list is a frozen set.
 */
export type Segment =
  | { kind: "ids"; ids: string[] }
  | { kind: "filter"; q: string; type: string; role: string; since: string };

export type SegmentLead = {
  id: string;
  name: string;
  company: string;
  email: string;
  mobile: string;
};

/** Guards the URL length and the size of a single blast. */
export const MAX_SEGMENT_IDS = 500;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSegment(params: Record<string, string | string[] | undefined>): Segment {
  const one = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };

  const raw = one("ids");
  if (raw) {
    // Anything that is not a uuid is dropped rather than passed to the query.
    const ids = [...new Set(raw.split(",").filter((id) => UUID.test(id)))].slice(0, MAX_SEGMENT_IDS);
    if (ids.length) return { kind: "ids", ids };
  }

  const type = one("type");
  const role = one("role");
  const since = one("since");
  return {
    kind: "filter",
    q: one("q").slice(0, 100),
    type: ["full-year", "monthly"].includes(type) ? type : "",
    role: (JOB_ROLES as readonly string[]).includes(role) ? role : "",
    since: ["30", "90", "all"].includes(since) ? since : "all",
  };
}

/** Plain-English description, shown in the segment bar and stored on the campaign. */
export function describeSegment(segment: Segment, count: number): string {
  if (segment.kind === "ids") {
    return `${count} lead${count === 1 ? "" : "s"} picked by hand`;
  }
  const parts: string[] = [];
  if (segment.q) parts.push(`matching "${segment.q}"`);
  if (segment.type) parts.push(segment.type === "monthly" ? "part-year uploads" : "full-year uploads");
  if (segment.role) parts.push(segment.role.toLowerCase());
  if (segment.since !== "all") parts.push(`signed up in the last ${segment.since} days`);
  return parts.length ? `Leads ${parts.join(", ")}` : "All leads";
}

/**
 * Resolves a segment to its leads. Runs as the signed-in admin, so RLS is still
 * the thing deciding these rows are readable.
 */
export async function resolveSegment(
  supabase: SupabaseClient<Database>,
  segment: Segment,
  now: Date,
): Promise<SegmentLead[]> {
  let query = supabase.from("leads").select("id, name, company, email, mobile");

  if (segment.kind === "ids") {
    query = query.in("id", segment.ids);
  } else {
    if (segment.q) {
      const term = segment.q.replace(/[(),*]/g, " ").trim();
      if (term) {
        query = query.or(`name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%`);
      }
    }
    if (segment.type) query = query.eq("pnl_type", segment.type);
    if (segment.role) query = query.eq("job_role", segment.role);
    const from = sinceDate(segment.since, now);
    if (from) query = query.gte("created_at", from);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(MAX_SEGMENT_IDS);
  if (error) throw error;
  return data ?? [];
}

/** Round-trips a segment back into a querystring for links and redirects. */
export function segmentQuery(segment: Segment): string {
  const params = new URLSearchParams();
  if (segment.kind === "ids") {
    params.set("ids", segment.ids.join(","));
  } else {
    if (segment.q) params.set("q", segment.q);
    if (segment.type) params.set("type", segment.type);
    if (segment.role) params.set("role", segment.role);
    if (segment.since !== "all") params.set("since", segment.since);
  }
  return params.toString();
}

/**
 * Fills {{first_name}} and {{company}}. Unknown placeholders are left alone so
 * a typo shows up in the preview instead of silently deleting text.
 */
export function renderTemplate(template: string, lead: Pick<SegmentLead, "name" | "company">) {
  return template
    .replaceAll("{{first_name}}", lead.name.trim().split(/\s+/)[0] || lead.name)
    .replaceAll("{{company}}", lead.company);
}

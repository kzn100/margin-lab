import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const PAGE_SIZE = 25;

export const JOB_ROLES = [
  "Owner or founder",
  "Finance director or CFO",
  "Finance manager",
  "Commercial or sales lead",
  "Other",
] as const;

export const SINCE_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
] as const;

export type LeadFilters = {
  q: string;
  type: string;
  role: string;
  since: string;
  sort: "created_at" | "name" | "company";
  dir: "asc" | "desc";
  page: number;
};

/** searchParams are attacker-controlled, so every value is narrowed to a known one. */
export function parseFilters(params: Record<string, string | string[] | undefined>): LeadFilters {
  const one = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const sort = one("sort");
  const dir = one("dir");
  const page = Number.parseInt(one("page"), 10);

  return {
    q: one("q").slice(0, 100),
    type: ["full-year", "monthly"].includes(one("type")) ? one("type") : "",
    role: (JOB_ROLES as readonly string[]).includes(one("role")) ? one("role") : "",
    since: ["30", "90", "all"].includes(one("since")) ? one("since") : "all",
    sort: sort === "name" || sort === "company" ? sort : "created_at",
    dir: dir === "asc" ? "asc" : "desc",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Rebuild the querystring with one value changed, keeping the rest. */
export function withParam(filters: LeadFilters, patch: Partial<LeadFilters>) {
  const merged = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.type) params.set("type", merged.type);
  if (merged.role) params.set("role", merged.role);
  if (merged.since !== "all") params.set("since", merged.since);
  if (merged.sort !== "created_at") params.set("sort", merged.sort);
  if (merged.dir !== "desc") params.set("dir", merged.dir);
  if (merged.page > 1) params.set("page", String(merged.page));
  const qs = params.toString();
  return qs ? `/admin?${qs}` : "/admin";
}

export function sinceDate(since: string, now: Date) {
  if (since === "all") return null;
  const days = Number(since);
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

/**
 * Leads for one page of the table, plus the total matching the filters.
 * No user scoping — RLS lets an admin read every row, which is the point of
 * this page. A non-admin running the same query gets nothing back.
 */
export async function fetchLeadsPage(
  supabase: SupabaseClient<Database>,
  filters: LeadFilters,
  now: Date,
) {
  let query = supabase
    .from("leads")
    .select("id, name, company, job_role, email, mobile, pnl_type, created_at", {
      count: "exact",
    });

  if (filters.q) {
    // Escape the PostgREST or() separators before interpolating user input.
    const term = filters.q.replace(/[(),*]/g, " ").trim();
    if (term) {
      query = query.or(`name.ilike.%${term}%,company.ilike.%${term}%,email.ilike.%${term}%`);
    }
  }
  if (filters.type) query = query.eq("pnl_type", filters.type);
  if (filters.role) query = query.eq("job_role", filters.role);

  const from = sinceDate(filters.since, now);
  if (from) query = query.gte("created_at", from);

  const offset = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query
    .order(filters.sort, { ascending: filters.dir === "asc" })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) throw error;
  return { leads: data ?? [], total: count ?? 0 };
}

/**
 * Buckets lead signups into the last `weeks` Monday-started weeks.
 * The final bucket is the running week and is flagged partial, because a
 * half-finished week plotted against complete ones reads as a collapse.
 */
export function weeklyBuckets(createdAt: string[], now: Date, weeks = 12) {
  const startOfWeek = (d: Date) => {
    const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    // getUTCDay is 0 for Sunday, which belongs to the week that began 6 days earlier.
    copy.setUTCDate(copy.getUTCDate() - ((copy.getUTCDay() + 6) % 7));
    return copy;
  };

  const current = startOfWeek(now);
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(current);
    start.setUTCDate(start.getUTCDate() - (weeks - 1 - i) * 7);
    return { weekStart: start.toISOString().slice(0, 10), count: 0, partial: i === weeks - 1 };
  });
  const index = new Map(buckets.map((b, i) => [b.weekStart, i]));

  for (const iso of createdAt) {
    const key = startOfWeek(new Date(iso)).toISOString().slice(0, 10);
    const i = index.get(key);
    if (i !== undefined) buckets[i].count++;
  }
  return buckets;
}

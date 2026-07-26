/** Run: npm test */

import assert from "node:assert/strict";
import test from "node:test";
import { parseFilters, weeklyBuckets, withParam, sinceDate } from "./leads.ts";

test("filters fall back to safe defaults for junk input", () => {
  const f = parseFilters({ type: "'; drop table leads;--", role: "root", since: "9999", sort: "id", dir: "sideways", page: "-3" });
  assert.equal(f.type, "");
  assert.equal(f.role, "");
  assert.equal(f.since, "all");
  assert.equal(f.sort, "created_at", "sort feeds an ORDER BY, so it must be an allow-list");
  assert.equal(f.dir, "desc");
  assert.equal(f.page, 1);
});

test("valid filters survive, and repeated params take the first", () => {
  const f = parseFilters({ q: "teratai", type: "monthly", role: "Finance manager", since: "30", sort: "company", dir: "asc", page: "4" });
  assert.deepEqual(f, {
    q: "teratai",
    type: "monthly",
    role: "Finance manager",
    since: "30",
    sort: "company",
    dir: "asc",
    page: 4,
  });
  assert.equal(parseFilters({ q: ["first", "second"] }).q, "first");
});

test("withParam keeps the other filters and drops defaults from the URL", () => {
  const base = parseFilters({ q: "acme", type: "monthly", page: "3" });
  assert.equal(withParam(base, { page: 4 }), "/admin?q=acme&type=monthly&page=4");
  // Changing a filter resets nothing implicitly, but defaults stay out of the URL.
  assert.equal(withParam(base, { q: "", type: "", page: 1 }), "/admin");
});

test("sinceDate counts back from now, and 'all' means no bound", () => {
  const now = new Date("2026-07-26T12:00:00Z");
  assert.equal(sinceDate("all", now), null);
  assert.equal(sinceDate("30", now), "2026-06-26T12:00:00.000Z");
});

test("weekly buckets start on Monday and flag the running week", () => {
  // A Sunday: it belongs to the week that began on Monday the 20th, which is
  // the case a naive getUTCDay() subtraction gets wrong.
  const now = new Date("2026-07-26T09:00:00Z");
  const buckets = weeklyBuckets(
    [
      "2026-07-26T08:00:00Z", // today, current week
      "2026-07-20T00:00:00Z", // Monday of the current week
      "2026-07-19T23:59:00Z", // Sunday before, previous week
      "2020-01-01T00:00:00Z", // older than the window, ignored
    ],
    now,
    12,
  );

  assert.equal(buckets.length, 12);
  assert.equal(buckets[11].weekStart, "2026-07-20");
  assert.equal(buckets[11].count, 2);
  assert.equal(buckets[11].partial, true, "the running week is not comparable to finished ones");
  assert.equal(buckets[10].weekStart, "2026-07-13");
  assert.equal(buckets[10].count, 1);
  assert.equal(buckets[0].weekStart, "2026-05-04");
  assert.equal(
    buckets.reduce((n, b) => n + b.count, 0),
    3,
    "the 2020 signup falls outside the window",
  );
});

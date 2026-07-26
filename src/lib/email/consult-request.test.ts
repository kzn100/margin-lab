/** Run: npm test */

import assert from "node:assert/strict";
import test from "node:test";
import { renderConsultRequestEmail } from "./consult-request.ts";
import type { PnlMetrics } from "../pnl/compute.ts";

const metrics = {
  period: { start: "2024-01", end: "2024-12", months: 12 },
  totals: {
    revenue: 1_000_000,
    cogs: 600_000,
    grossProfit: 400_000,
    opex: 250_000,
    operatingProfit: 150_000,
    netProfit: 120_000,
    units: null,
  },
  margins: { grossPct: 40, operatingPct: 15, netPct: 12 },
  monthly: [],
  bridge: [],
  opexBreakdown: [{ category: "Marketing", amount: 150_000, pctOfRevenue: 15 }],
  revenueSplit: null,
  headline: {
    netProfit: 120_000,
    netMarginPct: 12,
    biggestOpex: { category: "Marketing", pctOfRevenue: 15 },
    revenueTrendPct: 8,
  },
} as unknown as PnlMetrics;

const req = {
  name: "Nurul Aziz",
  company: "Teratai",
  jobRole: "Finance Director",
  mobile: "+60123456789",
  email: "nurul@teratai.com",
  resultUrl: "https://example.com/results/abc",
  requestedAt: "2026-07-26T09:00:00.000Z",
  metrics,
};

test("the request carries the contact details, the numbers and the link", () => {
  const mail = renderConsultRequestEmail(req);
  assert.ok(mail.subject.includes("Teratai"));
  assert.ok(mail.subject.includes("Nurul Aziz"));
  for (const field of ["Finance Director", "+60123456789", "nurul@teratai.com"]) {
    assert.match(mail.text, new RegExp(field.replace(/[+]/g, "\\$&")));
  }
  assert.match(mail.text, /RM 1,000,000/);
  assert.match(mail.text, /Marketing — RM 150,000 \(15% of revenue\)/);
  assert.match(mail.text, /https:\/\/example\.com\/results\/abc/);
});

test("a missing revenue split says so instead of dropping the line", () => {
  assert.match(renderConsultRequestEmail(req).text, /Revenue split unavailable/);
});

test("blank optional contact fields render as a dash, not as nothing", () => {
  const mail = renderConsultRequestEmail({ ...req, jobRole: "", mobile: "" });
  assert.match(mail.text, /Role      —/);
  assert.match(mail.text, /Mobile    —/);
});

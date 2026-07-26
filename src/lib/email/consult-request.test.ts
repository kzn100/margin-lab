/** Run: npm test */

import assert from "node:assert/strict";
import test from "node:test";
import {
  consultPdfFilename,
  renderConsultRequestEmail,
  renderConsultRequestPdfLines,
} from "./consult-request.ts";
import { MAX_CHARS } from "../pdf.ts";
import type { PnlMetrics } from "../pnl/compute.ts";

const month = (m: string, revenue: number, momPct: number | null) => ({
  month: m,
  revenue,
  cogs: revenue * 0.6,
  grossProfit: revenue * 0.4,
  opex: revenue * 0.25,
  operatingProfit: revenue * 0.15,
  netProfit: revenue * 0.12,
  grossMarginPct: 40,
  operatingMarginPct: 15,
  netMarginPct: 12,
  units: null,
  asp: null,
  revenueMomPct: momPct,
  revenueYoyPct: null,
});

const metrics = {
  period: { start: "2024-01", end: "2024-02", months: 2 },
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
  monthly: [month("2024-01", 400_000, null), month("2024-02", 600_000, 50)],
  bridge: [],
  opexBreakdown: [
    { category: "Marketing", amount: 150_000, pctOfRevenue: 15 },
    { category: "Rent", amount: 100_000, pctOfRevenue: 10 },
  ],
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
  requestedAt: "2026-07-26T09:00:00.000Z",
  metrics,
};

test("the email carries the contact details and the headline numbers", () => {
  const mail = renderConsultRequestEmail(req);
  assert.ok(mail.subject.includes("Teratai"));
  assert.ok(mail.subject.includes("Nurul Aziz"));
  for (const field of ["Finance Director", "\\+60123456789", "nurul@teratai.com"]) {
    assert.match(mail.text, new RegExp(field));
  }
  assert.match(mail.text, /RM 1,000,000/);
  assert.match(mail.text, /attached as a PDF/);
});

test("the email carries no link at all", () => {
  assert.doesNotMatch(renderConsultRequestEmail(req).text, /https?:/);
});

test("blank optional contact fields render as a dash, not as nothing", () => {
  const mail = renderConsultRequestEmail({ ...req, jobRole: "", mobile: "" });
  assert.match(mail.text, /Role {6}—/);
  assert.match(mail.text, /Mobile {4}—/);
});

test("the PDF carries every month, the totals row and every cost line", () => {
  const lines = renderConsultRequestPdfLines(req);
  const find = (prefix: string) => lines.find((l) => l.startsWith(prefix));

  assert.ok(find("2024-01")?.includes("400,000"));
  assert.ok(find("2024-02")?.includes("50.0%"), "the MoM column is filled in");
  assert.ok(find("2024-01")?.includes("—"), "the first month has no MoM figure");
  assert.ok(find("Total")?.includes("1,000,000"));
  assert.ok(find("Marketing")?.includes("150,000"));
  assert.ok(find("Rent")?.includes("100,000"), "cost lines are not truncated to the email's five");
  assert.match(lines.join("\n"), /Not available — the uploaded P&L carried no unit volumes/);
});

test("the table stays inside the page width, even in the billions", () => {
  // Past the fold point the PDF writer wraps the line and the columns stop
  // lining up, so the widths have to hold for the largest P&L we would see.
  const billions = JSON.parse(JSON.stringify(metrics)) as PnlMetrics;
  const scale = (n: number) => n * 10_000;
  billions.totals = { ...billions.totals, revenue: scale(billions.totals.revenue) };
  billions.monthly = billions.monthly.map((m) => ({ ...m, revenue: scale(m.revenue) }));
  for (const line of renderConsultRequestPdfLines({ ...req, metrics: billions })) {
    assert.ok(line.length <= MAX_CHARS, `${line.length}: ${line}`);
    assert.doesNotMatch(line, /\d,\d{3}[-\d]/, `columns collide: ${line}`);
  }
});

test("the filename is safe and names the company and period", () => {
  assert.equal(
    consultPdfFilename({ ...req, company: "Teratai Sdn/Bhd" }),
    "RGM-analysis-Teratai-Sdn-Bhd-2024-01-2024-02.pdf",
  );
});

/**
 * Run: npm test
 * Covers the parts that would silently produce a wrong analysis: header
 * matching, number coercion, the bridge adding up, and the price/volume/mix
 * split reconciling to the revenue change.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { computeMetrics } from "./compute.ts";
import { parseAmount, parseMonth, parsePnl, PnlParseError, rowsFromTable, splitCsv } from "./parse.ts";

const TEMPLATE = "public/margin-lab-pnl-template.csv";

test("parseMonth accepts the formats a finance team actually exports", () => {
  assert.equal(parseMonth("2025-01"), "2025-01");
  assert.equal(parseMonth("2025-01-31"), "2025-01");
  assert.equal(parseMonth("2025/3"), "2025-03");
  assert.equal(parseMonth("Jan 2025"), "2025-01");
  assert.equal(parseMonth("January 2025"), "2025-01");
  assert.equal(parseMonth("Dec-2025"), "2025-12");
  assert.equal(parseMonth("3/2025"), "2025-03");
  assert.equal(parseMonth("2025-13"), null);
  assert.equal(parseMonth("Total"), null);
  assert.equal(parseMonth(""), null);
});

test("parseAmount handles thousands separators, currency and accounting negatives", () => {
  assert.equal(parseAmount("1,234.50"), 1234.5);
  assert.equal(parseAmount("RM 412,000"), 412000);
  assert.equal(parseAmount("(500)"), -500);
  assert.equal(parseAmount("-7,200"), -7200);
  assert.equal(parseAmount("-"), 0);
  assert.equal(parseAmount(""), 0);
});

test("splitCsv keeps quoted commas in one field", () => {
  const rows = splitCsv('Month,Note\n2025-01,"a, b"\n');
  assert.deepEqual(rows, [
    ["Month", "Note"],
    ["2025-01", "a, b"],
  ]);
});

test("any column starting with opex becomes a category, whatever it is called", () => {
  const rows = rowsFromTable(
    splitCsv(
      "Month,Revenue,COGS,Opex Rent,Operating Expense Payroll\n" +
        "2025-01,100,40,10,20\n2025-02,120,50,10,25\n",
    ),
  );
  assert.deepEqual(Object.keys(rows[0].opex).sort(), ["Payroll", "Rent"]);
  assert.equal(rows[0].opex.Rent, 10);
  assert.equal(rows[1].opex.Payroll, 25);
});

test("rows are sorted, preamble skipped, and total rows ignored", () => {
  const rows = rowsFromTable(
    splitCsv(
      "Acme Sdn Bhd P&L\n\nMonth,Revenue,COGS\n2025-02,120,50\n2025-01,100,40\nTotal,220,90\n",
    ),
  );
  assert.deepEqual(
    rows.map((r) => r.month),
    ["2025-01", "2025-02"],
  );
});

test("missing required columns fail with a message naming them", () => {
  assert.throws(
    () => rowsFromTable(splitCsv("Month,Sales\n2025-01,100\n2025-02,120\n")),
    (e: unknown) => e instanceof PnlParseError && /cogs/i.test((e as Error).message),
  );
});

test("a single month is rejected — nothing to trend", () => {
  assert.throws(
    () => rowsFromTable(splitCsv("Month,Revenue,COGS\n2025-01,100,40\n")),
    (e: unknown) => e instanceof PnlParseError && /at least 2 months/.test((e as Error).message),
  );
});

test("duplicate months are rejected", () => {
  assert.throws(
    () => rowsFromTable(splitCsv("Month,Revenue,COGS\n2025-01,100,40\n2025-01,110,40\n")),
    (e: unknown) => e instanceof PnlParseError && /more than once/.test((e as Error).message),
  );
});

test("the shipped template parses and its bridge reconciles", () => {
  const rows = rowsFromTable(splitCsv(readFileSync(TEMPLATE, "utf8")));
  assert.equal(rows.length, 12);

  const m = computeMetrics(rows);
  assert.equal(m.period.start, "2025-01");
  assert.equal(m.period.end, "2025-12");
  assert.equal(m.period.months, 12);

  // Bridge: revenue − COGS = gross profit, gross profit − opex = operating.
  const [rev, cogs, gp, ox] = m.bridge;
  assert.equal(rev.value + cogs.value, gp.value);
  assert.equal(round(gp.value + ox.value), m.totals.operatingProfit);

  // The template's own Net Profit column reconciles to revenue − COGS − opex,
  // which is the point of shipping a template: a client who fills it in and
  // gets a different number has a mistake to find.
  assert.equal(m.totals.netProfit, 297800);
  assert.equal(m.totals.netProfit, m.totals.operatingProfit);

  assert.equal(m.margins.grossPct, round((m.totals.grossProfit / m.totals.revenue) * 100));
  assert.equal(m.monthly[0].revenueMomPct, null, "first month has no prior month");
  assert.equal(m.monthly[1].revenueMomPct, -5.83);
  assert.equal(m.monthly[11].revenueYoyPct, null, "12 months cannot show year on year");

  // Opex breakdown ranks by size and covers every category in the file.
  assert.deepEqual(
    m.opexBreakdown.map((o) => o.category),
    ["Admin", "Selling", "Marketing", "Other"],
  );
  assert.equal(round(m.opexBreakdown.reduce((a, o) => a + o.amount, 0)), m.totals.opex);
  assert.equal(m.headline.biggestOpex?.category, "Admin");
});

test("price, volume and mix reconcile to the revenue change", () => {
  const rows = rowsFromTable(splitCsv(readFileSync(TEMPLATE, "utf8")));
  const s = computeMetrics(rows).revenueSplit;
  assert.ok(s, "template has units, so a split is expected");
  assert.equal(round(s.price + s.volume + s.mix), round(s.total));
  assert.ok(s.total > 0, "template revenue grows across the year");
});

test("no units column means no revenue split rather than a wrong one", () => {
  const rows = rowsFromTable(
    splitCsv("Month,Revenue,COGS\n2025-01,100,40\n2025-02,120,50\n2025-03,130,55\n"),
  );
  assert.equal(computeMetrics(rows).revenueSplit, null);
});

test("net profit is derived when the file has no such column", () => {
  const rows = rowsFromTable(
    splitCsv("Month,Revenue,COGS,Opex Admin\n2025-01,100,40,20\n2025-02,120,50,20\n"),
  );
  const m = computeMetrics(rows);
  assert.equal(m.totals.netProfit, m.totals.operatingProfit);
  assert.equal(m.totals.netProfit, 220 - 90 - 40);
});

test("a net profit column below operating profit is kept, not recomputed", () => {
  // Interest and tax sit below operating profit and the template does not model
  // them, so the file's own figure has to win.
  const rows = rowsFromTable(
    splitCsv(
      "Month,Revenue,COGS,Opex Admin,Net Profit\n2025-01,100,40,20,30\n2025-02,120,50,20,42\n",
    ),
  );
  const m = computeMetrics(rows);
  assert.equal(m.totals.operatingProfit, 90);
  assert.equal(m.totals.netProfit, 72);
});

test("xlsx uploads parse to the same rows as the csv", async () => {
  const ExcelJS = (await import("exceljs")).default;
  const csv = splitCsv(readFileSync(TEMPLATE, "utf8"));

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("P&L");
  csv.forEach((row, r) => {
    // Header row stays text; data rows go in as real numbers, the way a
    // spreadsheet actually stores them.
    sheet.addRow(r === 0 ? row : row.map((c, i) => (i === 0 ? c : Number(c))));
  });
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());

  const fromXlsx = await parsePnl(buffer, "pnl.xlsx");
  const fromCsv = await parsePnl(Buffer.from(readFileSync(TEMPLATE)), "pnl.csv");
  assert.deepEqual(fromXlsx, fromCsv);
});

test("an unsupported extension is refused before any parsing", async () => {
  await assert.rejects(
    () => parsePnl(Buffer.from("x"), "statement.pdf"),
    (e: unknown) => e instanceof PnlParseError && /\.pdf/.test((e as Error).message),
  );
});

function round(n: number, dp = 2) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

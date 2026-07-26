/**
 * P&L file → normalised monthly rows.
 *
 * Template: public/margin-lab-pnl-template.csv — one row per month.
 *   Month, Revenue, Units, COGS, Opex <Category>…, Net Profit
 *
 * Header matching is deliberately loose. Every client's chart of accounts names
 * its operating expense lines differently, so any column whose header starts
 * with "opex" (or "operating expense") becomes a category named by the rest of
 * the header. That way the template is a suggestion, not a straitjacket.
 *
 * Units and Net Profit are optional: without Units there is no price/volume/mix
 * decomposition, and without Net Profit it is derived as revenue − COGS − opex.
 */

export type PnlRow = {
  /** Canonical YYYY-MM. */
  month: string;
  revenue: number;
  cogs: number;
  /** Category name → amount. Empty object if the file carries no opex columns. */
  opex: Record<string, number>;
  /** null when the file has no units column. */
  units: number | null;
  /** null when the file has no net profit column — compute() derives it. */
  netProfit: number | null;
};

export class PnlParseError extends Error {}

/* ---------- CSV ---------- */

/** RFC4180-ish: handles quoted fields, escaped quotes, CRLF. */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/* ---------- cell coercion ---------- */

const MONTH_NAMES = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

/** "2025-01" · "Jan 2025" · "January 2025" · "1/2025" · "2025-01-31" → "2025-01" */
export function parseMonth(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  let m = /^(\d{4})[-/.](\d{1,2})/.exec(s);
  if (m) return iso(+m[1], +m[2]);

  m = /^(\d{1,2})[-/.](\d{4})$/.exec(s);
  if (m) return iso(+m[2], +m[1]);

  // Month name in either order, with or without a separator.
  const lower = s.toLowerCase();
  const idx = MONTH_NAMES.findIndex((n) => lower.includes(n));
  if (idx >= 0) {
    const year = /(\d{4})/.exec(s);
    if (year) return iso(+year[1], idx + 1);
  }

  // Excel serial dates arrive already converted by the xlsx reader; a bare
  // number here is a year-less index we cannot place.
  return null;

  function iso(y: number, mo: number) {
    if (mo < 1 || mo > 12) return null;
    return `${y}-${String(mo).padStart(2, "0")}`;
  }
}

/** "1,234.50" · "RM 1 234" · "(500)" · "-" · "" → number */
export function parseAmount(raw: string): number {
  const s = raw.trim();
  if (!s || s === "-" || s === "–") return 0;
  const negative = /^\(.*\)$/.test(s);
  const digits = s.replace(/[()]/g, "").replace(/[^0-9.\-]/g, "");
  if (digits === "" || digits === "-" || digits === ".") return 0;
  const n = Number(digits);
  if (!Number.isFinite(n)) return 0;
  return negative ? -Math.abs(n) : n;
}

/* ---------- header mapping ---------- */

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

type ColumnMap = {
  month: number;
  revenue: number;
  cogs: number;
  units: number | null;
  netProfit: number | null;
  /** column index → category label */
  opex: Map<number, string>;
};

function mapColumns(header: string[]): ColumnMap {
  const map: ColumnMap = {
    month: -1,
    revenue: -1,
    cogs: -1,
    units: null,
    netProfit: null,
    opex: new Map(),
  };

  header.forEach((raw, i) => {
    const h = norm(raw);
    if (!h) return;

    const opex = /^(opex|operating expenses?|operating expense)\b\s*(.*)$/.exec(h);
    if (opex) {
      const label = opex[2].trim();
      map.opex.set(i, label ? titleCase(label) : "Operating expenses");
      return;
    }
    if (map.month < 0 && /^(month|period|date)\b/.test(h)) map.month = i;
    else if (map.revenue < 0 && /^(revenue|sales|turnover|net sales)\b/.test(h)) map.revenue = i;
    else if (map.cogs < 0 && /^(cogs|cost of goods|cost of sales|cost of revenue)\b/.test(h))
      map.cogs = i;
    else if (map.units === null && /^(units|volume|quantity|qty)\b/.test(h)) map.units = i;
    else if (map.netProfit === null && /^(net profit|net income|profit after tax|pat|net)\b/.test(h))
      map.netProfit = i;
  });

  const missing = (["month", "revenue", "cogs"] as const).filter((k) => map[k] < 0);
  if (missing.length) {
    throw new PnlParseError(
      `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. ` +
        `Found: ${header.filter(Boolean).join(", ") || "no headers"}. ` +
        `Download the template and keep its header row.`,
    );
  }
  return map;
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- rows ---------- */

export function rowsFromTable(table: string[][]): PnlRow[] {
  if (!table.length) throw new PnlParseError("The file is empty.");

  // Skip any preamble (title rows, blank rows) before the real header.
  const headerIdx = table.findIndex((r) => r.some((c) => /^(month|period|date)\b/.test(norm(c))));
  if (headerIdx < 0) {
    throw new PnlParseError(
      "Could not find a header row with a Month column. Download the template and keep its header row.",
    );
  }

  const cols = mapColumns(table[headerIdx]);
  const rows: PnlRow[] = [];

  for (const raw of table.slice(headerIdx + 1)) {
    const month = parseMonth(raw[cols.month] ?? "");
    if (!month) continue; // total rows, notes, blanks

    const opex: Record<string, number> = {};
    for (const [i, label] of cols.opex) {
      opex[label] = (opex[label] ?? 0) + Math.abs(parseAmount(raw[i] ?? ""));
    }

    rows.push({
      month,
      revenue: parseAmount(raw[cols.revenue] ?? ""),
      cogs: Math.abs(parseAmount(raw[cols.cogs] ?? "")),
      opex,
      units: cols.units === null ? null : parseAmount(raw[cols.units] ?? "") || null,
      netProfit: cols.netProfit === null ? null : parseAmount(raw[cols.netProfit] ?? ""),
    });
  }

  if (rows.length < 2) {
    throw new PnlParseError(
      `Found ${rows.length} month of data. The analysis needs at least 2 months to show a trend.`,
    );
  }

  rows.sort((a, b) => a.month.localeCompare(b.month));

  const duplicate = rows.find((r, i) => i > 0 && r.month === rows[i - 1].month);
  if (duplicate) {
    throw new PnlParseError(`${duplicate.month} appears more than once. One row per month.`);
  }
  if (rows.every((r) => r.revenue === 0)) {
    throw new PnlParseError("Every revenue figure read as zero. Check the Revenue column.");
  }
  return rows;
}

/* ---------- entry point ---------- */

/** Parse an uploaded .csv or .xlsx/.xls buffer into monthly rows. */
export async function parsePnl(buffer: Buffer, filename: string): Promise<PnlRow[]> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  if (ext === "csv" || ext === "txt") {
    return rowsFromTable(splitCsv(buffer.toString("utf8").replace(/^﻿/, "")));
  }

  if (ext === "xlsx" || ext === "xlsm" || ext === "xls") {
    // Imported lazily so the CSV path — and every route that never parses a
    // spreadsheet — does not pull in exceljs.
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = wb.worksheets[0];
    if (!sheet) throw new PnlParseError("The workbook has no sheets.");

    const table: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      // row.values is 1-indexed and sparse; walk to the sheet's column count so
      // empty leading cells keep their position.
      for (let c = 1; c <= sheet.columnCount; c++) {
        cells.push(cellText(row.getCell(c).value));
      }
      table.push(cells);
    });
    return rowsFromTable(table);
  }

  throw new PnlParseError(`Unsupported file type ".${ext}". Upload a .csv or .xlsx file.`);
}

/** exceljs cell value → plain string, including dates and formula results. */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  if (typeof v === "object") {
    const o = v as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((t) => t.text).join("");
    if (o.result !== undefined) return cellText(o.result);
    if (o.text !== undefined) return String(o.text);
    return "";
  }
  return String(v);
}

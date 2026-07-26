/**
 * A deliberately dumb PDF writer: text lines in, bytes out.
 *
 * The one thing we attach to email is a table of figures, so this covers a
 * title, monospaced body lines, pagination and nothing else — no images, no
 * layout engine, no wrapping rules beyond a hard fold at the page width.
 *
 * Hand-rolled rather than pulled from npm because the alternatives load their
 * font metrics from files on disk at runtime, which is exactly the thing that
 * breaks when Next.js traces a serverless function. The standard 14 fonts need
 * no metrics: the viewer already has them.
 */

const PAGE_W = 595; // A4 at 72dpi, rounded to whole points.
const PAGE_H = 842;
const MARGIN = 40;
// 8pt rather than 9: a P&L in the billions runs to thirteen digits a cell, and
// eight columns of those do not fit across A4 at 9pt without touching.
const SIZE = 8;
const LEADING = 11;
const TITLE_SIZE = 14;
const TITLE_GAP = 28;

/** Courier advances every glyph 0.6em, so the fold point is exact, not a guess. */
export const MAX_CHARS = Math.floor((PAGE_W - 2 * MARGIN) / (SIZE * 0.6));
const LINES_PER_PAGE = Math.floor((PAGE_H - 2 * MARGIN) / LEADING);
const FIRST_PAGE_LINES = LINES_PER_PAGE - Math.ceil(TITLE_GAP / LEADING);

/**
 * The standard fonts are WinAnsi-encoded, so anything outside it would render
 * as mojibake. These are the characters the app's own formatters emit — the
 * typographic minus from money() above all — mapped to what they stand in for.
 */
const ASCII: Record<string, string> = {
  "−": "-",
  "–": "-",
  "—": "-",
  "·": "-",
  "…": "...",
  "’": "'",
  "‘": "'",
  "“": '"',
  "”": '"',
  " ": " ",
};

const toAscii = (s: string) => s.replace(/[^\x20-\x7e]/g, (c) => ASCII[c] ?? "?");

/** Backslash, and the parens that would otherwise close the string literal. */
const esc = (s: string) => toAscii(s).replace(/[\\()]/g, (m) => `\\${m}`);

/**
 * Folds at word boundaries, because a hard character split lands in the middle
 * of a figure — "mix 594," / "898" reads as two numbers, not one.
 */
function fold(line: string) {
  if (line.length <= MAX_CHARS) return [line];
  const out: string[] = [];
  let current = "";
  for (const word of line.split(" ")) {
    // Nothing to break on: split it hard rather than push it off the page.
    if (word.length > MAX_CHARS) {
      if (current) out.push(current);
      current = "";
      for (let i = 0; i < word.length; i += MAX_CHARS) out.push(word.slice(i, i + MAX_CHARS));
      continue;
    }
    if (current && current.length + 1 + word.length > MAX_CHARS) {
      out.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) out.push(current);
  return out;
}

function paginate(lines: string[]) {
  const folded = lines.flatMap(fold);
  const pages = [folded.slice(0, FIRST_PAGE_LINES)];
  for (let i = FIRST_PAGE_LINES; i < folded.length; i += LINES_PER_PAGE) {
    pages.push(folded.slice(i, i + LINES_PER_PAGE));
  }
  return pages;
}

function contentStream(title: string | null, lines: string[]) {
  const out: string[] = [];
  let y = PAGE_H - MARGIN - (title ? TITLE_SIZE : SIZE);
  if (title) {
    out.push(`BT /F1 ${TITLE_SIZE} Tf ${MARGIN} ${y} Td (${esc(title)}) Tj ET`);
    y -= TITLE_GAP;
  }
  // One text object for the body: set the leading once, then T* per line.
  const runs = lines.map((l) => `(${esc(l)}) Tj T*`).join("\n");
  out.push(`BT /F2 ${SIZE} Tf ${LEADING} TL ${MARGIN} ${y} Td\n${runs}\nET`);
  return out.join("\n");
}

export function renderTextPdf(title: string, lines: string[]): Buffer {
  const pages = paginate(lines);

  // 1 catalog, 2 pages, 3–4 fonts, then a page and its content stream per page.
  const pageObj = (i: number) => 5 + i * 2;
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages
      .map((_, i) => `${pageObj(i)} 0 R`)
      .join(" ")}] >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
  ];

  pages.forEach((pageLines, i) => {
    const content = contentStream(i === 0 ? title : null, pageLines);
    objects[pageObj(i) - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageObj(i) + 1} 0 R >>`;
    objects[pageObj(i)] =
      `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });

  // Offsets are measured as the document is built, not predicted — a wrong
  // xref is the one error a viewer will not recover from.
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, i) => {
    const at = Buffer.byteLength(pdf, "latin1");
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return at;
  });

  const startxref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const at of offsets) pdf += `${String(at).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${startxref}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

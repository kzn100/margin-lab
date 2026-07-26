/** Run: npm test */

import assert from "node:assert/strict";
import test from "node:test";
import { MAX_CHARS, renderTextPdf } from "./pdf.ts";

const asText = (b: Buffer) => b.toString("latin1");

test("the file is a structurally complete PDF", () => {
  const pdf = asText(renderTextPdf("Title", ["one", "two"]));
  assert.match(pdf, /^%PDF-1\.4\n/);
  assert.match(pdf, /\n%%EOF\n$/);
  // Catalog, pages, two fonts, one page, one content stream — plus the free
  // object at index 0 that every xref table opens with.
  assert.match(pdf, /\nxref\n0 7\n/);
  assert.match(pdf, /\/Size 7 /);
  assert.match(pdf, /\/Root 1 0 R/);
  assert.match(pdf, /startxref\n\d+\n/);
});

test("the xref offsets point at the objects they claim to", () => {
  // A wrong offset is the one error a viewer cannot recover from, so check the
  // bytes rather than trusting that the table was built in the right order.
  const pdf = asText(renderTextPdf("Title", ["one"]));
  const table = /\nxref\n0 \d+\n0000000000 65535 f \n([\s\S]*?)\ntrailer/.exec(pdf);
  assert.ok(table);
  const offsets = table[1].trim().split("\n").map((l) => Number(l.slice(0, 10)));
  offsets.forEach((at, i) => assert.ok(pdf.startsWith(`${i + 1} 0 obj`, at), `object ${i + 1}`));
});

test("the supplied text reaches the content stream", () => {
  assert.match(asText(renderTextPdf("Consultation", ["Revenue  1,000,000"])), /\(Revenue {2}1,000,000\) Tj/);
});

test("parens and backslashes are escaped, not left to break the syntax", () => {
  const pdf = asText(renderTextPdf("T", ["Marketing (net) \\ promo"]));
  assert.match(pdf, /\(Marketing \\\(net\\\) \\\\ promo\) Tj/);
});

test("non-ASCII is transliterated, never emitted raw", () => {
  // money() emits a typographic minus, which WinAnsi would render as mojibake.
  const pdf = renderTextPdf("Café — −1,000", ["−1,000 · Ω"]);
  assert.ok(pdf.every((byte) => byte < 0x80));
  assert.match(asText(pdf), /\(-1,000 - \?\) Tj/);
  assert.match(asText(pdf), /\(Caf\? - -1,000\) Tj/);
});

test("long output paginates instead of running off the page", () => {
  const pages = (pdf: string) => (pdf.match(/\/Type \/Page[^s]/g) ?? []).length;
  assert.equal(pages(asText(renderTextPdf("T", Array(10).fill("x")))), 1);
  assert.equal(pages(asText(renderTextPdf("T", Array(120).fill("x")))), 2);
});

test("a line wider than the page folds at a word boundary", () => {
  // A hard split lands mid-figure — "mix 594," / "898" reads as two numbers.
  const line = `mix ${"9".repeat(20)}, total ${"8".repeat(20)} a month. `.repeat(4).trim();
  // slice(1) drops the title, which is drawn by the same operator.
  const drawn = [...asText(renderTextPdf("T", [line])).matchAll(/\((.*?)\) Tj/g)]
    .map((m) => m[1])
    .slice(1);
  assert.ok(drawn.length > 1, "it folded");
  for (const l of drawn) assert.ok(l.length <= MAX_CHARS, l);
  assert.equal(drawn.join(" "), line);
});

test("an unbreakable token is split hard rather than pushed off the page", () => {
  const pdf = asText(renderTextPdf("T", ["y".repeat(MAX_CHARS * 2 + 5)]));
  const drawn = [...pdf.matchAll(/\((y+)\) Tj/g)].map((m) => m[1]);
  assert.deepEqual(
    drawn.map((l) => l.length),
    [MAX_CHARS, MAX_CHARS, 5],
  );
});

/** Run: npm test */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildAudiencePayload, hashEmail, hashPhone, normalisePhone } from "./meta.ts";
import { describeSegment, parseSegment, renderTemplate, segmentQuery } from "./segment.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("explicit ids are accepted, deduped, and anything not a uuid is dropped", () => {
  const segment = parseSegment({ ids: `${A},not-a-uuid,${B},${A},'; delete from leads;--` });
  assert.deepEqual(segment, { kind: "ids", ids: [A, B] });
});

test("an ids param with nothing usable falls back to the filter segment", () => {
  const segment = parseSegment({ ids: "garbage,also-garbage", type: "monthly" });
  assert.deepEqual(segment, { kind: "filter", q: "", type: "monthly", role: "", since: "all" });
});

test("filter values are narrowed to known ones", () => {
  const segment = parseSegment({ type: "everything", role: "superuser", since: "9999" });
  assert.deepEqual(segment, { kind: "filter", q: "", type: "", role: "", since: "all" });
});

test("a segment round-trips through its querystring", () => {
  for (const params of [
    { ids: `${A},${B}` },
    { q: "teratai", type: "monthly", role: "Finance manager", since: "30" },
    {},
  ]) {
    const original = parseSegment(params);
    const roundTripped = parseSegment(Object.fromEntries(new URLSearchParams(segmentQuery(original))));
    assert.deepEqual(roundTripped, original, JSON.stringify(params));
  }
});

test("segments describe themselves in words for the audit log", () => {
  assert.equal(describeSegment({ kind: "ids", ids: [A, B] }, 2), "2 leads picked by hand");
  assert.equal(describeSegment({ kind: "ids", ids: [A] }, 1), "1 lead picked by hand");
  assert.equal(
    describeSegment({ kind: "filter", q: "", type: "full-year", role: "", since: "30" }, 7),
    "Leads full-year uploads, signed up in the last 30 days",
  );
  assert.equal(
    describeSegment({ kind: "filter", q: "", type: "", role: "", since: "all" }, 31),
    "All leads",
  );
});

test("placeholders fill from the lead, and unknown ones are left visible", () => {
  const lead = { name: "Nurul  Aziz", company: "Teratai Beverages" };
  assert.equal(renderTemplate("Hi {{first_name}},", lead), "Hi Nurul,");
  assert.equal(renderTemplate("{{company}} margin", lead), "Teratai Beverages margin");
  assert.equal(renderTemplate("{{first_name}} x {{first_name}}", lead), "Nurul x Nurul");
  // A typo has to survive to the preview rather than blanking the text.
  assert.equal(renderTemplate("Hi {{firstname}},", lead), "Hi {{firstname}},");
  assert.equal(renderTemplate("Hi {{first_name}}", { name: "Cher", company: "X" }), "Hi Cher");
});

test("Meta hashing follows the normalise-then-sha256 rule", () => {
  const expected = createHash("sha256").update("nurul@teratai.com.my").digest("hex");
  assert.equal(hashEmail("  Nurul@Teratai.com.MY  "), expected, "trim then lowercase then hash");
  assert.equal(hashEmail("nurul@teratai.com.my"), expected);
  assert.equal(hashEmail("a@b.com").length, 64);
});

test("phone numbers get a country code before hashing", () => {
  // Local format: the leading zero is replaced by the country code, otherwise
  // Meta never matches the number.
  assert.equal(normalisePhone("012-345 6789"), "60123456789");
  assert.equal(normalisePhone("+60 12 345 6789"), "60123456789");
  assert.equal(normalisePhone("0123456789", "65"), "65123456789");
  assert.equal(normalisePhone(""), "");
  // Both spellings of the same number must hash identically or the audience
  // silently splits in two.
  assert.equal(hashPhone("012-345 6789"), hashPhone("+60123456789"));
  assert.equal(hashPhone(""), "");
});

test("the audience payload is one row per lead in schema order", () => {
  const leads = [
    { id: A, name: "A", company: "C1", email: "a@x.com", mobile: "+60123456789" },
    { id: B, name: "B", company: "C2", email: "b@x.com", mobile: "" },
  ];
  const payload = buildAudiencePayload(leads);
  assert.deepEqual(payload.schema, ["EMAIL", "PHONE"]);
  assert.equal(payload.data.length, 2);
  assert.deepEqual(payload.data[0], [hashEmail("a@x.com"), hashPhone("+60123456789")]);
  assert.deepEqual(payload.data[1], [hashEmail("b@x.com"), ""], "a missing phone stays empty");
  // Nothing raw may appear anywhere in the payload.
  const serialised = JSON.stringify(payload);
  assert.ok(!serialised.includes("a@x.com"), "raw email must never be in the payload");
  assert.ok(!serialised.includes("60123456789"), "raw phone must never be in the payload");
});

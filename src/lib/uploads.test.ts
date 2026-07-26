/** Run: npm test */

import assert from "node:assert/strict";
import test from "node:test";
import { canReadPath, safeStoragePath } from "./uploads.ts";

const UID = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

test("a user reads their own prefix and nothing else", () => {
  assert.equal(canReadPath(`${UID}/lead-pnl.csv`, UID, false), true);
  assert.equal(canReadPath(`${OTHER}/lead-pnl.csv`, UID, false), false);
  // A prefix match is not a path match: this is a sibling directory.
  assert.equal(canReadPath(`${UID}-other/pnl.csv`, UID, false), false);
});

test("rejected uploads are out of reach of a normal user", () => {
  assert.equal(canReadPath("rejected/abc-pnl.csv", UID, false), false);
  assert.equal(canReadPath("rejected/abc-pnl.csv", UID, true), true);
});

test("traversal and absolute paths are refused, admin or not", () => {
  for (const admin of [false, true]) {
    assert.equal(canReadPath(`${UID}/../${OTHER}/pnl.csv`, UID, admin), false);
    assert.equal(canReadPath(`/${UID}/pnl.csv`, UID, admin), false);
    assert.equal(canReadPath(`${UID}\\pnl.csv`, UID, admin), false);
    assert.equal(canReadPath("", UID, admin), false);
  }
});

test("an admin reads any well-formed path", () => {
  assert.equal(canReadPath(`${OTHER}/lead-pnl.csv`, UID, true), true);
});

test("a filename is reduced to characters an object key can hold", () => {
  assert.equal(safeStoragePath("My P&L (final).xlsx"), "My-P-L-final-.xlsx");
});

test("a sanitised name never contains .., which canReadPath would refuse", () => {
  for (const name of ["../../etc/passwd", "my..file.csv", "....xlsx"]) {
    const safe = safeStoragePath(name);
    assert.ok(!safe.includes(".."), `${name} -> ${safe}`);
    assert.equal(canReadPath(`${UID}/${safe}`, UID, false), true);
  }
});

test("an overlong filename keeps its tail, so the extension survives", () => {
  const name = `${"a".repeat(200)}.xlsx`;
  const safe = safeStoragePath(name);
  assert.equal(safe.length, 80);
  assert.ok(safe.endsWith(".xlsx"));
});

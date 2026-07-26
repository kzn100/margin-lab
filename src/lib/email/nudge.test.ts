/** Run: npm test */

import assert from "node:assert/strict";
import test from "node:test";
import {
  NUDGE_AFTER_MS,
  renderStage1Email,
  renderStage2Email,
  selectStage1,
  selectStage2,
  type NudgeLead,
  type SignupStart,
} from "./nudge.ts";

const NOW = new Date("2026-07-26T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

const start = (over: Partial<SignupStart> = {}): SignupStart => ({
  id: "s1",
  email: "someone@example.com",
  created_at: ago(NUDGE_AFTER_MS),
  followed_up_at: null,
  ...over,
});

const lead = (over: Partial<NudgeLead> = {}): NudgeLead => ({
  id: "l1",
  name: "Nurul Aziz",
  company: "Teratai",
  email: "nurul@example.com",
  created_at: ago(NUDGE_AFTER_MS),
  upload_nudge_sent_at: null,
  ...over,
});

test("stage 1 waits out the full hour before chasing anyone", () => {
  const tooNew = start({ created_at: ago(NUDGE_AFTER_MS - 1) });
  assert.deepEqual(selectStage1([tooNew], [], NOW), []);
  // Exactly on the boundary counts as due.
  assert.equal(selectStage1([start()], [], NOW).length, 1);
});

test("stage 1 skips anyone already followed up", () => {
  const done = start({ followed_up_at: ago(0) });
  assert.deepEqual(selectStage1([done], [], NOW), []);
});

test("finishing registration cancels the abandoned-signup nudge", () => {
  const pending = start({ email: "Someone@Example.com" });
  // Case differs on both sides — matching has to be case-insensitive or a lead
  // who typed a capital gets chased for a signup they completed.
  assert.deepEqual(selectStage1([pending], ["someone@EXAMPLE.com"], NOW), []);
  assert.equal(selectStage1([pending], ["other@example.com"], NOW).length, 1);
});

test("stage 2 waits out the hour and skips leads already nudged", () => {
  assert.deepEqual(selectStage2([lead({ created_at: ago(0) })], [], NOW), []);
  assert.deepEqual(selectStage2([lead({ upload_nudge_sent_at: ago(0) })], [], NOW), []);
  assert.equal(selectStage2([lead()], [], NOW).length, 1);
});

test("uploading a P&L cancels the upload nudge", () => {
  assert.deepEqual(selectStage2([lead({ id: "l1" })], ["l1"], NOW), []);
  assert.equal(selectStage2([lead({ id: "l1" })], ["l2"], NOW).length, 1);
});

test("both emails carry their call to action", () => {
  const one = renderStage1Email("https://margin-lab.netlify.app/register");
  assert.match(one.text, /https:\/\/margin-lab\.netlify\.app\/register/);
  assert.ok(one.subject.length > 0);

  const two = renderStage2Email("Nurul Aziz", "Teratai", "https://example.com/analyses/new");
  // First name only — "Hi Nurul Aziz," reads like a form letter.
  assert.match(two.text, /^Hi Nurul,/);
  assert.match(two.text, /Teratai/);
  assert.match(two.text, /https:\/\/example\.com\/analyses\/new/);
});

test("a one-word or blank name still greets sensibly", () => {
  assert.match(renderStage2Email("Nurul", "Teratai", "u").text, /^Hi Nurul,/);
  assert.match(renderStage2Email("  ", "Teratai", "u").text, /^Hi there,/);
});

/** Run: npm test */

import assert from "node:assert/strict";
import test from "node:test";
import { renderUploadReminderEmail } from "./upload-reminder.ts";

test("the reminder carries the company and the upload link", () => {
  const mail = renderUploadReminderEmail(
    "Nurul Aziz",
    "Teratai",
    "https://example.com/analyses/new",
  );
  assert.ok(mail.subject.includes("Teratai"));
  assert.match(mail.text, /Teratai/);
  assert.match(mail.text, /https:\/\/example\.com\/analyses\/new/);
});

test("only the first name is used in the greeting", () => {
  // "Hi Nurul Aziz," reads like a form letter.
  assert.match(renderUploadReminderEmail("Nurul Aziz", "T", "u").text, /^Hi Nurul,/);
  assert.match(renderUploadReminderEmail("Nurul", "T", "u").text, /^Hi Nurul,/);
});

test("a blank name still greets sensibly", () => {
  assert.match(renderUploadReminderEmail("  ", "T", "u").text, /^Hi there,/);
});

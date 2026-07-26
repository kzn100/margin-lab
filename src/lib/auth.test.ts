/** Run: npm test */

import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
import { homeFor, initials, roleOf, safeNext } from "./auth.ts";

const asUser = (app_metadata: Record<string, unknown>) => ({ app_metadata }) as unknown as User;

test("role comes from app_metadata and defaults to user", () => {
  assert.equal(roleOf(asUser({ role: "admin" })), "admin");
  assert.equal(roleOf(asUser({ role: "user" })), "user");
  assert.equal(roleOf(asUser({})), "user");
  assert.equal(roleOf(null), "user");
  // user_metadata is writable by the user themselves, so a role planted there
  // must not count.
  assert.equal(roleOf({ user_metadata: { role: "admin" } } as unknown as User), "user");
});

test("each role lands on its own home", () => {
  assert.equal(homeFor("admin"), "/admin");
  assert.equal(homeFor("user"), "/dashboard");
});

test("safeNext only follows same-origin paths", () => {
  assert.equal(safeNext("/results/abc", "/dashboard"), "/results/abc");
  assert.equal(safeNext(undefined, "/dashboard"), "/dashboard");
  assert.equal(safeNext("", "/dashboard"), "/dashboard");
  // Open-redirect attempts: an absolute URL, and the protocol-relative form
  // that still leaves the site while starting with a slash.
  assert.equal(safeNext("https://evil.example", "/dashboard"), "/dashboard");
  assert.equal(safeNext("//evil.example", "/dashboard"), "/dashboard");
  assert.equal(safeNext("javascript:alert(1)", "/dashboard"), "/dashboard");
});

test("initials fall back to the email when there is no name", () => {
  assert.equal(initials("Nurul Aziz", "n@x.com"), "NA");
  assert.equal(initials(undefined, "faridah.ismail@teratai.com.my"), "FI");
  assert.equal(initials("   ", "zana@x.com"), "ZX");
  assert.equal(initials("Cher", "c@x.com"), "C");
});

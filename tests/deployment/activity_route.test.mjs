import test from "node:test";
import assert from "node:assert/strict";

test("Vercel exposes the production Activity endpoint", async () => {
  const route = await import("../../api/activity.mjs");
  assert.equal(typeof route.default, "function");
});

import assert from "node:assert/strict";
import test from "node:test";
import { buildSeedDigestTitle, seedDigestTitle } from "./digestTitle.ts";

test("seedDigestTitle uses the seeded user's display name and digest date", () => {
  assert.equal(
    seedDigestTitle("alexchen", "2026-07-16T02:00:00Z"),
    "Alex Chen’s AI Digest — July 16, 2026",
  );
});

test("seedDigestTitle uses the community title for public digests", () => {
  assert.equal(
    seedDigestTitle(null, "2026-07-16T02:00:00Z"),
    "Verita Community Digest — July 16, 2026",
  );
});

test("buildSeedDigestTitle trims and counts Unicode code points", () => {
  const displayName = `\u2003${"😀".repeat(172)}\u2003`;
  assert.equal(
    buildSeedDigestTitle(displayName, "2026-07-16T02:00:00Z", false),
    `${"😀".repeat(172)}’s AI Digest — July 16, 2026`,
  );
});

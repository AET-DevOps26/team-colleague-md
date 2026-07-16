import assert from "node:assert/strict";
import test from "node:test";
import { seedDigestTitle } from "./digestTitle.ts";

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

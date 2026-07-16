import assert from "node:assert/strict";
import test from "node:test";
import { SEED_USERS } from "./usersData.ts";

test("only three seeded users receive daily digests", () => {
  const dailyUsernames = SEED_USERS.filter((user) => user.digestFrequency === "DAILY").map(
    (user) => user.username,
  );

  assert.deepEqual(dailyUsernames, ["alexchen", "sarahjkim", "priya_ml"]);
  assert.ok(
    SEED_USERS.filter((user) => !dailyUsernames.includes(user.username)).every(
      (user) => user.digestFrequency === "FALSE",
    ),
  );
});

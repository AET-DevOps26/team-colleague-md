# Zero-subscription users receive an assigned public digest instead of no digest

> **Re-based by [ADR-0019](0019-standalone-digest-entity.md).** The public-fallback decision holds,
> now implemented on the standalone `digests` table with an explicit `PUBLIC` `digest_type` and a
> `digest_assignments` table (instead of a null-target `DIGEST` post).

Users who follow no topics used to get nothing from the daily digest run — the generator
returned `SKIPPED("User has no followed topics.")` and no post was created (see
`DailyDigestGenerationService.generateForUser`). This ADR gives those users a **public
digest**: a single platform-wide digest generated once per Platform Day (`target_user_id
IS NULL`), which zero-subscription recipients are *assigned* to (shared, not copied). The
digest management surface can then show, per day, whether the user received a personal or a
public digest, and the frontend prompts un-subscribed users that they will only receive the
public one. Extends the per-user digest association model (ADR-0013) and the digest access
model (ADR-0016).

## Context

The daily job (`DailyDigestJob` → `DailyDigestGenerationService.generateDueDigests`) pulls
every `DAILY` recipient from user-service and calls `generateForUser`. Recipient membership
depends only on the user's digest-frequency preference — **not** on whether they follow any
topic. But `resolveTopics(userId)` reads the user's topic subscriptions from
recommendation-service, and when that set is empty the run short-circuits to `SKIPPED` and
creates nothing. Net effect: a `DAILY` user with zero subscriptions silently receives no
digest, forever, with no signal in the UI explaining why.

The schema already anticipates a shared/global digest: `posts.target_user_id` is nullable and
V9 documents `NULL = global/system digest belonging to no one`. `PostService.getPublicTodayDigest`
reads the newest null-target DIGEST for the logged-out surface (ADR-0016). **However, nothing
in the system currently produces a null-target digest** — the daily path always sets
`targetUserId = userId`. So delivering a public fallback requires first building a public
digest *producer*, then a way to record which users received it on which day.

Personal digests are expressed as `posts.target_user_id = userId`; querying a user's history
(`getMyDigests`) filters on that column. A public digest is one shared row, so "user X received
the public digest on day D" cannot be expressed by `target_user_id` alone without duplicating
the post per user — which we explicitly reject (see Considered Options).

## Decision

- **One public digest per Platform Day, generated from platform trending topics.**
  `generateDueDigests` first calls `ensurePublicDigest(window)`: if a null-target DIGEST already
  exists in the day's window it is reused (idempotent); otherwise it runs the genai job with
  platform-wide trending topics as the topic input and stores the result via
  `createDigest(targetUserId = null)`. This requires a new **internal trending-topics endpoint
  on recommendation-service** — `RecommendationClient` today only exposes
  `getUserTopicSubscriptions`.

- **Zero-subscription users are *assigned* the public digest, not given a copy.** When
  `resolveTopics(userId)` is empty, the run no longer skips; it records an assignment linking
  the user to that day's public digest. A new table stores the association:

  ```sql
  CREATE TABLE digest_assignments (
      user_id      UUID NOT NULL,
      digest_date  DATE NOT NULL,   -- Platform Day, same window as generation
      post_id      UUID NOT NULL,   -- the null-target public DIGEST post
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, digest_date)
  );
  ```

  `post_id` carries no DB foreign key (cross-row reference by UUID, consistent with the
  soft-delete model). The `(user_id, digest_date)` primary key makes assignment idempotent and
  enforces at most one public assignment per user per day. Personal and public are mutually
  exclusive for a given day: a personal digest is `target_user_id = userId`, a public one is an
  `digest_assignments` row — never both.

- **`getMyDigests` returns the union, each item tagged with a `variant`.** The user's history is
  their personal digests (`target_user_id = me`) unioned with the public posts joined via
  `digest_assignments`, merged newest-first. Every digest `PostResponse` carries
  `variant: PERSONAL | PUBLIC` (added to the OpenAPI contract; regenerate before implementing).
  `getPublicTodayDigest` (logged-out surface) is unchanged. Read permission is unchanged: public
  digests are already world-readable — the ADR-0016 404-hiding rule only applies to
  `target_user_id != null` — so an assigned user opening `/digest/:id` needs no permission change.

- **Generation status distinguishes the outcomes.** `DigestGenerationResponse` gains
  `ASSIGNED_PUBLIC` alongside `GENERATED` / `SKIPPED`, so an assignment is not mistaken for a
  personal generation (no genai job ran for that user).

- **Frontend.** `DigestListItem` / `TodayDigest` gain `variant`. Digest management labels each
  day Personal vs Public. When the user follows no topics (today's digest is `PUBLIC`, or
  subscriptions are empty), a hint states they will only receive the public digest, linking to
  topic subscription.

### Implementation conventions (code readability)

Distinguish **intent** in the orchestration layer, share the **mechanical** steps as
parameterised private helpers — do not thread a `boolean isPublic` through `generateForUser`.

- Orchestration methods read as intent: `ensurePublicDigest(window)`,
  `generatePersonalDigest(userId, window)`, `assignPublicDigest(userId, window)`.
- Mechanical helpers stay single and shared by both paths: `runGenAiJob(target, window, topics)`,
  `createDigest(...)` — not duplicated per variant.
- `generateDueDigests` reads like pseudocode: ensure the public digest, then per recipient branch
  on `hasSubscriptions` between personal generation and public assignment.
- The personal `force`/`skipIfDigestExists` dedup logic stays with the personal path; the public
  "one per day" guarantee lives in `ensurePublicDigest`'s existence check — the two are not
  merged (different window/target semantics).

## Considered Options

- **Per-user copy of the public digest** (a DIGEST row with `target_user_id = userId`,
  `digest_source = PUBLIC`, content copied): keeps `getMyDigests` and read-permission untouched
  and adds only one enum column. Rejected — it duplicates identical content across every
  zero-subscription user, and "assign" is the truer semantic than "copy". The assignment table
  keeps a single shared row.

- **Leave the skip in place, surface it only in the UI**: cheapest, but delivers no value to the
  user on days they have no subscriptions and leaves the public-digest producer unbuilt.

## Consequences

- New migration `V10__add_digest_assignments.sql`, plus repository/entity for the association.
- New internal trending-topics endpoint on recommendation-service and a `RecommendationClient`
  method to consume it (ADR-0007 internal-token gated).
- `getMyDigests` becomes a union query merging two sources by date; pagination spans both.
- OpenAPI `variant` field on digest responses → regenerate models before implementing.
- A public digest is produced every day even if no user is un-subscribed; it also backs the
  existing logged-out `getPublicTodayDigest` surface, so the cost is not wasted.
- Trending-topic quality now affects a user-facing artifact for zero-subscription users; a weak
  trending signal yields a weak public digest, the accepted floor until those users subscribe.

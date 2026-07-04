# A digest is a standalone entity, not a `DIGEST`-type post

The digest stops being a special `DIGEST`-type row in `posts` and becomes its own
`digests` table in content-service, with structured `events` (each carrying per-source
attribution) stored as JSONB, an explicit `digest_type` (`PERSONAL` | `PUBLIC`), and a
dedicated `/api/v1/digests` API. This **supersedes the storage decisions of ADR-0013,
ADR-0016 and ADR-0017** (which built the digest on top of `posts`) and **revises ADR-0018**
(whose public/private management is re-based on the new entity). The digest's read-access
semantics and the public-fallback flow are preserved; only their substrate changes.

## Context

Digests were modelled as `DIGEST`-type posts to reuse the `posts` machinery for free
(ADR-0013): topics, cover image, excerpt, soft-delete, and the existing list/read endpoints.
Three costs accumulated:

- **The `post` shape is mostly dead weight for a digest.** Author profile, comments, likes,
  cover image, excerpt, bookmark and soft-delete are meaningless for a system-generated daily
  briefing, yet every `posts` change and every post-access rule now has to reason about the
  digest special case (the `getPostById` DIGEST branch in ADR-0016, the `type=DIGEST` feed
  exclusion, the `target_user_id` nullable-only-for-digests column). The coupling runs both
  ways and blocks the digest from evolving on its own.
- **genai's structured output is discarded on the way in.** `DigestGenerateResponse` already
  emits `events[]` — each with a headline, bullets, cited topic ids, and cited sources — plus
  `eventCount` / `sourceCount` / `readTimeMinutes`. But the source citation is reduced to a
  flat `sourceUrls: list[str]` in `_build_event`, dropping each source's name, provider and
  `publishedAt`; and content-service then flattens the whole thing into one Markdown blob with
  a flat `sourceUrl[]` (ADR-0017). The design's per-event source chips (domain + "3h ago" +
  link) are therefore impossible to render, a gap ADR-0017 recorded and deferred (#188).
- **Public/private management (ADR-0018) was specced on `posts`.** Its `digest_assignments`
  join, `getMyDigests` union and per-item `variant` all assumed `PostResponse` — carrying the
  post coupling into the new feature.

Making the digest independent resolves all three at once, and is the natural point to also
land the structured-events contract that ADR-0017 deferred.

## Decision

- **New `digests` table, decoupled from `posts`.** Top-level columns: `id`, `digest_type`,
  `target_user_id`, `digest_date`, `title`, `subtitle`, `summary`, `events` (JSONB),
  `topics` (JSONB), `event_count`, `source_count`, `read_time_min`, `preview_headlines`
  (`text[]`), `model`, `generated_at`, `created_at`. No soft-delete, no generation-window
  columns, no token `usage` — those are generation-time concerns the display entity does not
  need. `model` is kept for audit only.

- **`events` is JSONB, read and written whole.** A digest is always fetched and rendered as a
  single unit; there is no "query one event" or "filter by source" access path, so a JSONB
  column is the right shape and lets the contract grow (new event/source fields) without a
  migration. Each event carries `headline`, `summaryBullets`, `topicIds`, and structured
  `sources` (see below). topic ids live inside the events; no indexed topic column is added
  yet — a `digest_topics` join table is the future move if reverse lookup is ever needed.

- **Structured per-event sources, produced by genai.** `DigestEvent.sourceUrls: list[str]`
  becomes `sources: list[DigestSource]` where `DigestSource = { url, sourceName, provider,
  publishedAt, title }`. The data already exists on `ExternalSourceItem`; `_build_event` just
  projects the full item instead of `.url`. `publishedAt` is stored as absolute time; the
  "Xh ago" relative label is computed client-side, because digests are read back historically
  and a stored relative label would go stale.

- **Explicit `digest_type` enum, with `target_user_id` retained.** `PUBLIC` (platform-wide,
  `target_user_id IS NULL`) or `PERSONAL` (`target_user_id` set). A CHECK constraint pins the
  two consistent (`PUBLIC` ⇔ null target; `PERSONAL` ⇔ non-null target). `target_user_id` is
  still needed to identify the recipient of a personal digest; `digest_type` is stored, not
  derived, and is the field the API/frontend consume — replacing ADR-0018's derived `variant`.

- **`preview_headlines` denormalized at write time.** The first three events' headlines, stored
  as a column so list/card reads (`DigestSummary`) never load the full `events` JSONB. Two
  read projections: **`DigestSummary`** (identity + counts + `digest_type` + `preview_headlines`,
  no events) for lists and the homepage card, **`DigestDetail`** (summary + full `events[]`)
  for the reader.

- **Dedicated `/api/v1/digests` API; hard cut from the post endpoints.** A new `DigestController`
  replaces the digest endpoints that hung off `PostController`. `POST /internal/v1/digests`
  (service-token) writes; `GET /api/v1/digests` (auth) returns my history as the union of
  personal digests and assigned public digests, newest-first; `GET /api/v1/digests/{id}`
  (optional auth) returns a `DigestDetail`, carrying over the ADR-0016 access rule (`PERSONAL`
  with a non-matching target → 404; `PUBLIC` → open, incl. logged-out); `GET
  /api/v1/digests/public/today` (permitAll) returns the newest public digest. No back-compat
  with the old `posts`-based endpoints — the project is pre-launch and seed-driven.

- **Public/private management re-based on the new entity (ADR-0018 preserved).**
  `digest_assignments(user_id, digest_date, digest_id)` now references a `digests` row rather
  than a post; the daily job's `ensurePublicDigest` / `generatePersonalDigest` /
  `assignPublicDigest` orchestration and the recommendation-service trending-topics endpoint
  are unchanged in intent. Because `digest_type` lives on the row, the union no longer needs to
  tag each item separately.

## Considered Options

- **Keep the digest on `posts`, only enrich the contract** (add structured `events` to the
  digest post, keep `target_user_id`). Rejected: it leaves every post rule reasoning about the
  digest special case and blocks independent evolution — the coupling was the core problem, not
  just the flat contract.
- **Relational `digest_events` / `digest_event_sources` child tables** instead of JSONB.
  Rejected: the access pattern is always whole-digest read/write, so the two child tables would
  exist only to be joined back together on every read, and each contract change would need a
  migration. JSONB matches the access pattern and keeps the entity easy to extend.
- **Amend ADR-0018 in place** rather than a new ADR. Rejected: the 0013→0016→0017→0018 chain is
  a deliberate record of the digest growing out of `posts`; superseding preserves that history,
  and 0013/0016/0017 also need superseding, which editing 0018 alone cannot express.

## Consequences

- New migrations: create `digests`, create `digest_assignments`, and drop the digest coupling
  from `posts` (`target_user_id` and existing `DIGEST` rows). The seed must reinsert at least
  one public digest, or the logged-out surface is empty (unchanged from ADR-0016).
- Both the content-service and genai OpenAPI contracts change and must be regenerated; the
  frontend types and service layer move to `/api/v1/digests` with `DigestSummary` /
  `DigestDetail`.
- The frontend reader renders a structured event stream (per-event source chips), closing the
  ADR-0017 fidelity gap (#188). Save is removed from the reader (a digest is always reachable
  via digest management); Share is shown only for `PUBLIC` digests, since a `PERSONAL` link
  404s for anyone else. Making personal digests shareable (a share-token / visibility model) is
  deliberately deferred as follow-up.
- ADR-0013, ADR-0016 and ADR-0017 are superseded for their storage decisions; ADR-0018 is
  revised. Their access and public-fallback *semantics* are preserved on the new substrate.

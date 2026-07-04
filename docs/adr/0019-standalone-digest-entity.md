# Digests are a standalone entity with structured events and public/private management

The AI Daily Digest was stored as a `DIGEST`-type **post** (ADR-0013/0016/0017): it reused the
`posts` table, flattened genai's structured output into a single Markdown blob plus a flat
`sourceUrl[]`, and carried a `target_user_id` column to mark personalisation. This ADR makes the
digest a **standalone entity**, plumbs genai's structured per-event sources end to end, and
delivers the public/private daily-management flow. It **supersedes the storage decisions of
ADR-0013, ADR-0016 and ADR-0017**, and **re-bases ADR-0018** onto the new entity.

## Context

Coupling the digest to `posts` had three problems:

1. **Most `post` fields are meaningless for a digest** (author profile, comments, likes, cover
   image, excerpt, bookmark, soft-delete). Every `posts` change risked the digest, and the digest
   could not evolve independently.
2. **genai already produced rich structured data we threw away.** `DigestGenerateResponse` carries
   `events[]` (headline, bullets, topics, cited sources) plus counts, but `_build_event` kept only
   each source's `.url`, discarding `sourceName` / `provider` / `publishedAt` — so the frontend
   could not render per-event source chips (domain + "3h ago" + link). ADR-0017 deferred this (#188).
3. **Public/private digest management was unbuilt.** ADR-0018 specced the daily run but sat on the
   `posts` model with no dedicated storage.

## Decision

### Data model — standalone `digests` table (decoupled from `posts`)

- New `digests` table with `events` stored as a **JSONB column** (the whole digest is read/written
  as one unit; no per-event querying). Top-level fields: `id`, `digest_type`, `target_user_id`,
  `digest_date`, `title`, `subtitle`, `summary`, `events` (JSONB), `topics` (JSONB), `event_count`,
  `source_count`, `read_time_min`, `preview_headlines` (`text[]`), `model`, `generated_at`,
  `created_at`.
- An explicit **`digest_type` enum (`PERSONAL` | `PUBLIC`)** alongside `target_user_id`, kept
  consistent by a CHECK constraint (`PUBLIC` ⇒ target NULL; `PERSONAL` ⇒ target set). `digest_type`
  is stored (not derived) and is the API field the frontend consumes.
- No soft-delete, no `period_start`/`period_end`, no `usage`. `model` kept for audit. topicIds live
  inside the events JSONB; no indexed topic column yet.
- `preview_headlines` is denormalized at write time (first 3 events' headlines) so list/card reads
  never load the full `events` JSONB.
- New `digest_assignments(user_id, digest_date, digest_id, created_at)` table, PK
  `(user_id, digest_date)`, referencing the `PUBLIC` digest row (no FK). Personal and public are
  mutually exclusive per user per day.

### genai contract — structured per-event sources

- `DigestEvent.sourceUrls: list[str]` → `sources: list[DigestSource]` where
  `DigestSource = { url, sourceName, provider, publishedAt, title }`. Only `_build_event` changed —
  it now projects the full `ExternalSourceItem` instead of `.url`.
- `publishedAt` is an absolute time; the "Xh ago" relative label is computed **client-side** (a
  stored relative label would go stale on historical reads).

### content-service — dedicated digest API (hard cut, no back-compat)

- New `DigestController` under `/api/v1/digests`; the digest endpoints were removed from
  `PostController` and the digest coupling (`target_user_id`, `DIGEST` type/rows) dropped from
  `posts` via migrations V10–V12.
- Two projections: **`DigestSummary`** (no events) and **`DigestDetail`** (summary + full events).
- Endpoints: `POST /internal/v1/digests` (service-token, create personal or public);
  `GET /api/v1/digests` (auth — history: union of personal + assigned public, paginated);
  `GET /api/v1/digests/{id}` (optional auth — `PERSONAL` for non-owner ⇒ 404, `PUBLIC` open);
  `GET /api/v1/digests/public/today` (permitAll — newest public digest).
- Daily job: `ensurePublicDigest(window)` (idempotent, one public digest/day from platform trending
  topics), then per recipient branch on subscriptions → `generatePersonalDigest` (status
  `GENERATED`) or `assignPublicDigest` (status `ASSIGNED_PUBLIC`).

### recommendation-service

- New internal `GET /internal/v1/topics/trending` (internal-token gated, ADR-0007) returning the
  most-subscribed topic IDs platform-wide, consumed by content-service's `RecommendationClient` to
  seed the public digest.

### Frontend

- Detail page (`/digest/:id`) renders a **structured event stream** — per event: headline, bullets,
  and per-event **source chips** (domain + client-side "Xh ago" + link). The Markdown blob and flat
  Sources list are gone.
- Bottom bar: **Save removed** (a digest always lives in digest management). **Share only for
  `PUBLIC`** (a personal-digest link 404s for anyone else; making personal digests shareable is a
  tracked follow-up).
- `DigestCard` uses real `preview_headlines` + `summary`. `PastDigests` shows a
  `Personalized`/`Community` badge and, when today's digest is `PUBLIC`, a zero-subscription hint
  linking to `/topics`.

## Consequences

- Hard cut: the old `posts`-based digest endpoints are gone. Acceptable pre-launch (seed-driven).
- The digest can now evolve independently of `posts`; per-event provenance renders in the UI.
- Personal digests remain private (404 for non-owners); sharing them needs a share-token/visibility
  mechanism — out of scope, tracked as a follow-up.

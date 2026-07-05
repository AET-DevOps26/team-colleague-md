# A digest is linked to its user via `target_user_id`, not `authorId`

> **Superseded by [ADR-0019](0019-standalone-digest-entity.md).** Digests are no longer
> `DIGEST`-type posts; the standalone `digests` table carries `digest_type` + `target_user_id`.

An AI Daily Digest is stored in content-service as a `DIGEST`-type post authored by a single
fixed system user id. To record *which* user a digest was personalised for, we add a nullable
`target_user_id` column to `posts` (`null` = a global/system digest belonging to no one; set =
personalised for that user) and read digests back through a dedicated, auth-required
`GET /api/v1/posts/digests` that filters by the caller's `userId` claim. `authorId` stays the
system id — it must not double as the recipient.

## Context

Digests already exist as a post type: `POST /internal/v1/posts/digest` (service-token,
ADR-0007) stores an externally-generated payload as a `PUBLISHED` `DIGEST` post with
`authorId = app.digest.system-author-id`, and `GET /api/v1/posts?type=DIGEST` lists them.
That `type` flag keeps digests out of the normal feed. What is missing is the per-user link:
the Past Digests page is inherently personal (each digest is built from *that user's* followed
topics), but a digest authored by the system id carries no signal of who it was for.

The team's intended generation pipeline (genai reads a user's followed topics, generates the
digest, and POSTs it to content-service) is a future issue and **not** built in this round.
What this round lands is only the content-service plumbing that makes per-user storage and
read-back possible, so the frontend Past Digests page can integrate against a real endpoint
(showing an empty state until generation exists).

## Decision

- **`posts.target_user_id` — nullable UUID, DIGEST-only in practice.** `null` = global/system
  digest (back-compatible with any existing digests, and a digest that belongs to everyone /
  no one); a set value = personalised for exactly that user. `authorId` remains the system id
  so digests keep their "system-generated" identity, stay excluded from normal feeds, and
  never surface on a real user's profile or post list.
- **New write field.** `DigestPostRequest` gains a nullable `targetUserId`; the internal
  create endpoint persists it. Generation supplies it later — the contract is ready now.
- **New read endpoint `GET /api/v1/posts/digests`.** Auth-required; implicitly filters
  `target_user_id = <userId claim>` AND `type = DIGEST`; paginated. A dedicated operation with
  per-user semantics baked in — not a `targetUserId` query param (which would invite IDOR
  checks) and not overloaded onto `GET /api/v1/posts`.

## Considered Options

- **`authorId` = the target user.** Rejected: pollutes the user's profile and post list, and
  breaks the "system-generated" semantics that keep digests out of normal feeds.
- **A `digest_recipients(post_id, user_id)` join table.** Rejected as premature: one digest is
  generated per user from that user's own topic set, so the multi-recipient flexibility buys
  nothing today and adds a fan-out read on every digest fetch.

## Consequences

- Reusing the `posts` table (rather than a separate digests table) keeps digests inside the
  existing post machinery (topics, cover image, excerpt, soft-delete) for free; the cost is a
  nullable column that is meaningful only for `DIGEST` rows.
- A global digest (`target_user_id IS NULL`) will not appear in any user's
  `GET /api/v1/posts/digests`. If a "shared digest for everyone" surface is ever needed, it
  needs its own query — deliberately out of scope here. **(Realized by ADR-0016: a
  `null`-target digest is now the "public digest", world-readable via a dedicated public
  endpoint, and `GET /api/v1/posts/{id}` gained the ownership guard for personal digests.)**
- Until the genai generation job exists, `GET /api/v1/posts/digests` returns empty for every
  user; the frontend Past Digests page renders an empty state rather than mock data.

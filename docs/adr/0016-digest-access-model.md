# Digest read access: personal digests are guarded, public digests are open

> **Storage superseded by [ADR-0019](0019-standalone-digest-entity.md).** The access rule
> (personal ⇒ 404 for non-owner, public ⇒ open) is preserved, now enforced on `DigestService` /
> `GET /api/v1/digests/{id}` against the standalone `digests` table.

A `DIGEST`-type post's `target_user_id` decides who may read it. A **personal digest**
(`target_user_id` set) is readable only by that user; **`GET /api/v1/posts/{id}` now enforces
this** — a request from anyone else (including anonymous) gets `404`. A **public digest**
(`target_user_id = null`) is world-readable without login and is discoverable by logged-out
visitors through a new public endpoint. This extends ADR-0013, which reserved the
"shared-for-everyone" surface as future work.

## Context

Under ADR-0013, `target_user_id = null` meant "a global digest belonging to no one" that
rendered nowhere, and personal digests were read back only through the auth-required list
`GET /api/v1/posts/digests`. But `GET /api/v1/posts/{id}` guarded only `DRAFT` posts — so a
**personal digest was readable by anyone who had its id**, an IDOR/authorization gap. Building
the digest reader page (`/digest/:id`) forced the question the ADR-0013 consequences left open:
what does a logged-out visitor see, and who is allowed to fetch a digest by id?

## Decision

- **`target_user_id = null` now means "public digest", not "invisible".** A null-target digest is
  a deliberate platform-wide briefing, readable by anyone.
- **`GET /api/v1/posts/{id}` gains digest authorization.** For `type = DIGEST`: if
  `target_user_id` is non-null and `!= caller`, respond `404` (hide existence, consistent with the
  DRAFT rule); if `target_user_id` is null, allow. Normal (`NORMAL`) posts are unaffected.
- **New public read endpoint for the logged-out surface.** A `permitAll` endpoint returns the
  current public digest (the newest `type = DIGEST AND target_user_id IS NULL`), so the
  logged-out `/digest` and reader pages have something to show and a discoverable id.
- **Personal digests still list only via the auth-required `GET /api/v1/posts/digests`** (ADR-0013,
  unchanged) — filtered to the caller.

## Consequences

- Fixes the pre-existing authorization gap: personal digests can no longer be read by id by a
  non-target user.
- The demo seed must include at least one public digest (`target_user_id = null`) or the
  logged-out surface is empty — this reverses the ADR-0013 seed stance ("no null-target digests").
- `404`-not-`403` for a foreign personal digest keeps the "does this digest exist" fact private,
  matching how DRAFT posts already behave.
- The digest reader itself renders the stored Markdown; the fidelity gap between the design's
  per-event source attribution and the flat stored model is recorded separately in ADR-0017.

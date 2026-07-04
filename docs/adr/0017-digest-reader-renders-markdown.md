# The digest reader renders stored Markdown; structured per-event source attribution is deferred

> **Superseded by [ADR-0019](0019-digest-standalone-entity.md).** The deferred structured
> `events[]` contract (per-event source domain/timestamp/link) is now landed: the digest stores
> structured events and the reader renders per-event source chips. The flat-Markdown model
> below is retired.

The digest reader page (`/digest/:id`) renders the digest's `content` (Markdown) with the shared
`<Markdown>` component and lists `sourceUrl[]` as a single flat "Sources" section. It does **not**
reproduce the design mock's per-event source chips (source domain + "3h ago" + a per-event link),
because the content-service digest contract cannot express them today. Closing that gap is
deferred to a future round that changes both the content contract and genai generation.

## Context

The [Digest Post design mock](../../frontend/design/pages/Verita%20Digest%20Post.html) renders a
digest as a sequence of structured "topic events" — each with a headline, a **source domain and
relative timestamp** (`openai.com · 3h ago`), bullet points, and a **per-event source link**. The
backend stores a digest (`PostResponse`) as a single Markdown `content` blob plus a **flat,
unassociated `sourceUrl[]`** (e.g. the seeded hero digest has 7 URLs across 3 events, with no
mapping from URL to event). There is no per-event domain, timestamp, or link in the model, and
genai digest *generation* is out of scope (ADR-0013). So the design's per-event attribution
simply cannot be produced from what is stored.

## Decision

- **Render `content` as Markdown, `sourceUrl[]` as a flat Sources list.** No backend change; ships
  against the existing contract and the seeded digest bodies (which already use `### headline` +
  bullets Markdown).
- **Accept the fidelity gap** rather than fake per-event links by positionally zipping the flat
  `sourceUrl[]` onto events (the counts don't line up and there are no timestamps).
- **Record the expected future backend change** (see Consequences) and track it as a GitHub issue
  ([#188](https://github.com/AET-DevOps26/team-colleague-md/issues/188)).

## Considered Options

- **Enrich the contract now** with a structured `events[]` (`headline`, `sourceDomain`,
  `sourceUrl`, `publishedAt`, `bullets[]`). Rejected for this round: it needs a migration, an
  OpenAPI change, a reseed, *and* genai must emit the structure — none of which is worth doing
  before the generation pipeline exists.
- **Positional URL→event heuristic.** Rejected: the seed has more URLs than events, so the mapping
  is wrong, and it still yields no timestamps.

## Consequences

- To reach design fidelity later, the content-service digest contract needs a structured
  `events[]` field (headline + per-event source URL/domain + published-at + bullets), and genai
  generation must emit it. Until then the reader is a faithful render of the flat model, not of the
  mock.
- Deleting the front-end demo mode in the same change means the reader is wired real-mode only; its
  data always comes from a real (or seeded) digest post, never a front-end mock.

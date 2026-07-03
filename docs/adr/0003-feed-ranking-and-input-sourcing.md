# Feed ranking and ranking-input sourcing

## Status

accepted

## Context & Decision

recommendation-service owns the Trending and Personal feeds but owns **no post data** — engagement counts (likes, comments, views) and post metadata live in content-service. The feeds were stubbed (empty `postIds`). issue #159 required real ranking and explicitly asked us to record where ranking inputs come from.

We decided:

1. **Ranking lives in recommendation-service; inputs are pulled from content-service.** Candidate posts (with their engagement counts) come from content's public `GET /api/v1/posts` (reverse-chronological, optional `topic`), capped at a configurable candidate pool (default 500). recommendation ranks in-memory.
2. **Engagement + recency score**, tunable via config:
   `score = (likeCount + 2·commentCount + 0.15·viewCount + 1) / (ageHours + 2)^1.5`,
   ordered by `score` desc, tie-broken by `postId` asc (stable, required for the cursor).
3. **Trending is global and cached; Personal is per-user and uncached.** Trending caches the **ranked list per `topic`** (Caffeine, ~60s TTL) and slices pages from that snapshot via an opaque base64 `{score, postId}` cursor. Personal reuses the same score over the user's subscribed-topic candidates, applies **seen-filtering** (drop posts the user has an Interaction against), uniform subscription weight, falls back to Trending on cold-start, and is computed per request.
4. **Feeds return `postIds` only.** `isLikedByMe` is **not** recommendation's responsibility — `FeedPage` carries no such field; the client fetches enriched cards from content's `/posts/cards`, which populates `isLikedByMe` from the user's token.

## Considered Options

- **content-service owns post-trending** (it already has engagement data and topic-level trending): rejected — #159 scopes ranking to recommendation-service, and keeping ranking logic in one place is cleaner.
- **Per-`{topic,cursor,size}` cache** (the original keying): rejected — every cursor became its own entry and pages could be built from different snapshots, breaking stable infinite scroll.
- **Interaction-driven topic affinity in Personal v1**: deferred (P2) — it requires resolving each interacted post back to its topics cross-service.

## Consequences

- Posts older than the candidate pool fall off Trending naturally.
- A Trending snapshot expiring mid-scroll can skip/repeat a couple of boundary posts on cursor continuation — standard and acceptable for engagement-ranked infinite scroll.

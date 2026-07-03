# Comment integration on Post detail

Comments — deferred on Post detail under ADR-0012 alongside the AI summary — are now wired
end-to-end against content-service. The Post detail page renders the real comment tree, and the
floating composer, the comment counter, and per-comment like/reply all hit live endpoints. This
amends ADR-0012: comments are no longer hidden; the AI summary stays deferred.

The contract was already almost complete (`GET /posts/{id}/comments`, `POST /posts/{id}/comments`,
`DELETE /comments/{id}`). The one real gap was comment-like, which was write-only: it always cast
an UPVOTE and could not be undone. We make `POST /comments/{id}/like` a **toggle** that mirrors
post-like — it takes a `CommentLikeRequest` body (`{ type: LIKE | NONE }`) and returns the real
`likeCount` / `isLikedByMe`, removing the vote when `NONE` is sent (via the existing `applyVote`
path). We also tighten `CommentRequest.text` from `maxLength` 2000 to 500 to match the composer's
500-character limit on both the top-level composer and the reply box.

## Decision

- **Like is a toggle, not a one-way write.** `POST /comments/{id}/like` accepts
  `{ type: LIKE | NONE }`; `LIKE` casts an UPVOTE, `NONE` removes the caller's vote. The response
  carries the recomputed `likeCount` and the caller's `isLikedByMe`, so the client never has to
  guess. `DISLIKE` is intentionally absent from `CommentLikeRequest` — comments have no dislike.
- **Two-level threading only.** Replies attach to top-level comments; the "Reply" affordance is
  shown on top-level comments only, matching the existing nested-render shape (`replies[]`) and the
  backend's flat parent/child grouping. No deeper nesting.
- **Client-side sort + progressive reveal.** Sorting (Top / Newest / Oldest) and the
  "Load N more" reveal of top-level comments stay entirely client-side over the already-fetched
  tree. The hierarchical `GET` returns the whole tree in one call, so paging it server-side buys
  nothing at current scale.
- **500-character limit.** `CommentRequest.text` maxLength drops 2000 → 500 so the API rejects what
  the UI already caps, keeping the contract and the composer in agreement.
- **No delete UI.** Deletion exists in the API but is not surfaced on Post detail — design-faithful
  to the current comment design, which has no delete control.

## Considered options

- **Keep comment-like one-way.** Rejected: a like you cannot take back is a UX regression against
  post-like, which already toggles; the fix is small and the two now behave identically.
- **Server-side comment paging / sort.** Rejected as premature: the tree arrives whole in one
  request, so client-side reveal and sort avoid extra round-trips with no scale cost today.
- **Reuse `LikeRequest` for comments.** Rejected: it carries `DISLIKE`, which is meaningless for a
  comment; a dedicated `CommentLikeRequest` (`LIKE | NONE`) keeps the contract honest.

## Consequences

- `InteractionController.likeComment` / `InteractionService.likeComment` take the request type and
  route through `applyVote` (UPVOTE for `LIKE`, removal for `NONE`); the response reflects the post-
  toggle state rather than always `isLikedByMe = true`.
- The frontend owns the comment tree + count in a `useComments(postId)` hook with optimistic
  add / like / reply and revert-on-error, consumed by both the `BottomBar` composer and
  `CommentSection`.
- The `showComments={false}` guard and the "intentionally hidden (ADR-0012)" note are removed from
  Post detail; the AI summary remains deferred under ADR-0012.

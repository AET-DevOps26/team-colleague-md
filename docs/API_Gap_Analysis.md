# API Gap Analysis

This document tracks gaps between the refined [Problem Statement](Problem_Statement.md) and the per-service OpenAPI contracts (`backend/<service>/api/openapi.yaml`).

- **P0/P1 (To implement)**: required for delivery.
- **P2 (Optional)**: implement only if time permits.

Each entry notes what is missing and the corresponding `Epic X / Px`.

---

## user-service

### P0 / P1 — To implement

| Gap | Epic / Priority | Notes |
|---|---|---|
| "Social links" is singular | Epic 1 / P1 | Story says "bio, expertise areas, **social links**" (plural); `UpdateUserRequest`/`User` only have a single `website` field. Either add multiple links or accept reduced scope. |

### P2 — Optional

| Gap | Epic / Priority | Notes |
|---|---|---|
| Verification application + admin review flow | Epic 1 / P2 | No endpoints to submit a verification request (with supporting info) or for admins to review/approve/reject. Today a user only becomes `VERIFIED` via manual `updateUserRole`. |
| `followerCount` / `followingCount` unfillable | Epic 4 / P2 | Follow itself is owned by recommendation-service, but it has no list/count endpoints to source these `User` fields. See recommendation-service P2. |
| Digest/notification delivery channel preference | Epic 3 / P2 | "receive digests and alerts via **email or platform inbox**" — no channel field in `UserPreferences`. Owner (user- vs recommendation-service) still open. |
| Per-activity notification preferences | Epic 3 / P2 | "configure notification preferences for different activities (new posts, comments, replies)" — no fields here or in recommendation-service. Owner still open. |

> **Resolved:** topic subscriptions (Epic 5 P1) and follow-users (Epic 4 P2) are owned by **recommendation-service** (`subscribeToTopic`, `subscribeToUser`), not user-service.

### Already covered ✓
Register / login / logout / refresh; admin role & ban management; guest browsing (public endpoints); profile management (bio, expertise areas, website, organisation); `VERIFIED` role for badge display; `digestFrequency` preference; post/follower/like counts on `User`.

---

## content-service

### P0 / P1 — To implement

| Gap | Epic / Priority | Notes |
|---|---|---|
| Post-author comment moderation | Epic 4 / P1 | "As a post author, delete comments on my posts." `deleteComment` is documented as owner-only — can't delete others' comments on your own post. Needs authorization scope extension (app-layer; schema already links comments → post author). |
| Topic stats + management (issue #94) | Epic 5 / P1 | Schema now has the full topic model (`topic_categories`, expanded `topics` with cached `posts_this_week`/`posts_prev_week`/`activity_score`/`is_hot`/`follower_count`, `topic_weekly_stats` + nightly cron). **OpenAPI gaps remain**: (1) extend `TopicResponse` with `displayName`/`postsThisWeek`/`postsPrevWeek`/`activityScore`/`isHot`/`followerCount`; (2) `GET /api/v1/topics` (grouped by category, with stats); (3) `GET /api/v1/topics/search?q=` (autocomplete); (4) `POST /api/v1/topics/follower-counts` (delta sync, **called by recommendation-service** on subscribe/unsubscribe). |
| AI summary on post | Epic 3 / P1 | **Decided**: stored on the post (`posts.summary`), populated by genai-service. **OpenAPI gap remains**: `PostResponse` needs a `summary` field. |
| AI Digest as a post `type` | Epic 3 / P1 | The AI Digest is a genai-generated special post (moved here from recommendation-service). Schema adds `posts.type` (`NORMAL`/`DIGEST`). **OpenAPI gap remains**: expose `type` and a way to list digest posts (e.g. `type` filter on `getAllPosts`). |
| Image / cover file upload | Epic 2 / P1 | Promoted from P2. Schema stores URLs only (`cover_image_url` + inline Markdown URLs), files in MinIO/object storage. **OpenAPI gap remains**: a file-upload endpoint that stores to object storage and returns the URL. |

### P2 — Optional

| Gap | Epic / Priority | Notes |
|---|---|---|
| Comment sorting | Epic 4 / P2 | "sort by newest / most liked"; `getCommentsByPost` has no sort param. |
| Sentiment score on post | Epic 3 / P2 | No sentiment field on `PostResponse`. |
| Report / flag posts & comments | Epic 6 / P2 | No report endpoint (despite the spec description claiming "content moderation"). |
| Moderation dashboard / flagged list + admin delete authority | Epic 6 / P2 | No admin moderation endpoints; `deletePost`/`deleteComment` are owner-scoped. |
| Transparent moderation labels | Epic 6 / P2 | No moderation-status field (e.g. `[deleted by moderator]`). |

### Already covered ✓
Create post (Markdown body, topics, `sourceUrl[]` source section, inline hyperlinks via Markdown); `DRAFT`/`PUBLISHED` status with explicit draft + publish/unpublish via `updatePost`; `getMyDrafts`; edit/delete own posts; published-post management via `getUserPosts(self)`; comment + reply (`parentId`); like/dislike posts; bookmark/unbookmark; like comments; topic filtering; keyword search.

---

## recommendation-service

### P0 / P1 — To implement

| Gap | Epic / Priority | Notes |
|---|---|---|
| Topic follower-count sync (issue #94) | Epic 5 / P1 | On `subscribeToTopic` / `unsubscribeFromTopic`, this service must call content-service `POST /api/v1/topics/follower-counts` with a delta so `topics.follower_count` stays current. App-layer call; no schema change here. |

Otherwise the personal/trending feeds, topic subscriptions, and interaction tracking
cover the P0/P1 stories owned by this service.

> **Resolved — AI Digest (Epic 3 / P1) is owned by content-service, not here.**
> The AI Digest is a **genai-generated special post** stored in content-service
> (posts need a `type`/kind field: `NORMAL` / `DIGEST`). Retrieval is just a normal
> post fetch filtered by type; this service only emits the (P2) `DAILY_DIGEST`
> notification pointing at that post. No digest endpoint/schema is needed here.

### P2 — Optional

| Gap | Epic / Priority | Notes |
|---|---|---|
| List followed users / followers + is-following | Epic 4 / P2 | `subscribeToUser`/`unsubscribeFromUser` exist, but no list-following / list-followers / is-following endpoints. Needed to populate `followerCount`/`followingCount` on the user-service `User`. |
| Followed users' posts in personal feed | Epic 4 / P2 | `getPersonalFeed` is described as topic-subscriptions + behavior only; story wants followed users' posts surfaced too. |
| Per-activity notification preferences | Epic 3 / P2 | No settings endpoint here (and none in user-service `UserPreferences`). |
| `@mention` notification type | Epic 4 / P2 | Notification `type` enum has no `MENTION`. |
| Digest/alert delivery channel (email vs inbox) | Epic 3 / P2 | No channel preference anywhere (see also user-service). |

### Already covered ✓
Trending + personal feeds with topic filter and cursor pagination; topic subscriptions (`subscribeToTopic` / `getSubscribedTopics`); follow/unfollow users; notifications (`NEW_POST_IN_SUBSCRIBED_TOPIC`, `COMMENT`, `LIKE`, `DAILY_DIGEST`, `VERIFICATION_APPROVED`) with read/read-all; behavioral interaction tracking.

---

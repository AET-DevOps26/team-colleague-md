# Digest / Topics / Preferences / Search Integration — Implementation Spec

> Handoff doc for a fresh session. Branch: `feature/digest-integration` (off `fix/internal-service-token-compose-deploy`, which carries ADRs 0001–0013 + CONTEXT.md; none of these are on `dev` yet).
> Decisions were locked in a grilling session. Authority: **ADR-0013** (`docs/adr/0013-per-user-digest-association.md`) and the **Digest** entry in `CONTEXT.md`.
> Architecture rules: OpenAPI-first (edit `api/openapi.yaml`, then `./gradlew openApiGenerate`, never edit `build/generated/`). ADR-0004/0006/0007/0008 apply. No co-author trailer in commits.

## Scope at a glance

| Workstream | Backend | Frontend |
|---|---|---|
| 1. Digest per-user plumbing | content-service: `target_user_id` column + write field + new read endpoint | `PastDigests` → real endpoint, empty state |
| 2. Manage Topics | none (recommendation subscriptions already built) | follow key `name`→`id`; wire to real services |
| 3. User Preferences | none (`/users/me/preferences` already built) | wire 2 privacy toggles; hide Email frequency |
| 4. Search | none | overlay (localStorage + trending) + results page |

**Explicitly OUT of scope this round** (future issues, do NOT build): genai digest *generation* logic, the daily scheduled batch job, and a recommendation "read a user's followed topics by service-token" endpoint. This round only makes per-user storage/read-back possible; the read endpoint returns empty until generation exists.

---

## Workstream 1 — Digest per-user plumbing (content-service)

**Decision (ADR-0013):** a digest is a `DIGEST`-type post authored by the system id; the user it was personalised for is carried by a nullable `target_user_id` (`null` = global digest). `authorId` stays the system id.

### 1a. DB migration
New file `backend/content-service/src/main/resources/db/migration/V9__add_digest_target_user.sql` (V8 is the latest):
```sql
-- Per-user digest association (ADR-0013): which user a DIGEST post was personalised for.
-- NULL = global/system digest belonging to no one.
ALTER TABLE posts ADD COLUMN target_user_id UUID;
CREATE INDEX idx_posts_target_user ON posts (target_user_id) WHERE deleted = false;
```

### 1b. Entity
`entity/PostEntity.java` — add field next to `type`:
```java
@Column(name = "target_user_id")
private UUID targetUserId;
```

### 1c. OpenAPI (`backend/content-service/api/openapi.yaml`)
- `DigestPostRequest` schema: add `targetUserId: { type: string, format: uuid, nullable: true }`.
- New path `GET /api/v1/posts/digests`:
  - `operationId: getMyDigests`, tags `[Posts]`, **`security: [{ bearerAuth: [] }]`** (auth-required, fails closed).
  - params: `page` (int, default 0), `size` (int, default 10).
  - 200 → `PostPage` (reuse existing schema); 401 → Unauthorized.
  - Description: returns the caller's own digests — `target_user_id = <userId claim>` AND `type = DIGEST`, newest first.
- Run `./gradlew openApiGenerate` after editing.

### 1d. Service + controller
- `service/PostService.java`:
  - `createDigest(...)` — set `post.setTargetUserId(request.getTargetUserId()...)` (Optional-unwrap like the other nullable fields).
  - New `getMyDigests(UUID userId, Pageable)` → `postRepository.findByTargetUserIdAndTypeAndDeletedFalse(userId, PostType.DIGEST, pageable)` mapped to `PostPage`. Add the repository method in `PostRepository`.
- `controller/PostController.java` — implement `getMyDigests` (generated `@Override`, no Javadoc per ADR-0008). Read identity via `securityUtils.getCurrentUserId()` (protected; never `/users/me`).
- `SecurityConfig` — `GET /api/v1/posts/digests` must require auth (it's under `/api/v1/posts/**` which is currently `permitAll` for reads; add an explicit authenticated matcher BEFORE the public posts rule).

### 1e. Tests
- `PostServiceTest` — digest stored with `targetUserId`; `getMyDigests` returns only the caller's DIGEST posts, excludes other users' and NORMAL posts and global (null) digests.
- Controller/integration test — `GET /api/v1/posts/digests` 401 anonymous, 200 + filtered for authed user.

### 1f. Frontend (PastDigests)
- `frontend/src/services/content.service.ts` — replace mock `getDigestList()` / `getTodayDigest()` with a real call: `api.get<PostPage>('/api/v1/posts/digests', { params })` (`api` baseURL `/content`). Map items to the existing `DigestListItem` shape; "today's digest" = newest item dated today (derive client-side).
- `frontend/src/pages/Digest/PastDigests.tsx` — consume the async data; add an **empty state** ("No digests yet — check back once your daily briefing is generated") for the common empty case. Keep the existing grouping/animation.
- Note: until generation exists this list is empty for everyone — that is expected, not a bug.

---

## Workstream 2 — Manage Topics (frontend-only)

Recommendation subscriptions are fully built server-side; the follow flow already fires the follower-count delta to content. **No backend work.**

- Endpoints: catalog `GET /api/v1/posts`… no — catalog is content **`GET /api/v1/topics`** (`getTopicCategories`). Followed set: recommendation **`GET /api/v1/subscriptions/topics`** → `Topic{ id, name }[]`. Toggle: **`POST` / `DELETE /api/v1/subscriptions/topics/{topicId}`** (UUID). Use `recommendationApi` (baseURL `/recommendation`).
- **Migrate the page's follow key from `name` → `id`.** Catalog `TopicItem` has both `id` and `name`; recommendation speaks only UUID. Update:
  - `frontend/src/pages/Digest/index.tsx` — `followedTopics` becomes `Set<topicId>`; initialise by fetching `/subscriptions/topics` (only when logged in; page already gates on `isLoggedIn`). `handleToggle` calls real `POST`/`DELETE`.
  - `frontend/src/pages/Digest/ManageTopics.tsx` and `topicSort.ts` — switch every `followedTopics.has(t.name)` / `.map(t => t.name)` to `t.id`.
- **Optimistic toggle + rollback on error** (preserve animations + "Following N" pill): flip local state immediately, fire the request, revert on failure (toast the error).
- Replace mock `getFollowedTopics` / `toggleTopicFollow` / `saveTopicPreferences` usage. `getTopicCategories` can stay if it already hits `/api/v1/topics`; otherwise wire it to content.
- Follow-state is contained entirely in `pages/Digest/` — no Home-feed leakage, so the migration is local.

---

## Workstream 3 — User Preferences (frontend-only)

`GET` / `PUT /api/v1/users/me/preferences` already exist → `UserPreferences { digestFrequency: DAILY|WEEKLY|OFF (required), showBookmarks, showLikes }`. Use `userApi` (baseURL `/user`). **No backend work.**

- `frontend/src/components/modals/SettingsModal/index.tsx`:
  - On open, `GET /users/me/preferences`; seed `showBookmarks` / `showLikes` from it.
  - **Hide the "Email frequency" control** (the `Daily/Weekly/Off` `freqControl` block, lines ~83–97). Remove from the rendered UI; keep no dead state for it.
  - On save, `PUT /users/me/preferences` with `{ digestFrequency: <the value read on open, unchanged>, showBookmarks, showLikes }` — **GET-then-passthrough** so the required field round-trips untouched.
- Optionally add a thin `getPreferences` / `updatePreferences` to `user.service.ts` (currently has none).

---

## Workstream 4 — Search (frontend-only, zero new backend)

Backend already has content `GET /api/v1/posts/search?q=&page=&size=` (→ `PostPage`) and `GET /api/v1/topics/trending` (→ `TopicResponse[]`). Reference design: `frontend/design/animations/Verita Transition.html` (§2.6 search overlay) + PRD §3.6.

### 4a. Search overlay (Home→Results intermediate)
Full-viewport overlay opened from the Topbar search bar. **Static chips, NOT live type-ahead** (no per-keystroke call).
- **Recent searches** → `localStorage` (store last N submitted queries client-side; no backend). Chip click submits that query.
- **Trending** → content `GET /api/v1/topics/trending`; render topic names as chips. (Minor semantic give: chips are topic names, not query phrases — accepted.)
- Submit (Enter or chip) → navigate `/search?q=…` (Topbar already does this in `components/layout/Topbar/index.tsx`).

### 4b. Results page (`/search?q=`)
Replace the stub `frontend/src/pages/Search/index.tsx`:
- Read `q` from the URL; call content `GET /api/v1/posts/search?q=` via `api`.
- Map `PostPage` items → `Post` and render with the existing **FeedGrid / PostCard** (masonry), matching Home. Add `toCardPost`-style mapping (confirm `PostPage.content` item shape — likely `PostCard`/`PostResponse`; reuse the existing mapper).
- Result count "N results for '[query]'", empty state ("No results for '…'" + clear link) per PRD §3.6. Pagination/load-more as Home.

---

## Suggested commit/PR sequencing
- Land per workstream (4 commits/PRs) or one feature PR — but **content-service backend (WS1) should be reviewable on its own** since it changes the API contract + schema.
- PR targets `dev` (per CLAUDE.md). Because the ADRs/CONTEXT.md ride the `fix` branch, expect this feature to merge to `dev` near or after that branch.

## Verification (before PR)
- Backend: `cd backend/content-service && ./gradlew build` (runs `openApiGenerate` + tests). New tests green.
- Frontend: `cd frontend && npm run build && npm run lint`.
- E2E: `docker compose up --build`, seed, then log in and exercise — Manage Topics follow persists across reload (hits recommendation), Settings toggles persist (hits user-service), Search returns posts, Digest page shows empty state. `npm test` (Playwright) for the touched pages.

## Key file map
- content-service: `api/openapi.yaml`, `entity/PostEntity.java`, `service/PostService.java`, `repository/PostRepository.java`, `controller/PostController.java`, `config/SecurityConfig.java`, `db/migration/V9__*.sql`
- frontend services: `services/api.ts` (`/content`), `services/recommendationApi.ts` (`/recommendation`), `services/userApi.ts` (`/user`), `services/content.service.ts` (mapper `toCardPost`, `toPostDetail`), `services/user.service.ts`
- frontend UI: `pages/Digest/{index,PastDigests,ManageTopics,topicSort}.tsx`, `components/modals/SettingsModal/index.tsx`, `pages/Search/index.tsx`, `components/layout/Topbar/index.tsx`, `components/feed/{FeedGrid,PostCard}/`

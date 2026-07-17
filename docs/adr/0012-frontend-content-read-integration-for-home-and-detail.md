# Home feed and post detail read the real backend; demo flag now also gates content reads

The home feed and the post-detail body are integrated against the real backend, extending
the `VITE_DEMO_MODE` boundary from ADR-0011 (which covered user/profile reads) to the
post-derived content reads. Normal start = real backend; the flag demotes content reads to
the mock display layer. Scope is deliberately the minimum that satisfies the demo checklist,
not the full content surface.

## Context

After the `dev` merge the seed script became data-rich: 8 login-capable users
(`Password123!`), ~8–10 posts with comments/bookmarks/votes/topics, plus
recommendation-service topic subscriptions, user subscriptions, interactions, and
notifications for the seeded users. This removes ADR-0011's blocking premise ("content-service
has no seeded posts"), so the home feed and post detail can now read real data instead of
`BASE_POSTS` in `content.service.ts`.

A mentor demo is due the next day (hard deadline). The dominant risk the author named is a
**broken integration / blank home page**, not "mentor notices it's mock." The mentor
evaluates both product polish and frontend↔backend integration progress, and will log in to
try the checklist himself.

The architecture has two feed paths: the simple content-service `GET /api/v1/posts`
(getAllPosts; explicitly "not the homepage feed"), and the real recommendation path —
`GET /api/v1/feed/personal` (auth) or `/feed/trending` (public) returning a
`FeedPage { postIds, nextCursor }`, hydrated via content-service `GET /api/v1/posts/cards?ids=`.
The `/recommendation` proxy route already exists in both `vite.config.ts` and `nginx.conf`.

## Decision

- **Home feed = real recommendation path (two-hop).** Logged-in → `/feed/personal`;
  logged-out → `/feed/trending`; a selected topic → `/feed/trending?topic=<name>` regardless
  of auth (personal feed has no topic param). Then hydrate IDs via `/posts/cards?ids=`,
  preserving order. A new `recommendationApi` axios client (baseURL `/recommendation`) mirrors
  `api.ts`; cursor-based pagination replaces the `'page2'` mock hack.
- **Demo account = seeded `alexchen`** (`alex@example.com` / `Password123!`, ADMIN). It carries
  seeded subscriptions + interactions, so its personal feed is non-empty — the primary
  defense against a blank home page. The mentor logs in as this user.
- **Demo flag extends to content reads (ADR-0011).** Flagless start = real backend (the mode
  the demo runs in). `VITE_DEMO_MODE=true` = content reads return the mock display layer while
  auth/profile stay real — a static, startup-time break-glass, **never** a runtime
  "empty → fall back to mock".
- **Post detail = real body only, reused everywhere.** `getPost` → `GET /api/v1/posts/{id}`
  renders the real body; the hardcoded `AISummaryPanel` and the `CommentSection` are hidden
  rather than shown over mock data. Because every entry point (publish→detail, profile→detail,
  home card→detail) navigates to `/post/:id`, this single change makes them all show real
  content.
- **Interactions.** Home card heart → real `POST /api/v1/posts/{id}/like`; avatars use
  `AuthorSummary.avatarUrl`; avatar click → profile (already real). Anonymous like/bookmark →
  open the auth modal instead of 401-ing.
- **Out of scope for the demo:** comment reading/posting on detail, share, trending topic
  ranking nuances, and the recommendation feed's empty-for-fresh-user behavior (avoided by
  demoing as a seeded user).

## Consequences

- One change (`getPost`) lights up real content across three entry points — high leverage.
- The home feed depends on **both** recommendation-service and content-service being up and
  seeded; mitigated by demoing as a seeded user and by the `VITE_DEMO_MODE` break-glass.
- A fresh sign-up still risks an empty personal feed (no subscriptions/interactions); the demo
  sidesteps this by logging in as `alexchen`, but it remains a known gap for real new users.
- Showing a real post body while hiding the AI summary and comments is an honest partial view,
  preferred over a real body topped with mock summary/comments.
- Verification before the demo is mandatory: `docker compose up` → run seed → log in as
  `alexchen` → walk the five home items + login. See `docs/review/Check_List.md`.

# Frontend user data is fully integrated; mock survives only as a demo-flag display layer

All user-related frontend reads/writes (auth, profile, posts, bookmarks, likes, drafts)
call the real backend — the endpoints already exist. Mock data is **not** deleted: it is
demoted to a display layer activated only by a single `VITE_DEMO_MODE` flag, which fills
in the post-derived reads that the real backend can serve but has no seeded data for.

## Context

The frontend grew up fully mocked (`auth.service.ts`, `user.service.ts`). Auth + token
management (in-memory access token, httpOnly refresh cookie, silent-refresh interceptors)
were since integrated, but `getProfile`/`updateProfile` stayed on `MOCK_PROFILES`+localStorage
and `getUserPosts`/`bookmarks`/`liked`/`drafts` stayed on fixtures — even though
user-service (`/users/by-username/{username}`, `PATCH /users/me`) and content-service
(`/users/{id}/posts|bookmarks|likes`, `/me/drafts`) expose all of them.

Two mock data problems forced a decision rather than a blind delete:
1. The seed users carry written-in stats (`postCount: 47`, …) but content-service has
   **no seeded posts** — so a purely-real profile shows "47 posts" over an empty list.
2. Demo identities `alice_verita`/`bob_verita` don't exist in the seed, and the old mock
   `alexchen` (USER) contradicts the seed (ADMIN). Mock and real were *conflicting*, not
   complementary.

The real axis is therefore not "integrated vs not" (everything is integratable) but
"backend has data vs backend is data-sparse."

## Decision

- **Normal start = pure real backend.** Every user read/write hits the real endpoint.
  Post-derived tabs honestly render empty until content-service is seeded.
- **`VITE_DEMO_MODE` start = real backend + mock display layer.** Auth and profile stay
  real (seed users, e.g. `alexchen` / `Password123!`); only the four data-sparse reads
  (`getUserPosts`, `getUserBookmarks`, `getUserLikedPosts`, `getUserDrafts`) are served
  from mock so the home feed and profile look populated.
- Classification is **static per service method**, decided at the call site via a central
  `isDemoMode()` helper — never a runtime "real returned empty → fall back to mock", which
  would silently pollute real-mode testing and make the flag meaningless.
- **Mock cleanup:** delete `MOCK_PROFILES`, `MOCK_CREDENTIALS`, the `VITE_DEMO_USER`
  auto-login, and `alice/bob`. Keep only the posts/bookmarks/liked/drafts fixtures,
  re-keyed to seed usernames, consolidated into one mock module shared by runtime and tests.
- **Testing:** unit/component tests inject the mock module at the service boundary (no
  backend); Playwright E2E runs the demo-flag build; real integration is covered by each
  backend's own CI.

## Considered Options

- *Delete all mock, real-only* — rejected: no way to demo a populated UI while
  content-service has no seeded posts.
- *Per-identity demo (alice/bob always mock, coexisting with real users)* — rejected:
  interleaves two data sets, and doesn't solve the empty-posts display gap for real users.
- *Runtime empty-fallback to mock* — rejected: indistinguishable from "really empty",
  pollutes real-mode tests.

## Consequences

- Production builds ship no mock auth path; the demo layer is reachable only via the flag.
- The seed `postCount` vs zero-posts inconsistency remains in **real** mode. Out of scope
  here; fix later by seeding content-service posts or zeroing the seed stats.

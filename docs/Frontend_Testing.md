# Frontend Testing

Verita's frontend test suite has three layers:

| Layer | Tool | Command | When to run |
|---|---|---|---|
| **Unit / Component** | Vitest + React Testing Library | `npm run test:unit` | Every commit — fast, no browser |
| **E2E** | Playwright | `npm test` | Before PR — user flows in real browser |
| **API Contract** | Playwright + `page.route()` | `npm test` | Before PR — OpenAPI shape compliance |

---

## Test directory layout

```
frontend/tests/
├── unit/                     ← Vitest: pure functions + component logic
│   ├── setup.ts
│   ├── utils/
│   │   ├── timeAgo.test.ts
│   │   └── getInitials.test.ts
│   ├── services/
│   │   └── tokenStore.test.ts
│   ├── components/
│   │   └── Toast.test.tsx
│   └── pages/Digest/
│       ├── topicSort.test.ts
│       └── ManageTopics.test.tsx
├── e2e/                      ← Playwright: critical user flows
│   ├── auth.spec.ts
│   ├── digest.spec.ts
│   ├── home.spec.ts
│   ├── profile.spec.ts
│   └── settings.spec.ts
└── api/                      ← Playwright + page.route(): API contract
    └── profile.api.spec.ts
```

---

## Running tests

```bash
cd frontend

# Unit + component (fast, ~5s)
npm run test:unit
npm run test:unit:watch   # watch mode
npm run test:unit:ui      # Vitest browser UI

# E2E + API Contract (slow, requires browser)
npm test                  # requires: npx playwright install (first time)
```

E2E tests do **not** require a real backend — they use the in-memory mock service and `page.route()` to mock auth endpoints.

---

## Unit / Component tests

### `tests/unit/utils/timeAgo.test.ts`

Tests `src/utils/timeAgo.ts` — relative time string formatter.

| Test | Input | Expected output |
|---|---|---|
| Minutes for times under an hour | 5 min ago | `"5m ago"` |
| 0m ago for very recent times | 30 sec ago | `"0m ago"` |
| Hours for times between 1 and 24 hours | 3 hr ago | `"3h ago"` |
| Rounds hours correctly | 23.5 hr ago | `"23h ago"` |
| Days for times over 24 hours | 2 days ago | `"2d ago"` |
| Days for old dates | 10 days ago | `"10d ago"` |

### `tests/unit/utils/getInitials.test.ts`

Tests `src/utils/getInitials.ts` — generates avatar initials from display name.

| Test | Input | Expected |
|---|---|---|
| Two initials from two-word name | `"Alice Morgan"` | `"AM"` |
| One initial for single word | `"Alice"` | `"A"` |
| Handles extra whitespace | `"  Alice  Morgan  "` | `"AM"` |
| Empty string input | `""` | `""` |
| Limits to two characters for long names | `"Alice Bob Chen"` | `"AB"` |
| Uppercases lowercase names | `"alice morgan"` | `"AM"` |

### `tests/unit/services/tokenStore.test.ts`

Tests `src/services/tokenStore.ts` — access token + user session storage.

| Group | Test | What it verifies |
|---|---|---|
| Access token | starts null | `getAccessToken()` returns `null` before any set |
| Access token | stores and retrieves | `setAccessToken("t")` then `getAccessToken()` returns `"t"` |
| Access token | NOT in localStorage | `localStorage.getItem(...)` is null after `setAccessToken` |
| Access token | `clearSession` resets | token is null after `clearSession()` |
| User (localStorage) | starts null when empty | `getUser()` returns `null` with empty localStorage |
| User (localStorage) | stores and retrieves | `setUser(u)` → `getUser()` returns same object |
| User (localStorage) | `clearSession` removes | `getUser()` returns null after `clearSession()` |

### `tests/unit/pages/Digest/topicSort.test.ts`

Tests `src/pages/Digest/topicSort.ts` — reorders topic list when follow/unfollow is toggled.

| Test | Scenario | Expected |
|---|---|---|
| Follow moves tag to end of followed group | tag previously unfollowed | tag appears after other followed topics |
| Unfollow moves tag to start of unfollowed group | tag previously followed | tag appears before other unfollowed topics |
| Preserves followed group order on follow | two already-followed + new follow | order of existing followed preserved |
| Preserves unfollowed group order on unfollow | two unfollowed + one being unfollowed | order of remaining unfollowed preserved |
| Handles empty followed set | no other followed topics | tag is sole followed item at front |
| Handles tag as only item | single-item list | returns single-item list with just the tag |

### `tests/unit/components/Toast.test.tsx`

Tests `src/components/ui/Toast/index.tsx` — dismissible status toast.

| ID | Test | Method |
|---|---|---|
| T-1 | Renders message text | `getByText` |
| T-2 | Shows checkmark SVG when `neutral=false` | SVG path `d` attribute assertion |
| T-3 | Shows minus SVG when `neutral=true` | SVG circle `cx` attribute assertion |
| T-4 | Calls `onHide` after 2500ms | `vi.useFakeTimers()` + `act()` |
| T-5 | Has `role="status"` for accessibility | `getByRole('status')` |
| T-6 | Does not call `onHide` when `show=false` | fake timers advance, mock not called |

### `tests/unit/pages/Digest/ManageTopics.test.tsx`

Tests `src/pages/Digest/ManageTopics.tsx` — topic grid with follow/search.
Uses `vi.mock('../../../../src/services/content.service')` with three topics: alpha, beta, gamma (beta pre-followed).

| ID | Test | Method |
|---|---|---|
| MT-1 | Followed topics render before unfollowed | DOM order assertion |
| MT-2 | Follow-pill shows correct count | `getByText(/Following \d+/)` |
| MT-3 | Clicking Follow fires `onToggle` with correct tag | mock fn + `userEvent.click` |
| MT-4 | Clicking Following (unfollow) fires `onToggle` | mock fn + `userEvent.click` |
| MT-5 | Search filters topics by displayName | type in input, check visible cards |
| MT-6 | Search matches by slug (name field) | "agents" slug finds matching topic |
| MT-7 | Clearing search restores all topics | clear input, all categories visible |

---

## E2E tests

All E2E tests mock `**/api/v1/auth/refresh` so they work without a real backend.

### `tests/e2e/home.spec.ts` — Layout + Interactions + Auth State

| ID | Test | Type |
|---|---|---|
| LT-5 | Sidebar is 240 px wide | Layout |
| LT-6 | Topbar has search row and topic row | Layout |
| LT-7 | Feed has both image cards and text cards | Layout |
| I-8 | Topic chip click updates active state | Interaction |
| I-9 | Sidebar sign in opens auth modal | Interaction |
| I-10 | Scroll to bottom loads more posts | Interaction |
| I-11 | Search submit navigates to /search | Interaction |
| S-12 | Logged-out — banner visible, settings disabled, first chip is Trending | Auth state |
| S-13 | Logged-in — banner absent, first chip is For you, digest badge visible | Auth state |

### `tests/e2e/auth.spec.ts` — Auth Modal

| ID | Test | Type |
|---|---|---|
| AM-1 | Login screen shows wordmark, email, password, forgot link | Static render |
| AM-2 | Password toggle reveals password | Interaction |
| AM-3 | Signup screen shows username field and terms text | Static render |
| AM-4 | Forgot password screen opens from login | Navigation |
| AM-5 | Back link on forgot screen returns to login | Navigation |
| AM-6 | Send reset link navigates to OTP screen | Navigation |
| AM-7 | OTP grid has 6 cells that accept digits | Interaction |
| AM-8 | Tab switch between login and signup | Interaction |
| AM-9 | Switch link at bottom of login navigates to signup | Navigation |
| AM-10 | Switch link at bottom of signup navigates to login | Navigation |
| AM-11 | Login success → modal closes and Sign in button disappears | Auth flow |
| AM-12 | Login success → page reload keeps user logged in | Auth flow |
| AM-13 | Login with wrong password → shows credential error | Error state |
| AM-14 | Login with network error → shows connection error | Error state |
| AM-15 | Signup with duplicate email → shows email taken error | Error state |
| AM-16 | Signup with duplicate username → shows username taken error | Error state |

### `tests/e2e/digest.spec.ts` — Digest Page

| ID | Test | Type |
|---|---|---|
| DIG-1 | Logged-in user sees today hero and past digests | Static render |
| DIG-2 | Logged-out user sees sign-in prompt on /digest | Auth gate |
| DIG-3 | Tabs switch between Past Digests and Manage Topics | Navigation |
| DIG-4 | Logged-in user can access Manage Topics tab and see topic grid | Navigation |
| DIG-5 | Follow toggle updates following count in the pill | Interaction |
| DIG-6 | Following a topic shows follow toast | Feedback |
| DIG-7 | Unfollowing a topic shows unfollow toast | Feedback |
| DIG-8 | Load more adds more digest cards | Interaction |
| DIG-9 | Search filters topic list by displayName | Interaction |
| DIG-10 | Back button navigates away from digest page | Navigation |

### `tests/e2e/profile.spec.ts` — User Profile

| ID | Test | Type |
|---|---|---|
| UP-1 | Own profile shows Edit Profile button | Auth-gated render |
| UP-2 | Own profile shows Drafts tab | Auth-gated render |
| UP-3 | Other user profile does not show Follow button | Auth-gated render |
| UP-4 | Other user profile does not show Drafts tab | Auth-gated render |
| UP-5 | Own profile does not show Follow button | Auth-gated render |
| UP-6 | Profile displays name, handle, bio and stats | Static render |
| UP-7 | Verified badge shown for VERIFIED user profile | Static render |
| UP-8 | No verified badge on USER role profile | Static render |
| UP-9 | Edit profile modal opens when Edit Profile clicked | Interaction |
| UP-10 | Edit profile modal contains expected form fields | Static render |
| UP-11 | Saving edit profile updates display name on page | Edit flow |
| UP-13 | Switching to Bookmarks tab shows bookmark content | Navigation |
| UP-14 | Switching to Drafts tab shows draft cards | Navigation |
| UP-15 | Clicking a post card navigates to post detail | Navigation |
| UP-16 | Unauthenticated user sees profile without edit or follow buttons | Auth state |
| UP-17 | Navigating from Settings Edit Profile link loads own profile | Navigation |
| UP-18 | Tabs appear in order Posts, Bookmarks, Likes, Drafts | Static render |
| UP-19 | Each tab contains an SVG icon | Static render |
| UP-20 | Own profile posts grid shows manage buttons | Auth-gated render |
| UP-21 | Other profile posts grid has no manage buttons | Auth-gated render |
| UP-22 | Delete post shows confirmation dialog; cancel keeps post | Interaction |
| UP-23 | Confirming delete removes post from grid | Edit flow |
| UP-24 | Unpublish shows confirmation; confirmed post appears in Drafts | Edit flow |
| UP-25 | Draft delete shows confirmation dialog; cancel keeps draft | Interaction |
| UP-26 | Confirming draft delete removes it from drafts grid | Edit flow |
| UP-27 | Invalid website URL shows error and blocks save | Validation |
| UP-28 | Website without protocol is normalized to https:// | Validation |
| UP-29 | Bookmarks tab cards show Saved badge | Static render |
| UP-30 | Likes tab is selectable and renders post cards | Navigation |

### `tests/e2e/settings.spec.ts` — Settings Modal

| ID | Test | Type |
|---|---|---|
| SM-1 | Opens when settings icon clicked while logged in | Interaction |
| SM-2 | Account section shows stacked email and username | Static render |
| SM-3 | Edit profile link-row has description text | Static render |
| SM-4 | Sign out link-row has description text and signs out on click | Auth flow |
| SM-5 | Digest frequency buttons change active state | Interaction |
| SM-6 | Manage topics link-row has description text | Static render |
| SM-7 | Privacy toggles have description text | Static render |
| SM-8 | Privacy toggles are interactive | Interaction |

---

## API Contract tests

Tests in `tests/api/` verify that the frontend renders correctly when given **OpenAPI-spec-shaped** responses via `page.route()`. These tests will naturally evolve into true integration tests once the real backend is wired up (remove the `page.route()` mock).

### `tests/api/profile.api.spec.ts`

All tests mock auth refresh + user/profile API responses to match user-service OpenAPI shapes.

| ID | Test | API endpoint |
|---|---|---|
| API-1 | GET /api/v1/users/me response renders own profile | `GET /user/api/v1/users/me` |
| API-2 | GET /api/v1/users/:userId response renders other user profile | `GET /user/api/v1/users/{id}` |
| API-3 | Profile stats display followerCount, postCount from API shape | `GET /user/api/v1/users/{id}` |
| API-4 | PATCH /api/v1/users/me returns new profile shape and reflects in UI | `PATCH /user/api/v1/users/me` |
| API-5 | Visiting profile with unknown username shows a profile page (fallback) | `GET /user/api/v1/users/{id}` |
| API-6 | UserProfile handles all optional API fields gracefully | `GET /user/api/v1/users/me` |
| API-7 | PATCH request body contains normalized website URL | `PATCH /user/api/v1/users/me` |
| API-8 | GET /api/v1/users/{id}/posts PostPage shape renders post cards | `GET /user/api/v1/users/{id}/posts` |
| API-9 | GET /api/v1/users/{id}/bookmarks PostPage shape renders Saved cards | `GET /user/api/v1/users/{id}/bookmarks` |
| API-10 | GET /api/v1/users/{id}/likes PostPage shape renders liked cards | `GET /user/api/v1/users/{id}/likes` |
| API-11 | GET /api/v1/me/drafts PostPage shape — Drafts tab renders draft cards | `GET /user/api/v1/me/drafts` |
| API-12 | DELETE /api/v1/posts/{id} is called after delete confirmed; post removed | `DELETE /user/api/v1/posts/{id}` |
| API-13 | PUT /api/v1/posts/{id} body contains status:DRAFT when unpublish confirmed | `PUT /user/api/v1/posts/{id}` |

---

## Mock data and demo accounts

The app uses an in-memory mock service (`src/services/content.service.ts`). E2E tests inject a `verita_user` into `localStorage` and mock the refresh endpoint to simulate a logged-in session without a real backend.

Demo accounts come from the seed (`scripts/seed`) and authenticate against the real backend (all share `Password123!`):
- `alexchen` (Alex Chen — ADMIN)
- `sarahjkim` (Sarah Kim — VERIFIED)
- `marcello_r` (Marcello Rossi — USER)

To preview populated post/bookmark/like/draft tabs before content-service is seeded, run the demo-flag build (`npm run dev:demo`, `VITE_DEMO_MODE`) — auth stays real, only those data-sparse reads use a mock display layer (ADR-0011).

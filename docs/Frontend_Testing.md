# Frontend Testing

Verita's frontend test suite has two layers:

| Layer | Tool | Command | When to run | CI |
|---|---|---|---|---|
| **Unit / Component** | Vitest + React Testing Library | `npm run test:unit` | Every commit — fast, no browser | ✅ |
| **E2E** | Playwright | `npm test` | Before PR — real frontend against a live seeded backend | ❌ local-only |

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
└── e2e/                      ← Playwright: critical user flows (real seeded backend)
    ├── support.ts               ← shared loginAs() + seed-user fixtures
    ├── auth.spec.ts
    ├── digest.spec.ts
    ├── home.spec.ts
    ├── profile.spec.ts
    ├── settings.spec.ts
    └── topic.spec.ts
```

---

## Running tests

```bash
cd frontend

# Unit + component (fast, ~5s)
npm run test:unit
npm run test:unit:watch   # watch mode
npm run test:unit:ui      # Vitest browser UI

# E2E (slow, requires browser + a live seeded backend)
docker compose up -d && npm run seed:local   # from the repo root
cd frontend && npx playwright install         # first time only
npm test
```

The E2E suite runs the real frontend against a **live, seeded backend** (no mock layer, no
route-mocking of data). It is **not run in CI**. Reseed before each run — some specs mutate the DB.

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

All E2E tests run against the real, seeded backend and log in with a seed user via
`tests/e2e/support.ts` (`loginAs`) — no route-mocking of data.

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
| DIG-2 | Opening the today digest renders the reader (badge, read time, Save/Share, back) | Reader |
| DIG-3 | Reader shows the personalisation note when logged in | Reader |
| DIG-4 | Digest is a single past-digests view with no tab bar (ADR-0014) | Navigation |
| DIG-5 | Logged-out user sees the public today digest + sign-in hero (ADR-0016) | Auth gate |
| DIG-6 | Logged-out user can open the public digest reader with an auth upsell | Reader |

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

> **Removed:** the former `tests/api/profile.api.spec.ts` mock-contract suite (API-1…API-13)
> verified the frontend against `page.route()`-mocked OpenAPI-shaped responses as a pre-integration
> stand-in. Now that the backend is integrated, that coverage lives in `e2e/profile.spec.ts`
> running against the real seeded backend.

---

## Seed accounts and the heavy E2E suite

The app has no in-app mock layer — all data comes from the real backend. The E2E suite is a
**heavy, local-only** suite (not run in CI): it runs the real frontend against a live, seeded
backend. Bring up `docker compose up` and `npm run seed:local`, then `npm test`. Identity comes
from a real login with a seed user via `tests/e2e/support.ts` (`loginAs`); assertions key off the
seed fixtures. Some specs mutate the DB (profile edits, delete/unpublish), so reseed before each run.

Seed accounts (`scripts/seed`) authenticate against the real backend (all share `Password123!`):
- `alexchen` — `alex@example.com` (Alex Chen)
- `sarahjkim` — `sarah.kim@example.com` (Sarah Kim — VERIFIED)
- `marcello_r` — `marcello.rossi@example.com` (Marcello Rossi)

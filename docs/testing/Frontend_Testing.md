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
├── e2e/                      ← Playwright: one spec per user story (real seeded backend)
│   ├── support.ts               ← loginAs(), seed-user fixtures, env config
│   ├── auth.spec.ts             ← Registration & Login
│   ├── home.spec.ts             ← Home Feed
│   ├── post-detail.spec.ts      ← Post Detail (AI summary, like, bookmark, comment)
│   ├── post-editor.spec.ts      ← Content Creation
│   ├── profile.spec.ts          ← User Profile
│   ├── settings.spec.ts         ← Settings
│   ├── topics.spec.ts           ← Topic Management
│   ├── digest.spec.ts           ← Daily Digest
│   └── admin.spec.ts            ← Admin GenAI ops
└── demo/                     ← Playwright: README/presentation clip recordings (opt-in)
    ├── support.ts
    └── *.demo.ts
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

### What belongs in the E2E suite

The suite is deliberately thin — **one spec per user story, each test a complete flow**. It is an
acceptance gate, not a rendering check. A test earns its place here only if it crosses the network:
a real login, a write that must survive a reload, an AI summary that only GenAI can produce.

Rendering details, copy, validation rules, sort order and component state are **cheaper and more
precise as Vitest tests** — put them in `tests/unit/`, not here. Every test added to this suite is
paid for on every run, by every reviewer.

### Targeting an environment

The same specs run against any environment carrying the seed users. `BASE_URL` selects the target
and `SEED_PASSWORD` the seed password; both have working local defaults, so **a plain `npm test`
needs no configuration**.

| Environment | How to run |
|---|---|
| Local Docker Compose | `npm test` (defaults to `http://localhost:3000`) |
| `verita-dev` on Rancher | `BASE_URL=https://dev.verita.stud.k8s.aet.cit.tum.de npm test` |
| Azure VM | `BASE_URL=https://<vm-host> npm test` |

A localhost target gets a `npm run dev` server started for it; a deployed target is used as-is.
`tests/e2e/` carries a ready-to-source file per target rather than a template to fill in:

```bash
set -a && . tests/e2e/.env.verita-dev && set +a && npm test
```

`.env.local` and `.env.verita-dev` are committed, and deliberately so — the hosts are public and
`SEED_PASSWORD` is the seed script's own fixture password, not a credential. Checking them in is
what makes the multi-environment run work out of the box. The Azure VM is the exception: its public
IP is assigned per deploy, so `.env.azure` is gitignored and `.env.azure.example` shows how to fill
it in.

Remote environments must be seeded first — see
[Seeding_Remote_Environments.md](../infrastructure/Seeding_Remote_Environments.md).

---

## Demo recordings

`tests/demo/` records the README/presentation clips from the real app against the same seeded stack,
reusing the E2E seed fixtures. They are **not** part of `npm test` (a separate config and an
`*.demo.ts` suffix keep them out): they carry deliberate pauses and few assertions.

```bash
docker compose up -d && npm run seed:local   # from the repo root
cd frontend && npm run demo:record           # → frontend/demo-recordings/<run>/**/*.webm
cd .. && ./scripts/make-demo-clips.sh        # → docs/assets/demo/*.webp
SPEED=1.5 ./scripts/make-demo-clips.sh      # → docs/assets/demo/*-1.5x.webp
```

Raw `.webm` output is gitignored; only the converted clips are committed. Regenerate them
deliberately rather than on every UI tweak — each one is a few MB in the repo. Every recording run
writes its own timestamped directory and `make-demo-clips.sh` encodes the newest by default; point
`REC_DIR` at an older one to keep a better take.

Only the 1.5x clips the README embeds are committed — the full set at three speeds is ~66MB against
a ~22MB repo, so other speeds are generated on demand rather than carried in history. `SPEED`
re-times rather than decimates: WebP carries a duration per frame, so speeding up shortens each
delay and every recorded frame still ships.

Five properties of the pipeline are easy to break by "tidying up":

- **The `Desktop Chrome` preset must stay out of the project's `use`.** A project's `use` overrides
  the top-level one, and that preset carries its own `viewport` (1280x720) and `deviceScaleFactor`
  (1) — spread into the project it silently reverts both, and the clip records the cramped
  small-desktop breakpoint. It is spread *under* the shared `use` instead.
- **`--force-device-scale-factor=2`** is what raises the capture; `deviceScaleFactor: 2` alone only
  changes what the page reports about itself. The screencast then captures at CSS size and the
  recorder pads it into the corner of the frame rather than scaling it up — a grey L around a
  small picture is the symptom of both this and the preset problem above.
- **`slowMo` must stay 0.** It delays every Playwright call, including each step of the synthetic
  cursor's glide, which turns the pointer into a slideshow. Scripts pace themselves with `beat()`.
- **25fps is the ceiling**, not a choice. Playwright's screencast records at a fixed 25fps, so the
  clips ship it unaltered. Interpolating up to 60 either cross-fades (ghosting on moving text) or
  costs ~40x realtime to estimate motion vectors.
- **`-enc_time_base 1/1000` is what makes `SPEED` work.** Left out, the encoder inherits a 1/25
  timebase and quantizes frame delays onto a 40ms grid; re-timed frames round onto the same tick and
  get a **0ms duration** — present in the file, never displayed. The clip then looks sped up while
  having quietly dropped a third of its frames.

Verify a re-time by frame count, not by eye: every speed of a clip must have the *same* frame count
as its 1x, with the total duration divided. `ffprobe` cannot help — ffmpeg encodes animated WebP but
cannot decode it, and PIL reports the durations as 0. Parse the ANMF chunks (the 3-byte duration sits
at body+12). Note the *average* fps of a finished clip reads well below 25: the screencast emits a
frame only when the page changes, so a `beat()` pause becomes one long-duration frame rather than a
run of identical ones. Motion is still 25fps.

The page lays out at 1920x1080 and is captured at 2x, so `make-demo-clips.sh` downscales 3840x2160
frames to a 2560-wide clip — the extra pixels are supersampled away rather than wasted.

Demos drive the pointer through `click()`/`hover()` in `tests/demo/support.ts` rather than
`locator.click()`: Playwright does not record the real cursor, so those helpers paint a synthetic
one and glide it, and a bare `locator.click()` teleports it.

Anything on the LLM path is recorded against a live model, so model choice is a recording concern.
`admin-genai-ops` pins `mistralai/mistral-medium-3.5-128b` (~3s, against ~53s for llama-3.3-70b);
see that file's header for why the env-default provider is not usable outside the TUM network.

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

All E2E tests drive the real, seeded backend and log in with a seed user via `tests/e2e/support.ts`
(`loginAs`) — no route-mocking of data. Each test is one user story, end to end.

| ID | Story | What only a browser + real backend can prove |
|---|---|---|
| AUTH-1 | A seeded user signs in and is greeted by name | Real credentials accepted through the auth modal |
| AUTH-2 | A signed-in session survives a page reload | The refresh cookie round-trips; the access token is memory-only |
| AUTH-3 | A new visitor signs up and lands signed in | Registration creates a usable account |
| AUTH-4 | Bad credentials and a taken email are rejected inline | Real 401 / availability responses reach the form |
| HOME-1 | The feed renders seeded posts; a card opens its detail page | The feed is served, not fixtured |
| HOME-2 | The feed is personalised once signed in | Trending → For you, driven by recommendation-service |
| HOME-3 | Searching from the topbar lands on filtered results | Search wiring end to end |
| POST-1 | A reader opens a post and expands its AI summary | The summary is generated by GenAI, served via content-service |
| POST-2 | Liking and bookmarking persists to the reader | The writes reach content-service, not just optimistic UI |
| POST-3 | A signed-in reader comments and sees it in the thread | Comment write + read-back |
| EDIT-1 | An author writes, publishes, and finds it on their profile | The full authoring round trip |
| EDIT-2 | The preview renders Markdown and KaTeX math | Live preview incl. formula typesetting |
| PROF-1 | Own profile has management affordances, another's does not | Ownership is resolved from the real identity |
| PROF-2 | Profile edits are saved and survive a refresh | The write reached user-service |
| PROF-3 | Unpublishing moves a post from Posts into Drafts | Status transition persists |
| PROF-4 | A visitor sees the profile without management controls | Signed-out rendering incl. the VERIFIED badge |
| SET-1 | Signing out ends the session and it stays ended | The refresh cookie is really cleared |
| SET-2 | The bookmarks privacy toggle controls what visitors see | The setting changes another viewer's page |
| TOPIC-1 | Following a topic persists across a refresh | The follow reached user-service |
| TOPIC-2 | A visitor is asked to sign in before managing topics | Auth gate on /topics |
| DIG-1 | A signed-in reader opens today's personalised digest | A real generated digest renders (ADR-0019) |
| DIG-2 | A visitor gets the public digest plus a sign-in upsell | PUBLIC vs PERSONAL digest split |
| ADM-1 | /admin is open to an admin and closed to everyone else | The guard keys off the real JWT role |
| ADM-2 | An admin reaches the panel; it survives a hard refresh | Async session restore does not bounce a real admin |
| ADM-3 | The live LLM config loads; keyless providers are unselectable | content-service → GenAI over the internal-token channel (ADR-0020) |

Deliberately **not** here — these are Vitest tests in `tests/unit/`, where they are faster and more
precise: auth-modal screen navigation and field rendering, toast copy, settings-row text, topic sort
and filter logic, editor toolbar/validation/exit-guard behaviour, layout measurements.

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

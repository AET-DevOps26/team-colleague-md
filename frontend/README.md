# Verita Frontend

React 19 · TypeScript · Vite · CSS Modules

This is the frontend for Verita, an AI-powered academic knowledge-sharing platform. It connects to the backend services (user-service, content-service, recommendation-service). All data comes from the real backend — there is no in-app mock layer; run `docker compose up` and seed it (`npm run seed:local`) before using the app.

---

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:3000`.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server on port 3000 (real backend) |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run unit + component tests (Vitest, ~5s) |
| `npm run test:unit:watch` | Vitest watch mode |
| `npm test` | Run the **heavy, local-only** E2E suite (Playwright) — needs a live seeded backend, see below |
| `npm run test:ui` | Open Playwright's interactive debug UI |

Log in with a seed user (e.g. `alex@example.com` / `Password123!`, see `scripts/seed`).

---

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── feed/           # Feed-specific cards and lists
│   │   │   ├── ImageCard/      # Post card with cover image (16:10)
│   │   │   ├── TextCard/       # Post card with serif pull-quote block
│   │   │   ├── DigestCard/     # Daily digest dark card
│   │   │   ├── PostCard/       # Thin dispatcher → ImageCard or TextCard
│   │   │   ├── FeedGrid/       # CSS column-count masonry grid
│   │   │   ├── TagFilterBar/   # Horizontal tag chip filter
│   │   │   ├── AuthBanner/     # Guest-mode sign-in prompt
│   │   │   └── RefreshFAB/     # Floating refresh button
│   │   ├── layout/         # App shell
│   │   │   ├── AppLayout/      # Two-column grid, sidebar mode A/B
│   │   │   ├── Sidebar/        # Nav, brand wordmark, CTA
│   │   │   └── Topbar/         # Two-row: search + tag filter row
│   │   ├── modals/         # Auth and Settings modals (Radix Dialog)
│   │   ├── post/           # Post detail components (body, comments, etc.)
│   │   └── ui/             # Shared primitives
│   │       ├── AuthorRow/      # Author avatar, name, time, like button
│   │       └── Toast/
│   ├── pages/              # Route-level components
│   │   ├── Home/           # Main feed page
│   │   ├── PostDetail/     # Single post reading view
│   │   ├── PostEditor/     # Create / edit post
│   │   ├── Search/         # Search results
│   │   ├── Digest/         # Daily digest list
│   │   ├── DigestPost/     # Single digest article
│   │   ├── UserProfile/    # Public profile page
│   │   └── Admin/          # Admin dashboard
│   ├── hooks/              # useAuth, useFeed, useReadingProgress
│   ├── contexts/           # AuthContext, ModalContext
│   ├── services/           # Backend API clients (content.service, auth.service)
│   ├── types/              # Shared TypeScript interfaces (Post, User, Tag…)
│   ├── utils/              # timeAgo and other helpers
│   └── styles/
│       └── globals.css     # Design tokens (CSS custom properties)
├── design/                 # Design reference package (read-only)
├── tests/                  # Playwright end-to-end tests
└── playwright.config.ts
```

---

## Design Reference

`frontend/design/` contains the complete design system — open it in a browser to use as the pixel reference during implementation.

**Entry point:** open `design/animations/00 Index.html` in a browser. It links to all page motion prototypes and component demos.

```
design/
├── pages/          # Static pixel-reference mockups (one per screen)
├── animations/     # Motion prototypes — behavior contracts, not just pixels
│   └── 00 Index.html   ← start here
├── tokens/
│   └── tokens.css  # CSS custom properties (single source of truth)
└── docs/
    └── Design Spec.md
```

**Pages covered by the design:**
Home · Post Detail · Post Editor · Search Results · User Profile · Settings · Auth (sign-in/register) · Digest Management · Digest Post · Admin · 404

To run a local static server from the design folder:
```bash
cd frontend/design
npx serve .
# then open http://localhost:3000/animations/00 Index.html
```

---

## Data

All data comes from the real backend. Auth and user profiles call the real User Service at
`http://localhost:8081`; posts/comments/digests/bookmarks/likes/drafts call the real Content
Service. Start the backend (`docker compose up`) and seed it (`npm run seed:local` from the repo
root) before signing in. The auth session is stored in `localStorage` under the key `verita_user`.

---

## Tests

Two layers. See [docs/Frontend_Testing.md](../docs/Frontend_Testing.md) for the full test case register.

| Layer | Tool | Command | Speed | CI |
|---|---|---|---|---|
| Unit / Component | Vitest + RTL | `npm run test:unit` | ~5 s | ✅ runs in CI |
| E2E | Playwright | `npm test` | ~5 min | ❌ local-only |

### Unit / component tests (CI)

```bash
npm run test:unit
```

Fast, no browser, no backend. These run on every PR.

### E2E — heavy, local-only

The E2E suite runs the **real frontend against a live, seeded backend** — there is no in-app mock
layer and no route-mocking of data. It is **not run in CI**; run it locally before shipping:

```bash
# 1. Bring up the whole stack
docker compose up -d

# 2. Seed it (from the repo root) — includes the public digest (ADR-0016)
npm run seed:local

# 3. Install the browser once
cd frontend && npx playwright install chromium

# 4. Run the suite (Playwright starts `npm run dev` and drives it)
npm test
```

Some specs mutate the seeded DB (profile edits, post delete/unpublish), so **reseed before each
run** for a clean baseline. Identity comes from a real login with a seed user via
`tests/e2e/support.ts` (`loginAs`).

**Test ID prefixes**

| Prefix | Scope | File |
|---|---|---|
| `LT-` | Layout dimensions and structure | `e2e/home.spec.ts` |
| `I-` | Interactions — clicks, navigation, dynamic behaviour | `e2e/home.spec.ts` |
| `S-` | Auth state — logged-in vs logged-out rendering | `e2e/home.spec.ts` |
| `AM-` | Auth modal — sign-in, register, error handling | `e2e/auth.spec.ts` |
| `DIG-` | Digest page flows (personal + public digest) | `e2e/digest.spec.ts` |
| `UP-` | User profile page | `e2e/profile.spec.ts` |
| `SM-` | Settings modal | `e2e/settings.spec.ts` |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 |
| Language | TypeScript 6 |
| Build tool | Vite 8 |
| Styling | CSS Modules + CSS custom properties |
| Routing | React Router v7 |
| UI primitives | Radix UI (Dialog, DropdownMenu) |
| HTTP client | Axios (wired to the real backend) |
| E2E tests | Playwright |

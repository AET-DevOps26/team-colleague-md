# Verita Frontend

React 19 · TypeScript · Vite · CSS Modules

This is the frontend for Verita, an AI-powered academic knowledge-sharing platform. It connects to the backend services (user-service, content-service, recommendation-service) and uses a local mock data layer for development without a running backend.

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
| `npm run dev` | Start Vite dev server on port 3000 (unauthenticated by default) |
| `npm run dev:alice` | Start dev server and auto-login as **Alice Morgan** (VERIFIED, `alice@verita.demo`) |
| `npm run dev:bob` | Start dev server and auto-login as **Bob Nakamura** (USER, `bob@verita.demo`) |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run unit + component tests (Vitest, ~5s) |
| `npm run test:unit:watch` | Vitest watch mode |
| `npm test` | Run all E2E + API contract tests (Playwright, requires browser) |
| `npm run test:ui` | Open Playwright's interactive debug UI |

Demo accounts use password `demo1234` at the login form, or are injected automatically via `VITE_DEMO_USER` when using `dev:alice` / `dev:bob`.

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
│   ├── services/           # Mock data layer (content.service, auth.service)
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

## Mock Data Layer

The app works without a running backend for content browsing. `src/services/content.service.ts` returns in-memory mock posts, comments, and digests.

Auth (`src/services/auth.service.ts`) now calls the real User Service at `http://localhost:8081`. Start the User Service (or run `docker compose up`) before using sign-in or registration. Auth session is stored in `localStorage` under the key `verita_user`.

Two built-in demo accounts work without a backend — use them at the login form (`demo1234`) or start the dev server pre-logged-in:

```bash
npm run dev:alice   # auto-login as Alice Morgan (VERIFIED)
npm run dev:bob     # auto-login as Bob Nakamura (USER)
```

---

## Tests

The suite has three layers. See [docs/Frontend_Testing.md](../docs/Frontend_Testing.md) for the full test case register.

| Layer | Tool | Command | Speed |
|---|---|---|---|
| Unit / Component | Vitest + RTL | `npm run test:unit` | ~5 s |
| E2E | Playwright | `npm test` | ~5 min |
| API Contract | Playwright + page.route() | `npm test` | included above |

**What goes where:**
- Pure functions and component logic → `tests/unit/`
- Critical user flows in a real browser → `tests/e2e/`
- Frontend renders correctly given OpenAPI-shaped responses → `tests/api/`

**Test ID prefixes**

| Prefix | Scope | File |
|---|---|---|
| `LT-` | Layout dimensions and structure | `e2e/home.spec.ts` |
| `I-` | Interactions — clicks, navigation, dynamic behaviour | `e2e/home.spec.ts` |
| `S-` | Auth state — logged-in vs logged-out rendering | `e2e/home.spec.ts` |
| `AM-` | Auth modal — sign-in, register, error handling | `e2e/auth.spec.ts` |
| `DIG-` | Digest page flows | `e2e/digest.spec.ts` |
| `UP-` | User profile page | `e2e/profile.spec.ts` |
| `SM-` | Settings modal | `e2e/settings.spec.ts` |
| `API-` | API contract (OpenAPI response shape) | `api/profile.api.spec.ts` |

```bash
# Unit + component tests — no browser needed
npm run test:unit

# E2E + API contract — requires Playwright browser installed once
npx playwright install chromium
npm test
```

No backend required — E2E tests mock the auth refresh endpoint via `page.route()` and use the in-memory mock service for all other data.

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
| HTTP client | Axios (wired to backend; mock layer used in dev) |
| E2E tests | Playwright |

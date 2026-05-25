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
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint |
| `npx playwright test` | Run all end-to-end tests |
| `npx playwright test --update-snapshots` | Regenerate visual regression baselines |

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

The app works without a running backend. `src/services/content.service.ts` and `src/services/auth.service.ts` generate mock posts, users, and digests. Auth state persists in `localStorage` under the keys `verita_user` and `verita_token`.

To simulate a logged-in session in the browser console:
```js
localStorage.setItem('verita_user', JSON.stringify({ id: '1', username: 'you', displayName: 'Your Name', role: 'USER', email: 'you@example.com' }))
localStorage.setItem('verita_token', 'dev-token')
// then hard-refresh the page
```

---

## End-to-End Tests

Tests live in `frontend/tests/home.spec.ts`. Playwright starts the dev server automatically.

```bash
# Run all tests
npx playwright test

# Run only layout / interaction tests (fast, no snapshots)
npx playwright test --grep-invert "VR-"

# Regenerate visual regression baselines after UI changes
npx playwright test --grep "VR-" --update-snapshots
```

Visual snapshots are stored in `tests/snapshots/`. Commit them alongside any intentional visual change.

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

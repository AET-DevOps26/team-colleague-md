# Verita Frontend Design Package

Editorial-minimal reading & writing product. This is the design source — static mockups, animation prototypes, and written specs. The product itself ships from a separate repo.

## Quick start

Open `animations/00 Index.html` in a browser. Everything links from there.

For a static server: `python3 -m http.server` or `npx serve` from this folder.

## Live demo path (5 steps, ~3 min)

1. Open `animations/00 Index.html` — show the catalog (10 pages × 13 components).
2. Click **01 Home** — let cards stagger in, hover one to show the lift.
3. Open `pages/Verita Home.html` in another tab — pixel reference next to motion prototype.
4. Back to Index → **02 Post Detail** — reading-progress bar, action-bar pill, AI summary expand.
5. Index → **C13 Focus & Keyboard** — tab through to show the focus-ring system end-to-end.

## Structure

- `pages/` — final static mockups, one HTML per screen
- `animations/pages/` — page-level motion prototypes (01–10), paired with `pages/`
- `animations/components/` — component-level motion prototypes (01–13)
- `animations/00 Index.html` — entry point, links to every demo
- `tokens/tokens.css` — shared CSS tokens (single source of truth)
- `tokens/theme.ts` — Chakra UI mirror of the same tokens (for React)
- `docs/` — PRD, Design Spec, Animation Spec, Architecture, Problem Statement
- `prototypes/` — placeholder for React experiments

## For the implementing engineer

1. Copy this folder into the product repo (suggested path: `web-client/design/`).
2. Import tokens once, globally:
   - CSS: `@import "design/tokens/tokens.css";`
   - React/Chakra: extend from `design/tokens/theme.ts`.
3. Read `docs/Design Spec.md` for the component system and page specs.
4. Read `docs/Animation Spec.md` for motion — every animation lists its tokens and gotchas.
5. Treat the demos in `animations/` as behavior contracts, not pixel references. Pixel reference is `pages/`.

Fonts are loaded via Google Fonts (`Inter`, `JetBrains Mono`, `Newsreader`) inside `tokens.css`. Self-host them in production if your build pipeline requires it.

## Known gaps

- Mobile / tablet breakpoints are not yet drawn. Desktop is the current canonical viewport — see Design Spec §5 for the breakpoint contract until mockups land.
- `pages/*.html` previously redeclared tokens inline. As of this audit pass they `<link>` `tokens/tokens.css` directly; if you fork a page, do the same.

See `CHECKLIST.md` for the full pre-handoff audit.

## Status

Design prototype — not a built product.

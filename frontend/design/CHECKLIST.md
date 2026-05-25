# Pre-handoff checklist

Run before copying this folder into the product repo. Each item: what to check, why, current status.

Legend: ✅ pass · ⚠️ minor · ❌ blocker

---

## 1. Design consistency

| # | Check | Status | Notes |
|---|---|---|---|
| 1.1 | All `animations/**` files import `tokens/tokens.css` | ✅ | Verified — every demo links it. |
| 1.2 | All `pages/*.html` import `tokens/tokens.css` | ✅ | Fixed in audit pass. Each page's inline `:root` block was replaced with `<link rel="stylesheet" href="../tokens/tokens.css">`. Verita User Profile and Verita Design Spec retain a small page-local `:root` for vars unique to those pages (`--topbar-h`, `--bg2…--border2`). |
| 1.3 | No raw hex outside the `:root` block of `pages/*` | ⚠️ | A few one-off literals: `#fff` on white surfaces, `#333` for hover, gradient stops on the Home wordmark sphere (`#c0a4ff → #ff8a8a → #ffc28a`) and a green checkmark `#9ce0a0` on the Today card. These are intentional decorative gradients. Document them in `docs/Design Spec.md` if they become reusable. |
| 1.4 | `tokens/theme.ts` mirrors `tokens/tokens.css` 1:1 | ✅ | Fixed — `--bg-paper` (`oklch(97% 0.012 80)`) added to `tokens.css`. |
| 1.5 | Each page in `pages/` has a paired motion demo in `animations/pages/` | ✅ | 10 / 10 paired. Settings is part of `Verita Settings.html` and referenced as a modal in motion specs. |
| 1.6 | All component states drawn (default / hover / focus / disabled / loading) | ⚠️ | `animations/components/` covers buttons, fields, focus, skeletons. Verify Post Editor's "saving / saved / save failed" states are spelled out — currently in motion only. |
| 1.7 | Empty / error / loading states for data-bearing pages | ⚠️ | Home, Search, Profile, Digest: confirm empty state is drawn or noted. 404 exists. Add a one-line empty-state note per page in Design Spec §3 if not present. |
| 1.8 | Responsive breakpoints documented | ✅ | Fixed — Design Spec §5 now lists desktop/laptop/tablet/mobile breakpoints and reflow rules. Mobile/tablet mockups still TODO. |

### Variables used in demos but not defined in `tokens.css`

✅ Fixed — alias block added to `tokens.css`. The aliases below now forward to canonical tokens automatically; no rename needed in any demo.

| Alias (now defined) | Forwards to |
|---|---|
| `--bg` | `--bg-base` |
| `--fg` | `--text-primary` |
| `--border` | `--border-subtle` |
| `--border-strong` | `--border-default` |
| `--error` | `--danger` |
| `--surface-elevated` | `--bg-elevated` |
| `--font-display` / `--font-body` | `--font-serif` / `--font-sans` |
| `--sans` / `--serif` / `--mono` | `--font-sans` / `--font-serif` / `--font-mono` |
| `--sidebar-w` / `--sidebar-rail` | `--side-w` / `--rail-w` |
| `--focus-ring` / `--focus-ring-offset` / `--focus-ring-glow` | promoted to canonical tokens with values from `13 Focus & Keyboard.html` |

Local-only vars (`--toast-bg`, `--topbar-h` page-local, `--mock-side`, `--i`, `--stagger-i`) remain scoped to their demo files — that's correct.

---

## 2. Accessibility

| # | Check | Status | Notes |
|---|---|---|---|
| 2.1 | Body text passes WCAG AA (4.5:1) | ✅ | `--text-primary` (#0A0A0A) on `--bg-base` (#FFFFFF): 20.4:1. |
| 2.2 | Secondary text passes AA | ✅ | `--text-secondary` (#6B6B6B) on white: 5.6:1. |
| 2.3 | Tertiary text passes AA | ✅ | Fixed — Design Spec §1.1 now documents the constraint: `--text-tertiary` (#ABABAB, 2.85:1) is decoration-only (timestamps, hints, disabled labels, separators); never use for primary or secondary content. |
| 2.4 | Focus ring visible & consistent | ✅ | Fixed — `--focus-ring`, `--focus-ring-offset`, `--focus-ring-glow` are now canonical tokens in `tokens.css`. Migrate `:focus-visible` rules to `outline: var(--focus-ring); outline-offset: var(--focus-ring-offset);` during React port. |
| 2.5 | `prefers-reduced-motion` honored | ✅ | Global override in `tokens.css`. Demos extend it locally. |
| 2.6 | Hit targets ≥ 44×44 (where applicable) | ⚠️ | Designs are desktop-only; revisit when mobile breakpoints are drawn. |

---

## 3. Documentation

| # | Check | Status | Notes |
|---|---|---|---|
| 3.1 | README explains structure + entry point | ✅ | Updated. |
| 3.2 | README has implementation guide for the engineer | ✅ | Updated. |
| 3.3 | `docs/Design Spec.md` covers tokens, components, pages | ✅ | TOC is complete (1 tokens · 2 components · 3 pages · 4 patterns). |
| 3.4 | `docs/Animation Spec.md` covers tokens, gotchas, severity | ✅ | Solid — already labels CSS-only vs. Framer Motion. |
| 3.5 | PRD reflects what was actually designed | ⚠️ | Cross-check: every page in `pages/` is mentioned in PRD, every PRD feature has a design. Quick eyeball pass before handoff. |
| 3.6 | `Plan.md` (en) and `Plan.zh.md` agree | ⚠️ | Two languages co-exist. Pick one as canonical for the team and note it in README, or mark zh as translation. |
| 3.7 | Font licensing noted | ⚠️ | Inter / JetBrains Mono / Newsreader are all OFL — add one line in README for legal hygiene. |
| 3.8 | This checklist exists | ✅ | You're reading it. |

---

## 4. Demo / showcase readiness

| # | Check | Status | Notes |
|---|---|---|---|
| 4.1 | `animations/00 Index.html` opens & links work | ✅ | Verified. |
| 4.2 | Every demo opens standalone (relative paths only) | ✅ | No absolute `href="/…"` or `src="/…"` found. |
| 4.3 | Demo path for live presentation | ✅ | Fixed — README now has a 5-step demo script. |
| 4.4 | One-glance system overview | ⚠️ | Optional: a single screenshot or simple SVG showing _pages × motion × tokens_. Reduces cognitive load for the advisor. |

---

## 5. File hygiene

| # | Check | Status | Notes |
|---|---|---|---|
| 5.1 | No stale `.artifact.json` files | ✅ | Fixed — 12 sidecars removed. |
| 5.2 | No orphan top-level images | ✅ | Fixed — root `mpk*.png` files no longer present. |
| 5.3 | No absolute paths anywhere | ✅ | Clean. |
| 5.4 | Folder names safe for cross-platform repos | ✅ | Filenames contain spaces but no other special chars; URL-encoded references handle this. Alternative: rename to kebab-case before merging if your repo enforces it. |

---

## 6. Suggested fix order

All P0/P1 items above are ✅. What's left for the team to decide before the React port:

1. Draw mobile / tablet mockups (or accept the §5 contract as the implementation spec).
2. Eyeball-pass: PRD ↔ designed pages parity (check 3.5).
3. Pick canonical language for `Plan.md` vs `Plan.zh.md` (3.6).
4. Add a one-line font-licensing note to README (3.7).
5. Optionally rename folder/file names to kebab-case if your repo enforces it (5.4).

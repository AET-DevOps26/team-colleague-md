# Verita · Animation Spec

Single source of truth for motion in Verita. Every entry: what it does, the geometry, the tokens, and any non-obvious gotcha.

Severity: 🟢 pure CSS · 🟡 CSS works, Framer Motion preferred for orchestration · 🔴 needs Framer Motion (`AnimatePresence`, `layoutId`, gestures).

---

## 0. Architectural note — feed layout in React

The design uses **CSS Grid** (not CSS columns / masonry) for the post feed. This is a deliberate trade-off:

- CSS columns (`column-count`) fills top-to-bottom per column. Filter animations are unpredictable — the browser controls card placement, so you cannot animate cards smoothly between positions.
- CSS Grid fills left-to-right, row by row. Framer Motion's `layout` prop can animate each card to its new grid position smoothly when the filter changes.

The canonical `Verita Home.html` design file uses CSS columns for visual reference. The React implementation must use CSS Grid (or a masonry JS library that exposes position control, e.g. `react-masonry-css`) to support the §2.2 filter animation. Discuss with the team if a masonry layout is required — it will need a JS-driven masonry solution, not pure CSS columns.

---

## 1. Tokens

All animations must reuse these. Add new tokens here before using them.

```css
:root {
  --ease-ios:    cubic-bezier(0.22, 0.61, 0.36, 1);  /* default */
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);      /* decisive entrance */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);     /* symmetric */

  --dur-instant:    120ms;   /* hover, focus ring */
  --dur-fast:       180ms;   /* button press, icon morph */
  --dur-rail-hover: 260ms;   /* sidebar hover-expand */
  --dur-rail:       320ms;   /* sidebar structural collapse/expand */
  --dur-page:       460ms;   /* page-level slide */
  --dur-stage:      560ms;   /* multi-stage choreography */
}
```

Framer Motion: same numbers as seconds (`0.46`) and ease as `[0.22, 0.61, 0.36, 1]`.

---

## 2. Implemented

### 2.1 Home ⇄ Post Detail   🟡

Reference: `animations/Verita Transition.html`.

**2.1.1 Home → Detail (push from right).** Click a post card. Detail pane slides from `translateX(100%)` to `0`; home pane slides to `translateX(-6%)` and fades to `opacity: 0`. Stage clips X overflow.
- Tokens: `--dur-page` + `--ease-ios` for transform; 380ms for entering opacity, 320ms for leaving.
- **Gotcha — no residue.** Leaving pane gets `visibility: hidden` via `transition: visibility 0s linear var(--dur-page)` so the (now transparent) pane stops eating clicks and stops leaving faint edge artifacts on slow displays.

**2.1.2 Detail → Home (back).** Click `<`, press Esc, or browser back. Mirror of 2.1.1, same tokens.

**2.1.3 Sidebar collapse on entering detail.** Width `240px` → `52px` via `grid-template-columns` on the stage. Wordmark fades out, compact mark fades in (small delay so they don't overlap). Labels, badges fade out. CTA shrinks to `32×32`.
- Tokens: `--dur-rail` for structure, `--dur-instant`–`--dur-fast` for label opacity. Pure CSS, attribute selector on the stage.

**2.1.4 Sidebar hover-expand inside detail (pushes content).** Pointer enters collapsed rail → sidebar expands `60px` → `240px` and **pushes the article rightward**. Matches the canonical `Verita Post Detail.html` behaviour.
- Tokens: `--dur-rail-hover` + `--ease-ios` on `grid-template-columns`.
- **Mechanism.** The stage grid's column width is the animated property; `:has(.sidebar:hover)` switches it back to `--side-w`. No JS, no `position: absolute`.

```css
.stage[data-view="detail"] { grid-template-columns: var(--rail-w) 1fr; }
.stage[data-view="detail"]:has(.sidebar:hover) { grid-template-columns: var(--side-w) 1fr; }
/* transition lives on .stage, already animated via --dur-rail/--dur-rail-hover */
```

In React: keep as pure CSS `:has`. No `useState` needed.

**2.1.5 Sidebar Explore → back to Home.** Click "Explore" nav item from detail view triggers the same Detail → Home slide animation (§2.1.2). Pure JS: `onclick` calls `setView('home')`.

**2.1.6 Brand mark expand (`V` → `Verita`).** Rail state: only `V` visible. On sidebar hover-expand, `erita` suffix slides in from the right. On collapse, reverses.
- Mechanism: suffix span has `max-width: 0; overflow: hidden`. On expand: `max-width` transitions to `80px`, `opacity: 0 → 1` with `40ms` delay (waits for width to start opening first). Pure CSS via `:has(.sidebar:hover)` and `[data-view]` selectors. No JS.
- Tokens: `--dur-rail-hover` + `--ease-ios`.

**2.1.7 Brand click → Home + refresh.** Click the "Verita" / "V" brand mark anywhere in the sidebar.
- From Home view: triggers refresh animation (§2.4) immediately.
- From Detail view: triggers Detail → Home slide (§2.1.2) first, then refresh after `--dur-page` settles (500ms delay).
- Shared `triggerRefresh()` function used by both brand click and FAB — respects active tag filter.

---

### 2.2 Home feed tag filter   🟡

Reference: `animations/Verita Transition.html`, tag filter section.

Click a tagbar chip (or a different chip). All visible cards fade out together, non-matching cards are pulled from grid flow, then matching cards stagger back in. Same-tag click is a no-op.

**Sequence:**
1. All visible cards: `opacity: 0` over 220ms (simultaneous, no stagger on exit).
2. After 220ms: non-matching slots get `display: none`; grid reflows silently.
3. 60ms reflow pause.
4. Matching cards: set `opacity:0; translateY(10px)`, force reflow, then stagger-enter with 70ms spacing, 280ms `ease-out` per card.

Tokens: fade-out 220ms, entry 280ms `ease-out`, stagger 70ms/card. No extra token needed — fits within `--dur-rail` range.

**Gotcha — no positional flash.** All cards must fade out *before* `display:none` triggers the reflow. If matching cards are made visible before fade-out completes, the grid snaps them to their new position mid-animation and they appear to flash.

**Gotcha — reflow guard between style changes.** Between setting initial inline styles (`opacity:0; translateY(10px)`) and starting the entry transition, force a reflow with `void el.offsetWidth`. Without it, the browser batches both changes and cards skip the entry animation entirely. This pattern is reused by §2.4, §2.6 (both paths), and any stagger-entry sequence.

In React: `AnimatePresence` with `mode="wait"` on the grid container; each card as a `<motion.div>` with `layout` prop for grid reflow, `initial/animate/exit` variants using the same duration/ease.

---

### 2.3 Home card like   🟢

Click the heart icon on a post card. Icon fills red, count increments by 1. Clicking again unfills and decrements. State is shared with the Detail pane's engage row — liking from either place updates both.

- Animation: `@keyframes like-bounce` — scale `1 → 1.38 → 0.9 → 1.12 → 1` over 420ms.
- Gotcha: re-triggering the bounce requires removing the class, forcing a reflow (`void el.offsetWidth`), then re-adding it so the browser re-starts the keyframe.

In React: `useState` for `liked` + `count`; `onAnimationEnd` to remove the bounce class.

---

### 2.4 Refresh FAB   🟢

Click the refresh button (bottom-right, home view only). Same sequence as §2.2 (fade all → reflow → stagger re-entry) but always respects the currently active tag filter — does not reset to "For you".

- FAB icon: 600ms full-rotation `@keyframes` animation (added/removed via `spinning` class). Use a keyframe, not a `transition` on `transform` — a transition reverses on class removal and produces a visible half-spin back to 0deg.
- FAB hidden when `data-view !== "home"` (also hidden in detail and search views).
- Reuses the `triggerRefresh()` function shared with §2.1.7 (brand click).

**Gotcha — FAB element must precede the `<script>` block in DOM order.** In the HTML prototype, the IIFE binds `addEventListener` synchronously at parse time. If the FAB element appears later in the document, `getElementById('refreshFab')` returns null, the next `addEventListener` call throws, and *all subsequent listeners in the IIFE silently fail to register* (including brand click §2.1.7). Place the FAB before its controller script, or attach listeners on `DOMContentLoaded`. Not relevant in React — mount order is managed by the framework.

---

### 2.5 Settings modal   🟢

Reference: `animations/Verita Transition.html`, settings modal section.

Click "Settings" nav item in the sidebar (works in both expanded and collapsed-rail states). Modal appears over current view without navigating away.

**Open sequence:**
- Backdrop: `opacity: 0 → 1` over 160ms ease-out; `pointer-events: none → all` simultaneously.
- Modal panel: `translateY(8px) scale(0.98) → translateY(0) scale(1)` over 160ms ease-out.

**Close:** reverse (remove `.open` class). Triggers: close button (×), Esc key, backdrop click.

Tokens: 160ms `ease-out` for both layers. No custom token needed — fits within `--dur-fast` range.

In React: `useState(isOpen)` + conditional class; `useEffect` for Esc listener cleanup. Pure CSS transitions — no Framer Motion required.

---

### 2.6 Search — overlay input + dual-path results   🟡

Reference: `animations/Verita Transition.html`.

The search flow has two submission paths depending on where the user submitted from. Path A (first-time search from home) reuses the §2.1 horizontal push. Path B (re-search inside the results view) keeps the user in place and only re-fades the overlay.

The path is selected via `stage.dataset.searchMode` (`"push"` or `"overlay"`), set by the search controller before triggering the transition. `setView('home')` resets it back to `"push"` so the next first-search runs the push path again.

**Triggers (open overlay).**
- Home view: click the home topbar search bar or focus its input.
- Search results view: click the results topbar search bar. The overlay opens **prefilled with `currentQuery`** and the input value is auto-selected so the user can immediately overwrite or refine.

**Phase 1 — open overlay.** A full-viewport overlay appears at z-index 300, **opaque** (`background: var(--surface-elevated)`, **no `backdrop-filter`**). The opacity is solid by design — earlier semi-transparent + blurred versions caused a visible "flash of home" during fade-out.
- Open keyframe: `opacity: 0, scale(0.985), translateY(4px)` → `opacity: 1, scale(1), translateY(0)` over 220ms `ease-out`. Driven by an `.open` class on the overlay.
- Input autofocuses after 80ms (so the focus ring doesn't appear during the opening animation). When prefilled, `select()` is called instead of `focus()` so the existing query is highlighted.
- Suggestion chips visible immediately, no entry stagger.

**Phase 2A — submit (Path A, home → search, first-time).** The user is on home; `stage.dataset.view === "home"`.
1. Set `stage.dataset.searchMode = "push"`.
2. `populateResults(q)` — fill the search pane with results synchronously; cards' stagger countdown begins (60ms interval, first card delay=0, 320ms `result-card-in` keyframe per card: `translateY(16px) → 0 + opacity 0 → 1`).
3. `closeOverlay(true)` — overlay swaps `.open` for `.closing` and fades out (220ms, opacity-only).
4. `setView('search')` — triggers the §2.1 push: search pane `translateX(100% → 0)`, home pane `translateX(0 → -6%) + opacity 1 → 0`, both `--dur-page` + `--ease-ios`.

All four happen in the same JS turn. The overlay fading out (220ms) sits on top of the push animation in progress (460ms) — because both home and search panes are moving, the eye reads the motion under the overlay as "the search state opening up", not as a stable home page being revealed.

**Phase 2B — submit (Path B, re-search inside results).** The user is already in search view; `stage.dataset.view === "search"`.
1. Set `stage.dataset.searchMode = "overlay"` (semantic only; CSS doesn't depend on it here).
2. `populateResults(q)` — refill cards, restarting the stagger keyframe.
3. `closeOverlay(true)` — overlay fades in place (220ms) revealing the freshly-populated results pane underneath.
4. **Do not call `setView`** — the user is already in the search view; calling it would replay the push.

The overlay sits at z-index 300, the search pane at z-index 2 (and z-index 1 for home, z-index 3 for profile). In Path B the overlay is above the results pane and fades cleanly off the top.

**Phase 3 — back to home.** Click ← Explore in the results topbar, click × clear, or press Esc (when overlay is closed). Calls `setView('home')` — mirror of §2.1.2 (reverse push). `setView` also resets `dataset.searchMode = "push"` so the next first-search runs Path A again.

**Esc behavior.**
- Overlay open: Esc closes the overlay only and stays in the current view (home or search).
- Overlay closed, in search view: Esc calls `setView('home')`.
- Overlay closed, in detail view: Esc calls `setView('home')` (existing §2.1.2 binding).

**Overlay close styling.** The `.closing` state is **opacity-only** — no scale, no translate, no `backdrop-filter`. The open animation has the `scale + translate` zoom-in (it adds a "zooming into search" cue); the close keeps it minimal so the closing fade is calm and cheap to composite.

**Tokens.** Overlay open/close 220ms `ease-out`; push `--dur-page` + `--ease-ios` (same as §2.1); card stagger 60ms × 12 = 660ms total, single card 320ms `ease-out`.

**Gotcha — overlay must be opaque, no backdrop-filter.** A semi-transparent overlay with `backdrop-filter: blur` will leak the underlying home pane during Phase 2A's fade-out, producing a visible flash of home before the results land. The opaque solid background is a hard requirement, not a styling choice.

**Gotcha — order of operations in Path A.** `populateResults` must run *before* `setView`. The cards' stagger animation is driven by CSS `animation-delay` and starts the moment the `entering` class is added. If `setView` is called first, the search pane becomes visible while empty (one frame of empty pane = visible flash). Populating first means the first frame after the push begins already has cards in their stagger entry.

**Gotcha — same reflow guard as §2.2.** Each `populateResults` call must `void resultsMasonry.offsetWidth` before adding `entering` to the new cards, so re-search restarts the keyframe cleanly.

In React:
- Path A: route change from `/home` to `/search` wrapped in `<AnimatePresence>` on the router outlet, using the same push variants as Home → Detail. Overlay is a portal-rendered component with its own `AnimatePresence`, mount/unmount independent of the route.
- Path B: overlay mount/unmount inside the `/search` route — no router change. Result list is a `<motion.div>` array keyed by `query`; `AnimatePresence` swaps the list when the query changes, with stagger via `transition.delayChildren`.

---

### 2.7 Home → User Profile   🟡

Reference: `animations/Verita Transition.html`, profile pane.

Click the avatar button in the home topbar. Profile pane slides in from the right; same push pattern as §2.1 (Home → Detail).

- Home exits left: `translateX(-6%) + opacity: 0`, `--dur-page` + `--ease-ios`.
- Profile enters right: `translateX(100%) → 0 + opacity: 1`, `--dur-page` + `--ease-ios`.
- Back: click `← Explore` in profile topbar → `setView('home')`, same reflow guard (§2.6 gotcha).
- `z-index: 3` on profile pane (above detail at z-index 2) so it slides over cleanly.

Tokens: `--dur-page` + `--ease-ios`. Reuses same `setView` controller with an added profile pane arm.

In React: same push route pattern as Home → Post Detail. Profile route is a sibling route at the same level.

---

### 2.8 Auth modal — open / close / mode-switch / submit   🟡

Reference: `animations/Verita Transition.html`. Visual design ported from `Verita Auth.html` (root). Animation pattern is original to the demo.

**Triggers (open).**
- Topbar: avatar slot is conditionally rendered as a "Sign in" pill button when `stage.dataset.auth === "signed-out"`. Three locations: home topbar, search-results topbar, detail topbar — each with its own pill that morphs back to the avatar after sign-in.
- Sidebar: a "Sign in" nav-item sits above "Settings", visible only when signed out (rail state shows icon only).
- Both triggers call `openAuthModal('login')` or `openAuthModal('signup')`.

**Modal layout.** 380px wide centered panel inside a fixed-inset backdrop at z-index 600 (above search overlay 300, above settings modal 500). Italic serif wordmark `<span class="lead">V</span>erita` (32px / 38px lead glyph). Login / Signup tabs as bottom-line + 2px underline (no segmented background). 44px filled-bg input rows with eye-toggle for password fields. 44px black CTA, 8px radius. Centered switch link below CTA ("No account? **Sign up**" / "Already have an account? **Log in**").

**Open sequence (total ~480ms).**
1. Backdrop: `opacity: 0 → 1` over 160ms `ease-out`; `pointer-events: none → all` simultaneously via `.open` class.
2. Modal panel: `translateY(10px) scale(0.985) → translateY(0) scale(1) + opacity 0 → 1` over 180ms `--ease-out`. Slightly longer + larger initial offset than the §2.5 settings modal to convey "this is a primary surface, not a quick menu".
3. Content stagger (driven by `.stagger-in` class on the backdrop, applied alongside `.open`):
   - Wordmark: `opacity 0 → 1`, 120ms, delay 80ms
   - Tabs: `opacity 0 → 1 + translateY(4 → 0)`, 160ms `ease-out`, delay 120ms
   - Fields: same form, 160ms `ease-out`, **stagger 40ms** (160 / 200 / 240ms delays for fields 1 / 2 / 3)
   - CTA + switch link: delay 280ms

**Close (total 200ms, asymmetric).**
- Panel: `translateY(0) scale(1) → translateY(6px) scale(0.985) + opacity 1 → 0` over 160ms `--ease-ios`.
- Backdrop fades 160ms in parallel.
- No reverse content stagger — close is calm and decisive.
- Triggers: × button, Esc, backdrop click. **Disabled while submitting** (no accidental cancel mid-network).

**Internal panel switch (Login ⇄ Signup ⇄ Forgot).** Horizontal push, not modal-replay. Driven by `setAuthMode(mode)`:
1. Measure target panel height (clone-and-measure before applying styles).
2. Old panel: `translateX(0 → -20px [forward] | +20px [back]) + opacity 1 → 0`, 180ms `ease-in`.
3. 60ms gap.
4. New panel: `translateX(20px → 0 [forward] | -20px → 0 [back]) + opacity 0 → 1`, 220ms `--ease-out`, delay 60ms.
5. `.auth-stage` height transitions to measured target over 240ms `--ease-ios`.

Forward direction = login → signup → forgot. Back direction (e.g. "Back to log in" link) reverses the X axis. Tabs visually toggle bold + underline `margin-bottom: -1px` to overlap the bottom border.

**Submit feedback.**
- CTA `<span>` content cross-fades to spinner over 120ms.
- 700ms fake network delay.
- Success path: `#authSuccess` overlay reveals with green check circle scale-in (280ms `--ease-ios`) + "Welcome back, Alex" 100ms later.
- 700ms hold → `closeAuthModalForSuccess()`.
- Failure path: 6px horizontal shake (×2 over 120ms) on the modal panel; CTA reverts to original text.

**Post-success choreography (parallel).**
1. Auth modal close (160ms).
2. `setAuthState('signed-in', { animate: true })` flips `stage.dataset.auth` and the `.auth-only-out / .auth-only-in` CSS rules toggle Sign-in pills off + avatars on.
3. Topbar Sign-in pills morph: `width / padding / border-radius / opacity` transitions over 240ms `--ease-ios` to converge into the 36×36 avatar shape; the avatar itself replays an `avatar-enter` keyframe (`scale 0.85 → 1 + opacity`, 320ms).
4. Welcome toast (top-center): `opacity 0 + translateY(-12px) → 1, 0` over 240ms slide-in, 2.4s hold, then fade out. `pointer-events: none` always.
5. §2.9 Feed refresh runs in parallel.

**Reduced motion.** All stagger / scale / horizontal push collapses to plain `opacity 0 → 1` over 220ms. Submit success skips the check-circle scale and goes straight to "Welcome back".

In React:
- Modal as a portal-rendered component with `<AnimatePresence>` controlling open/close.
- Internal mode switch: `<AnimatePresence mode="wait">` keyed by mode, with `initial / animate / exit` X-translation variants. Use `<motion.div>` `layout` on the panel container for height auto-animation (replaces the manual `_measurePanelHeight`).
- Stagger via `transition.delayChildren / staggerChildren` on the panel wrapper, applied only on first open (use a `useRef` flag).
- Submit state machine: `useState<'idle'|'submitting'|'success'|'error'>` driving the spinner + check-circle.

---

### 2.9 Post-sign-in feed refresh   🟢

Reference: `animations/Verita Transition.html`, `refreshFeedForSignedIn`.

After successful sign-in, the feed swaps from the public stream to a personalized one. The animation is **deliberately minimal** — no per-card stagger, no DOM reorder.

**Sequence.**
1. `.masonry` gets `.refreshing` class → `opacity: 1 → 0` over 120ms `ease-in`.
2. After 120ms: `_personalizeFeed(masonry)` swaps text content in place — digest label, sublabel, title, and bullets `innerHTML` are replaced with personalized copy.
3. `.refreshing` class is removed → `opacity: 0 → 1` over 220ms `--ease-ios` via the default `.masonry` transition.

That's it. No `forEach` over slots, no inline `style.transform`, no `setTimeout`-based cleanup, no `appendChild` reordering.

**Token usage.** Re-uses `--ease-ios`; durations (120ms / 220ms) are local to this animation since "fade-out before swap, fade-in after" is faster than a typical view transition but slower than an instant flash.

In React: a single state flag `feedRefreshing: boolean` drives `<motion.div className="masonry" animate={{ opacity: feedRefreshing ? 0 : 1 }} transition={{ duration: feedRefreshing ? 0.12 : 0.22 }}>`. Swap data inside a `setTimeout(120)`. No `<AnimatePresence>` needed — the masonry container persists, only its children's content changes.

---



## 3. Planned

| # | Animation | Trigger | Severity | Notes |
|---|---|---|---|---|
| 3.2 | Home → Digest Management | Sidebar digest click | 🟡 | Reuse §2.1 tokens. |
| 3.3 | Home → Post Editor | Compose CTA | 🟡 | Two directions to prototype: full-screen push vs slide-up drawer. |
| 3.4 | Digest card → Digest detail | Click digest card on Home | 🟡 | Reuse §2.1 tokens. |
| 3.5 | Toast | Like, save, share, post events | 🟢 | Slide up from bottom-right + fade. `--dur-fast` to `--dur-rail`. |
| 3.6 | Loading / skeleton | Data fetch | 🟢 | No aggressive shimmer — match editorial tone. |
| 3.7 | Empty / error / 404 | Empty state, error, 404 | 🟢 | One decisive flourish, not multiple. |

---

## 4. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

Replace animated state changes with instant ones. Don't fake zero-duration transitions on `visibility` — it still interpolates and breaks pointer events.

Auth modal (§2.8) reduced-motion specifics: stagger / horizontal push / scale all collapse to a 220ms opacity fade. Feed refresh (§2.9) skips the fade entirely — content swaps instantly.

---

## 5. Lessons learned (motion gotchas to not repeat)

These come from real bugs found and fixed in `animations/Verita Transition.html`. Read before reaching for similar patterns.

### 5.1 Don't use inline `style` to drive per-element stagger

**What we tried.** First version of §2.9 (post-sign-in feed refresh) wrote `style.transition + style.opacity + style.transform` on every `.card-slot`, with per-card delays computed in JS. A `setTimeout` cleared the inline styles after the longest delay + duration finished.

**What broke.**
1. **Cursor inconsistency.** Inline `transform: translateY(0)` (even though visually `0`) creates a new stacking context and containing block. After cleanup ran, residual inline styles on some slots (cleanup timing was estimated, not event-driven) made cursor inheritance differ across cards. Some bullets showed `cursor: text`, others `cursor: default`, others `cursor: pointer`.
2. **Scroll anchor jitter.** Combined with `appendChild` re-ordering (see 5.2), the inline-style transitions during scroll-position-relevant DOM mutation broke browser scroll anchoring on some viewports.

**The fix.** Switched to a single `.masonry.refreshing` class toggling `opacity` via CSS — no inline styles, no per-element bookkeeping, no cleanup. If you ever need per-element stagger again, drive it via CSS `animation-delay` set in CSS (not inline), and clean up by removing a class — never by clearing inline styles with a `setTimeout`. If `transitionend` is unavoidable, listen on the *last* element only.

### 5.2 Don't `appendChild` to "re-order" elements that are already in the right order

**What we tried.** `_personalizeFeed` ran `order.forEach(s => masonry.appendChild(s))` to put digest / mech-interp / alignment first — even when they were already first.

**What broke.** `appendChild` on an already-attached node detaches and re-attaches it. This:
- Triggers grid layout recalc and scroll anchor reset.
- Resets each card's hover/focus state tracking — in Chromium, this leaves elements in a half-resolved hover state until the user moves the mouse, with cursor stuck at the pre-mutation value.
- Combined with 5.1, produced "cursor varies by card" + "scroll feels jumpy after sign-in".

**The fix.** Removed the reorder entirely — the static HTML already has the right order. If a real reorder is ever needed, do it in a single `documentFragment` swap, not per-element `appendChild`, and only when the order is actually different.

### 5.3 Modal close ≠ modal stops capturing pointer events

**What we tried.** `.auth-modal-backdrop:not(.open)` had `pointer-events: none` and `opacity: 0`. We assumed that was enough to "deactivate" the modal.

**What broke.** Form controls (`<input>`, `<button>`, `<a>`) inside the modal have **default `pointer-events: auto`** in browser UA stylesheets, which **overrides the inherited `none`** from the parent. Even though the modal was visually invisible (opacity:0), the email/password input boxes at screen-center were still capturing cursor events — showing `cursor: text` (input default) at exact pixel positions matching the input layout. Because the modal was 380px centered, this aligned with the digest card on the home view, producing the visible "I-beam over digest bullet rows" bug.

`.auth-success` (the success overlay) had the same problem: it explicitly set `pointer-events: all` when `.show`, and the cleanup was scheduled 200ms after close — long enough to see the bug.

**The fix.** A blanket rule:

```css
.auth-modal-backdrop:not(.open),
.auth-modal-backdrop:not(.open) * { pointer-events: none !important }
```

Plus removed `pointer-events: all` from `.auth-success.show` — the success overlay is purely visual and never needs to capture events.

**General rule.** Any modal / overlay that contains form controls or focusable elements must use the universal-descendant `pointer-events: none` selector when closed. Inherited `none` is not enough. The same applies to React: even `<Dialog>` libraries that use `display: none` are safe, but the moment you transition opacity / transform with the element still in the DOM, you need this defense.

### 5.4 Always test cursor / hover / scroll after a state-driven content swap

**What we missed.** The post-sign-in feed refresh visibly worked — feed faded out, content changed, feed faded back. But the user reported persistent issues: cursor I-beam in some places, "Read full digest" CTA not lighting up on hover, scroll feeling jumpy. None of these are visible from the design alone — they only show up with a mouse on the page.

**The check.** After any animation that mutates content or rewrites styles, test:
- Cursor is consistent across the entire mutated region.
- `:hover` states still trigger on all interactive children.
- Scrolling on the mutated region behaves the same as before the mutation.
- Tab navigation lands on the same elements as before.

If any of these regress, the animation has a side-effect on stacking, pointer events, or DOM stability — see 5.1, 5.2, 5.3.

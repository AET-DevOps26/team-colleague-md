# Animation Design Demo Plan

**Purpose.** This package is a working library of animation prototypes for Verita. Each file is a small, openable HTML demo that specifies one interaction (component) or one page-level choreography (page), in production-faithful HTML/CSS/JS, so motion can be reviewed in the browser and ported 1:1 into the React codebase. The library is the source of truth for motion, easings, durations, and choreography decisions.

---

## Architecture (Pattern C — Hybrid)

We use a **two-layer hybrid structure**, the same model used by mature design systems (Material, Carbon, Polaris):

- **Component demos** define **reusable interaction specs**. Each file isolates one UI primitive (modal, toast, card, tooltip, …) and exhausts its states, variants, and motion. These are what a React component or hook implements directly.
- **Page demos** define **choreography**: how multiple components compose on a real screen and how transitions sequence between them. They consume component specs rather than redefine them.

The component layer is the source of truth for motion. The page layer demonstrates composition and timing relationships. When in doubt, motion details belong to the component file; sequencing belongs to the page file.

---

## File tree

```
animations/
├── Plan.md                       # this file
├── Plan.zh.md                    # legacy Chinese plan (superseded)
├── 00 Index.html                 # entry index for the library
├── Verita Transition.html        # master integration demo (kept as-is)
├── components/
│   ├── 01 Buttons & Links.html
│   ├── 02 Form Fields & Validation.html
│   ├── 03 Modals & Dialogs.html
│   ├── 04 Toasts & Notifications.html
│   ├── 05 Cards & Hover.html
│   ├── 06 Tags & Filters.html
│   ├── 07 Tooltips & Popovers.html
│   ├── 08 Skeletons & Loading.html
│   ├── 09 Comments & Threads.html
│   ├── 10 Avatars & Identity.html
│   ├── 11 Reduced Motion & A11y.html
│   ├── 12 Post Detail Action Bar.html
│   └── 13 Focus & Keyboard.html       # placeholder — not yet built
└── pages/
    ├── 01 Home.html
    ├── 02 Post Detail.html
    ├── 03 Search.html
    ├── 04 User Profile.html
    ├── 05 Post Editor.html
    ├── 06 Digest Management.html
    ├── 07 Digest Post.html
    ├── 08 Admin.html
    ├── 09 404 & Errors.html
    └── 10 Auth & Sign-in Flow.html

../tokens/
└── tokens.css                    # shared design tokens (colors, fonts, motion)
```

---

## Component demos (13)

### C01 — Buttons & Links
- **File:** `components/01 Buttons & Links.html`
- **Scope:** All clickable primitives — primary/secondary buttons, text links, icon buttons, the floating action button.
- **Animations:**
  - Button hover (background tint, 120ms)
  - Button press (scale 0.97, 80ms in / 160ms out)
  - Disabled state cross-fade
  - Link underline visible at rest, hover/focus enhances thickness + color (160ms)
  - Icon button rotation on toggle
  - FAB hover lift + click spin (used by feed refresh)
- **Consumed by:** `pages/01 Home`, `pages/02 Post Detail`, `pages/05 Post Editor`, almost every page.
- **React hint:** `<Button>`, `<IconButton>`, `<Fab>`, `useButtonInteraction()`.

### C02 — Form Fields & Validation
- **File:** `components/02 Form Fields & Validation.html`
- **Scope:** Text inputs, textareas, password fields, and their validation states.
- **Animations:**
  - Focus ring fade-in (160ms)
  - Floating label translate + scale on focus
  - Error shake (3-cycle, 320ms total)
  - Success tick draw (SVG stroke-dashoffset, 240ms)
  - Password visibility toggle (eye icon morph)
  - Character counter color transition near limit
- **Consumed by:** `pages/05 Post Editor`, `pages/10 Auth & Sign-in Flow`, `pages/08 Admin`.
- **React hint:** `<TextField>`, `<PasswordField>`, `useFieldValidation()`.

### C03 — Modals & Dialogs
- **File:** `components/03 Modals & Dialogs.html`
- **Scope:** Centered dialog patterns, including confirm dialogs and modals with internal panel transitions (e.g., Login ↔ Signup tabs).
- **Animations:**
  - Open: backdrop fade (160ms) + panel scale-in with translateY (180ms)
  - Close: symmetric fade out (160ms), no reverse stagger
  - Internal panel push: 180ms exit + 60ms gap + 220ms enter; stage height transitions over 240ms
  - Confirm dialog variant (~320px wide)
  - Esc key + backdrop click + explicit close as triggers
- **Consumed by:** `pages/10 Auth & Sign-in Flow`, `pages/06 Digest Management`, `pages/08 Admin`, settings.
- **React hint:** `<Modal>`, `<ConfirmDialog>`, `useModalStack()`.

### C04 — Toasts & Notifications
- **File:** `components/04 Toasts & Notifications.html`
- **Scope:** Tinted variant stack (bottom-right) + tinted neutral welcome pill (top-center). Two surfaces, one visual vocabulary.
- **Animations:**
  - Variant stack: slide-in from bottom-right (220ms `--ease-out` / `--ease-ios`), 4000ms auto-dismiss, hover-pause + manual ×, stack max 2 (oldest evicts on overflow)
  - Variants: success / error / warning / info — tinted bg + semantic border + 18px SVG icon (no color flood)
  - Welcome pill: top-center, tinted neutral fill + 1px hairline border, text-only at 14.5px · 14px·26px padding, 240ms slide-in, 3000ms auto-dismiss, no hover-pause
  - Reduced-motion: opacity-only / 120ms linear fallback for both surfaces
- **Consumed by:** `pages/10 Auth & Sign-in Flow` (welcome pill), `pages/05 Post Editor` (autosave variant), `pages/02 Post Detail` (save variant), virtually every page.
- **React hint:** `<Toast>`, `<WelcomePill>`, `<ToastProvider>`, `useToast()`.

### C05 — Cards & Hover
- **File:** `components/05 Cards & Hover.html`
- **Scope:** Article/post card primitives in feed contexts. Three variants: image card, text card (cream pull-quote block), digest card (dark surface).
- **Animations:**
  - Card hover lift (translateY -1px + 220ms cover/cream-block shadow, image + text variants only)
  - Digest CTA arrow shift (translateX 3px, 200ms) + CTA color brighten on link hover
  - Reduced-motion fallback (lift, shadow, arrow shift all collapse; color stays)
- **Out of scope (moved to C12):** like button + bounce, bookmark toggle. Feed cards in production show a static `<span class="likes">`; the like *button* exists only on the post-detail action bar.
- **Out of scope (moved to C13):** card-level focus ring. Master uses inner anchors as tab stops, not the card root — a card-level focus ring would mis-model the a11y contract.
- **Consumed by:** `pages/01 Home`, `pages/02 Post Detail` (related posts), `pages/04 User Profile`.
- **React hint:** `<PostCard variant="image|text">`, separate `<DigestCard>` component.

### C06 — Tags & Filters
- **File:** `components/06 Tags & Filters.html`
- **Scope:** Tag chips and filter bar interactions.
- **Animations:**
  - Tag chip toggle (filled/outline cross-fade, 160ms)
  - Filter applied state (subtle pill highlight)
  - Count badge increment animation
  - Chip remove (collapse width + fade)
- **Consumed by:** `pages/01 Home`, `pages/03 Search`, `pages/04 User Profile`.
- **React hint:** `<TagChip>`, `<FilterBar>`.

### C07 — Tooltips & Popovers
- **File:** `components/07 Tooltips & Popovers.html`
- **Scope:** Anchored hover/click overlays.
- **Animations:**
  - Tooltip fade-in with 400ms hover delay; fade-out instant
  - Popover scale-in from anchor (180ms)
  - Dismiss on outside click or Esc
  - Arrow positioning across anchor edges
- **Consumed by:** `pages/01 Home` (sidebar collapsed labels), `pages/08 Admin` (action hints).
- **React hint:** `<Tooltip>`, `<Popover>`, `useFloating()`.

### C08 — Skeletons & Loading
- **File:** `components/08 Skeletons & Loading.html`
- **Scope:** Loading affordances across the product.
- **Animations:**
  - Skeleton shimmer (linear-gradient sweep, 1.4s loop)
  - Spinner rotation
  - Determinate progress bar fill
  - Pull-to-refresh on mobile feed
- **Consumed by:** `pages/01 Home`, `pages/03 Search`, `pages/02 Post Detail`.
- **React hint:** `<Skeleton>`, `<Spinner>`, `<ProgressBar>`.

### C09 — Comments & Threads
- **File:** `components/09 Comments & Threads.html`
- **Scope:** Threaded comment list interactions.
- **Animations:**
  - Comment list stagger on initial load (40ms per item)
  - Reply expand (height auto-transition, 240ms)
  - "Show more replies" expand
  - New comment submit (slide-in from input)
  - Like-on-comment (smaller variant of card like bounce)
- **Consumed by:** `pages/02 Post Detail`.
- **React hint:** `<CommentList>`, `<CommentThread>`, `<ReplyComposer>`.

### C10 — Avatars & Identity
- **File:** `components/10 Avatars & Identity.html`
- **Scope:** Avatar primitive and identity-related affordances.
- **Animations:**
  - Avatar morph (sign-in button → avatar bubble after auth)
  - Follow toggle (text + width transition)
  - Online presence indicator pulse
  - Notification badge count increment
- **Consumed by:** `pages/10 Auth & Sign-in Flow`, `pages/04 User Profile`, top-bar everywhere.
- **React hint:** `<Avatar>`, `<FollowButton>`, `<PresenceDot>`.

### C11 — Reduced Motion & A11y
- **File:** `components/11 Reduced Motion & A11y.html`
- **Scope:** Accessibility considerations across all motion.
- **Animations:**
  - `prefers-reduced-motion` fallbacks for each major pattern
  - Visible focus order across key flows
  - Screen-reader-friendly transitions (aria-live, role announcements)
  - Motion-free alternatives that still convey state change
- **Consumed by:** all pages (governance demo, not directly composed).
- **React hint:** `useReducedMotion()`, `<VisuallyHidden>`, motion utility wrappers.

### C12 — Post Detail Action Bar
- **File:** `components/12 Post Detail Action Bar.html`
- **Scope:** The floating `.actions-pill` at the bottom of the post-detail page. Four affordances: comments (jump), like (toggle + bounce), bookmark (toggle, no animation), share (copy + toast).
- **Animations:**
  - Like bounce (scale 1 → 1.25 → 0.92 → 1, 320ms spring `cubic-bezier(0.34, 1.56, 0.64, 1)`) — fires only on `liked: false → true`, never on toggle-off, never on count tick
  - Like color/fill swap (120ms ease-out) — `--text-secondary` → `--text-primary` + heart fill
  - Bookmark color/fill swap (120ms ease-out) — **no scale animation** (master-faithful)
  - Share confirmation toast (200ms in/out, 1800ms visible) — bottom-centered ink pill
  - Hover (120ms ease-out) on every `.cact` — `--bg-elevated` background + `--text-primary` color
  - Reduced-motion fallback (bounce off; toast keeps fade but no slide)
- **Why this exists separately from C05:** the production feed cards in C05 show a static `<span class="likes">` — there is no like button on a feed card. The like *button*, where the bounce animation can actually fire, exists exclusively on this surface. Splitting it from C05 keeps C05 focused on feed-card hover and gives the action bar a proper home with all four of its affordances treated together.
- **Consumed by:** `pages/02 Post Detail`.
- **React hint:** `<ActionsPill>`, `<LikeButton>`, `<BookmarkButton>`, `<ShareButton>`.

### C13 — Focus & Keyboard
- **File:** `components/13 Focus & Keyboard.html` _(placeholder — not yet built)_
- **Scope:** Canonical focus-ring treatment across input, button, link, card, and modal contexts; keyboard navigation primitives (skip links, focus trap, arrow-key roving tabindex inside toolbars / radio groups).
- **Animations:**
  - `:focus-visible` ring fade-in (160ms ease-out, opacity + outline-color)
  - Skip-link reveal on focus
  - Focus trap entry/exit (modal, drawer, dialog) — paired with C03's open/close motion
  - Roving-tabindex navigation inside `.actions-pill` (referenced by C12)
- **Why this exists:** an early C05 draft attempted a card-level focus ring with `tabindex=0` on the article root. That mis-models Verita's a11y contract — the production cards rely on inner anchors (cover link, author link, tag link) as independent tab stops. C13 is the right home for any card-or-other focus treatment, and will define what is canonical (per-context, not per-card) when built.
- **Consumed by:** all pages and components (governance demo).
- **React hint:** `useFocusVisible()`, `<FocusTrap>`, `<SkipLink>`, `useRovingTabIndex()`.

---

## Page demos (10)

### P01 — Home
- **File:** `pages/01 Home.html`
- **Scope:** Logged-in feed home.
- **Choreography:** Sidebar rail collapse/expand (320ms), topbar shadow on scroll, masonry feed refresh fade, FAB spin on refresh, greeting/hero entry, tag filter row sticky behavior.
- **Components composed:** C01 (FAB), C05 (cards), C06 (tags), C07 (sidebar tooltips), C08 (loading).

### P02 — Post Detail
- **File:** `pages/02 Post Detail.html`
- **Scope:** Reading view for a single post.
- **Choreography:** Push entry transition from Home, reading progress bar, AI summary panel expand, comments section reveal, sticky engagement bar, related posts at end, back transition.
- **Components composed:** C01, C05 (related), C09 (comments), C10 (author avatar), C04 (save toast).

### P03 — Search
- **File:** `pages/03 Search.html`
- **Scope:** Search overlay invoked from anywhere.
- **Choreography:** Overlay open (backdrop fade + panel slide), push mode that displaces home content, input auto-focus, result stagger, return-to-home reverse.
- **Components composed:** C02 (input), C05 (result cards), C06 (filter chips), C08 (loading).

### P04 — User Profile
- **File:** `pages/04 User Profile.html`
- **Scope:** Public profile view.
- **Choreography:** Avatar push transition from any avatar in the product, profile header reveal, tab slide between Posts/Replies/Likes, follow flow with optimistic update.
- **Components composed:** C10 (avatar, follow), C05 (post cards), C06 (tabs as filters).

### P05 — Post Editor
- **File:** `pages/05 Post Editor.html`
- **Scope:** Composing a new post.
- **Choreography:** Editor drawer open from FAB, AI assist panel toggle, autosave indicator pulse, publish flow with progress, focus mode that dims chrome.
- **Components composed:** C01, C02 (fields), C04 (autosave toast), C08 (publish progress).

### P06 — Digest Management
- **File:** `pages/06 Digest Management.html`
- **Scope:** Managing digest collections.
- **Choreography:** FLIP entry for the grid, drag-reorder with placeholder, delete collapse, rename inline edit transition.
- **Components composed:** C01, C02 (rename field), C03 (delete confirm).

### P07 — Digest Post
- **File:** `pages/07 Digest Post.html`
- **Scope:** Reading a digest as a sequence of posts.
- **Choreography:** Cross-post swipe (horizontal page transition), per-post reading progress sync, "all caught up" celebration on completion.
- **Components composed:** C01, C08 (progress), C04 (completion toast).

### P08 — Admin
- **File:** `pages/08 Admin.html`
- **Scope:** Admin tables and controls.
- **Choreography:** Table row filter (FLIP), confirm modals on destructive actions, inline edit row morph, bulk-select state.
- **Components composed:** C02, C03 (confirm), C07 (action tooltips).

### P09 — 404 & Errors
- **File:** `pages/09 404 & Errors.html`
- **Scope:** Error and empty states.
- **Choreography:** 404 page entry (illustration + copy stagger), empty-state placeholders, error banner slide-in.
- **Components composed:** C01, C04 (error toast).

### P10 — Auth & Sign-in Flow
- **File:** `pages/10 Auth & Sign-in Flow.html`
- **Scope:** The full sign-in choreography — the existing master demo, decomposed.
- **Choreography:** Modal open → submit → parallel: modal close + avatar morph + sidebar nav-item disappear + welcome toast + masonry feed refresh. This is the most complex sequenced transition in the product.
- **Components composed:** C03 (modal + internal panels), C10 (avatar morph), C04 (welcome toast), composes against `pages/01 Home`.

---

## Migration map

Where each animation in the current `animations/Verita Transition.html` lands:

| Current animation in `Verita Transition.html` | New home |
| --- | --- |
| Auth modal CSS/HTML/JS | `components/03 Modals & Dialogs` + `pages/10 Auth & Sign-in Flow` |
| Sidebar rail collapse/expand | `pages/01 Home` |
| Settings modal | `components/03 Modals & Dialogs` |
| Search overlay (overlay + push modes) | `pages/03 Search` |
| Home → Post Detail push transition | `pages/02 Post Detail` |
| Post Detail back transition | `pages/02 Post Detail` |
| Reading progress bar | `pages/02 Post Detail` |
| AI summary panel expand | `pages/02 Post Detail` |
| Avatar morph (sign-in button → avatar) | `components/10 Avatars & Identity` |
| Welcome toast | `components/04 Toasts & Notifications` (redesigned as tinted neutral pill — master's ink-fill version retired) |
| Masonry feed refresh fade (route B) | `pages/01 Home` (referenced from `pages/10 Auth & Sign-in Flow`) |
| Card hover (image / text / digest variants) | `components/05 Cards & Hover` |
| Like bounce, bookmark toggle, share toast | `components/12 Post Detail Action Bar` |
| Tag filter chip animation | `components/06 Tags & Filters` |
| Refresh FAB spin | `components/01 Buttons & Links` (consumed in `pages/01 Home`) |
| Topbar scroll shadow | `pages/01 Home` |

`Verita Transition.html` itself stays in place as the master integration demo — the one place where all the above run end-to-end against a real screen.

---

## Build approach

1. **Placeholders first.** Every file in the tree lands as a real, openable HTML page that names the animations it will host but contains no implementation. This makes the index navigable on day one and surfaces missing scope.
2. **Fill detail file-by-file.** Components first (they are the source of truth), then pages (which consume them).
3. **Component layer is canonical.** Page demos must not redefine motion that exists in a component file; they import (in spirit) and orchestrate.
4. **Verify in `Verita Transition.html`.** When a component is extracted from the master demo, the master demo continues to work and stays in sync.

---

## Maintenance rules

- **Show, don't shrink.** The primary purpose of each demo is to display the real production styles and motion. Never strip, simplify, or replace actual UI markup (form fields, toggles, controls, layout) just to reduce file size. If the master implementation has a multi-control settings body, the demo shows that same body. Compression is allowed only on demo-only chrome (explanatory paragraphs, redundant captions), never on the styled artifact itself.
- File length is a **soft guideline (~600 lines)**, not a hard cap. If faithful display of the real component pushes past it, that is acceptable. Split a file only when it covers genuinely separable components, not to hit a line count.
- Each demo is **independently openable** in a browser with no build step.
- Each demo links to **`../tokens/tokens.css`** (relative `../../tokens/tokens.css` from inside `components/` or `pages/`). Do not redeclare tokens in-file.
- Each file begins with a top-of-file comment containing:
  - **Scope** — one sentence
  - **Spec** — section reference in `docs/Animation Spec.md`
  - **React hint** — component or hook name(s) this demo maps to
- All visible text is English. No emoji. Editorial-minimal aesthetic only.

---

## Demo chrome template (mandatory for every C## / P## file)

Every component and page demo must use the **same chrome** so they read as one library. C03 — Modals & Dialogs is the canonical reference; C04 — Toasts & Notifications is the second file conformed to it. Do not invent alternate header bars, alternate wordmark sizings, or alternate body containers.

### Required structure

```html
<body>

<!-- 1. tokens.css fixed bar — top, 44px, blurred white, exactly this markup -->
<div class="demo-header">
  <span class="demo-title">C0X · Component Name</span>
  <span class="demo-spec">Short list · of · animations · in · this · demo</span>
  <a class="demo-back" href="../00 Index.html">← Back to Index</a>
</div>

<!-- 2. Stage + content wrap -->
<div class="demo-stage">
<div class="wrap">

  <!-- 3. Lead block — wordmark, h1, scope-list, status badge -->
  <div class="lead-block">
    <div class="wordmark"><span class="lead">V</span>erita</div>
    <h1>Component Name</h1>
    <ul class="scope-list">
      <li>One bullet per scope item …</li>
    </ul>
    <span class="status live">Status · Live</span>
  </div>

  <!-- 4. Spec table -->
  <section>
    <h2>Spec</h2>
    <table class="spec"> … </table>
  </section>

  <!-- 5. One <section class="divided"> per variant. Each contains:
       <h2>, <dl class="section-meta">, <div class="triggers">, optional <p class="hint"> -->

  <!-- 6. React hint footer -->
  <div class="react-hint"> … </div>

</div>
</div>

<!-- 7. Modal / overlay / portal markup goes after .demo-stage closes -->

<script> … </script>

</body>
```

### Required style block (copy verbatim into every demo)

The CSS block in C03 / C04 between `/* ---------- Demo chrome … */` and the component-specific section is the **canonical demo-chrome stylesheet**. It defines: `body`, `.demo-stage`, `.wrap`, `.lead-block`, `.wordmark` (+ `.wordmark .lead`), `h1`, `.scope`, `.status` / `.status.live`, `section` / `section.divided`, `h2`, `section > p`, `table.spec` (+ `thead th`, `tbody td` variants), `ul.scope-list`, `.section-meta` (+ `dt`, `dd`, `dd code`), `.triggers`, `.trigger` (+ `:hover`, `:active`, `.primary`), `.hint` (+ `code`), `.react-hint` (+ `h3`, `dl`, `dt`, `dd`, `code`).

Copy this block into every new demo unchanged. Component-specific styles go **below** it under their own `/* ===== COMPONENT NAME ===== */` banner. Do not redefine any of the chrome selectors with different values.

### Section paragraph width — full `.wrap`, no `max-width`

Both `section > p` (the descriptive lead paragraph at the top of each section) and `.hint` (the small explanatory note below a `.triggers` row) **must run the full width of `.wrap` (880px)** — do not constrain them with `max-width: 60ch` or any other width cap. Earlier versions of the chrome capped them at 60ch for editorial readability, but in practice that produced odd two-line wraps on technical lines like _"Two image cards from the logged-in feed. The cover SVGs are real …"_ where the text would break mid-sentence well before the right edge of the page, leaving a ragged column with the rest of the demo content. The chrome is for technical demos, not magazine prose; let the lines run.

Required values:

```css
section > p {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.55;
  margin: 0 0 18px;
  /* no max-width */
}

.hint {
  font-size: 12.5px;
  color: var(--text-tertiary);
  margin-top: 14px;
  line-height: 1.55;
  max-width: none;        /* explicit to override any inherited cap */
}
```

The `max-width: none` on `.hint` is belt-and-braces — `section > p` no longer caps width, but the explicit `none` keeps the rule self-documenting and survives any future ancestor that might re-introduce a cap.

### Wordmark — single canonical form

Exactly this markup, exactly this CSS. Do not write `V · VERITA`, do not uppercase, do not use a separator dot, do not change font sizes:

```html
<div class="wordmark"><span class="lead">V</span>erita</div>
```

```css
.wordmark { font-family: var(--font-serif); font-style: italic; font-size: 24px; color: var(--text-secondary); line-height: 1; }
.wordmark .lead { font-size: 28px; font-weight: 600; color: var(--text-primary); }
```

(The `.auth-wordmark` inside the auth modal is a separate, larger variant — leave that alone; it is the modal's internal wordmark, not the page-level one.)

### Button hierarchy — `.trigger` vs `.trigger.primary`

Every demo button uses the same two-tier system:

- `.trigger` — white surface, ink text, hairline border. Default for any trigger.
- `.trigger.primary` — ink fill, white text, no border. Reserved for **the most representative demo of its section**.

Rules:

1. Each `<section class="divided">` has **at most one** `.trigger.primary` — the eye should land on one button per section.
2. **Parallel-semantic groups stay all-`.trigger`.** When a row of buttons enumerates equivalent options (e.g. C04's 4 variant triggers — success / error / warning / info), do not promote one of them. They are peers; making one primary lies about the hierarchy.
3. **Modal-internal buttons are not `.trigger`.** Inside a modal footer / action row, use `.btn-text` (no fill) and `.btn-danger` (red, destructive) — those are the semantic dialog buttons, not demo triggers.

When in doubt: if a section has one demo that "shows the concept" and several supporting variants, the showcase is `.trigger.primary` and the rest are `.trigger`. C03's Auth section (Log in is primary; Sign up / Forgot / Trigger error shake are plain) and C04's Stack section (Push 3 is primary; Hover-pause demo / Dismiss all are plain) are the canonical examples.

### Header bar — always present

Every C## / P## demo file must render the `.demo-header` fixed bar. Without it the page floats with no context and no escape route back to the index. The bar is provided by `tokens.css`; only the three text values (`.demo-title`, `.demo-spec`, the `← Back to Index` link target) change per file.

### Why this matters

C03 and C04 use this exact chrome. Every other demo (19 files at time of writing) must conform when it lands. The chrome being identical is what lets the library read as one document instead of 21 ad-hoc pages — and it is the cheapest invariant to enforce because no demo's real content lives inside it.

When extracting a new demo from `Verita Transition.html`, **first** paste this chrome scaffold, **then** fill the component-specific markup, scripts, and styles below it. Do not start from a blank page.

---

## Status

| Demo | File | Status |
| --- | --- | --- |
| C01 Buttons & Links | `components/01 Buttons & Links.html` | Live |
| C02 Form Fields & Validation | `components/02 Form Fields & Validation.html` | Live |
| C03 Modals & Dialogs | `components/03 Modals & Dialogs.html` | Live |
| C04 Toasts & Notifications | `components/04 Toasts & Notifications.html` | Live |
| C05 Cards & Hover | `components/05 Cards & Hover.html` | Live |
| C06 Tags & Filters | `components/06 Tags & Filters.html` | Live |
| C07 Tooltips & Popovers | `components/07 Tooltips & Popovers.html` | Live |
| C08 Skeletons & Loading | `components/08 Skeletons & Loading.html` | Live |
| C09 Comments & Threads | `components/09 Comments & Threads.html` | Live |
| C10 Avatars & Identity | `components/10 Avatars & Identity.html` | Live |
| C11 Reduced Motion & A11y | `components/11 Reduced Motion & A11y.html` | Live |
| C12 Post Detail Action Bar | `components/12 Post Detail Action Bar.html` | Live |
| C13 Focus & Keyboard | `components/13 Focus & Keyboard.html` | Live |
| P01 Home | `pages/01 Home.html` | Live |
| P02 Post Detail | `pages/02 Post Detail.html` | Live |
| P03 Search | `pages/03 Search.html` | Live |
| P04 User Profile | `pages/04 User Profile.html` | Live |
| P05 Post Editor | `pages/05 Post Editor.html` | Live |
| P06 Digest Management | `pages/06 Digest Management.html` | Live |
| P07 Digest Post | `pages/07 Digest Post.html` | Live |
| P08 Admin | `pages/08 Admin.html` | Live |
| P09 404 & Errors | `pages/09 404 & Errors.html` | Live |
| P10 Auth & Sign-in Flow | `pages/10 Auth & Sign-in Flow.html` | Live |
| Master integration demo | `Verita Transition.html` | Implemented (legacy monolith, source for migration) |

---

## Deviations & follow-ups

Findings discovered while extracting demos from `Verita Transition.html`. These do **not** modify the master demo; they are queued so we can address them when the relevant demo lands or in a later cleanup pass.

### From C01 — Buttons & Links

C01 is split into a **Production tier** (3 sections, all verified 1:1 against `pages/*.html`) and an **Extended tier** (3 sections proposing components production has not codified yet). The split is deliberate — earlier drafts mixed production-fidelity demos with forward-looking proposals, which made it ambiguous which specs the React component should consume verbatim and which were under discussion. A coloured tier badge on every section makes the distinction explicit.

> **Demo simplification (current state).** An earlier C01 draft included verbose `use-case` boxes inside each Extended section ("Use case / Why X / Why N") and a six-row "Inconsistencies observed" audit table at the bottom. Per design feedback those were removed from the demo for being too heavy — the audit findings live below in this file (canonical home), and each Extended section keeps only its `section-meta` dl + a one-line hint. The pattern for C02–C12: keep demos light, push audit / rationale content into Plan.md.

**Production tier — verified 1:1**

- **`.btn-primary` / `.btn-ghost` hover (Section 1).** Sourced 1:1 from `pages/Verita Home.html:206–220`. 120ms `background` literal preserved (not migrated to `--dur-fast (180ms)`) — slowing it makes the surface feel sticky on hover-passes, and the literal is intentional in production. Action: if/when tokens get rationalized, propose a new `--dur-tint (≤120ms)` rather than promoting 120ms into `--dur-fast`.
- **Disabled-state variants (Section 2).** Renders all four production disabled patterns side-by-side: Auth `:disabled` background swap (`pages/Verita Auth.html:148`), Post Editor `[disabled]` opacity 0.35 (`pages/Verita Post Editor.html:246`), Home/Settings `.disabled` opacity 0.38 (`pages/Verita Home.html:77`), and `.btn-primary:disabled` `--bg-elevated` wash. Toggling them in unison is the demo's way of making the inconsistency *visible* — the convergence target (unified `.disabled { opacity: 0.38; pointer-events: none }`) is documented in the Inconsistencies §2 row.
- **Refresh FAB (Section 3).** 1:1 from `pages/Verita Home.html` (`.refresh-fab`) + `animations/Verita Transition.html` (`@keyframes refresh-fab-spin`). 600ms spin uses Material easing `cubic-bezier(0.4, 0, 0.2, 1)` — the only place in the Verita motion vocabulary that deviates from `--ease-out` / `--ease-ios`. Action: do not tokenize as `--ease-spin` unless a second use case appears. Demo wraps the FAB in `.fab-stage` (`position: absolute`) instead of `position: fixed` so it stays in section; React `<Fab>` should accept `position="fixed" | "contained"`.

**Extended tier — proposals**

- **Button press scale (Section 4).** Production has no `:active` button feedback today (only `pages/Verita Post Editor.html` `.publish-btn` uses `translateY(0)` as a return state). Section 4 proposes symmetric 80ms `scale(0.97)` for the unified `<Button>` press contract — declared on a separate `.x-press` modifier so it does not bleed into Section 1's production-fidelity hover demo. Why scale (not translateY): scale reads as inset on flat buttons; translateY implies vertical extrusion the rest of the system doesn't carry. Why 0.97: 1.5–2px of inset at 34px height — larger reads as a phone-app tap, smaller reads as no feedback. Action: confirm with design before this becomes the React contract; when it lands, retire `.publish-btn` since it duplicates the same job in a non-system way.
- **Inline body-copy link (Section 5).** Production has two patterns: nav-style anchors (`text-decoration: none` + hover bg) and Digest Post inline links (`text-decoration: underline` + decoration-color transition). Section 5 proposes a unified `<Link>` for body-copy links: **underline visible at rest** (1px, muted `--border-strong`, 2px offset) → **hover/focus enhances** to 2px thickness, `currentColor`, 3px offset (160ms ease-out). An earlier draft animated `background-size: 0% → 100%` (underline-expand-from-left); rejected because it hid the affordance — users couldn't tell the text was a link until they hovered, which is the opposite of what inline body-copy links need. The expand-from-left motion can return later as a separate Extended section for *footer / nav-style* links where surrounding chrome already signals clickability. Migration is additive — drop `.v-link` on existing inline anchors and remove the page-local decoration rules.
- **Icon button (Section 6).** Production has no shared `<IconButton>` — Post Editor toolbar (30px), Post Detail action-bar (`.cact`, owned by C12), sidebar collapse chevrons each invent their own style. Section 6 proposes 32px as the unified contract (between toolbar 30px and action-bar 36px) with two toggle grammars: `is-on` rotates SVG 180° (chevron variant — for sidebar / accordion / disclosure) and `toggle-fill.is-on` swaps stroke→fill + accent color (for like / bookmark / save). The like-button **bounce** (320ms `1 → 1.25 → 0.92 → 1` spring) is *not* part of the toggle contract — it lives in C12's action-bar choreography; feed cards remain static `<span class="likes">` per C05. Action: when `<IconButton toggle="fill">` lands, expose `bounceOnTrue` as a separate prop the action-bar consumer opts into.

**Inconsistencies observed (audit, surfaced from full `pages/*.html` scan)**

C01's Inconsistencies table documents five drift findings discovered during the page-scan that informed the Production / Extended split. None block C01 from shipping; they are a punch list for a future "button consistency" pass:

1. **`.btn-primary` drift (high).** Three different heights observed (Home / Settings 34px, Digest Post / Admin 36px, 404 padding-only) and two border-radius values (7px vs 8px). Convergence target: 34px / 7px (most-used Home / Settings instance).
2. **Disabled state — 3 mechanisms (high).** `:disabled` (Auth CTA, Home `.btn-primary`), `[disabled]` (Post Editor toolbar), and `.disabled` class (Home / Settings / Search nav items) all coexist with different opacity values (0.35 vs 0.38) and visual approaches (opacity vs background swap). Convergence target: `.disabled { opacity: 0.38; pointer-events: none }`.
3. **Link styles — dual treatment (medium).** Nav-style anchors (`text-decoration: none` + hover bg) coexist with Digest Post inline links (`text-decoration: underline`). Convergence target: Section 5's `<Link>` (Extended).
4. **No button press feedback (medium).** Avatar / card hovers carry `translateY(-1px)`; no buttons have `:active` visuals except `.publish-btn`. Convergence target: Section 4's `scale(0.97)` (Extended).
5. **Hardcoded duration literals (low).** `--dur-fast (180ms)` and `--dur-base (220ms)` exist as tokens but no production button references them — buttons all use literal 120ms, avatars 160ms, sidebars 200ms, card shadows 220ms. Decision needed: rename tokens to match observed values, or migrate buttons to existing tokens.

**Why this matters for C02–C12.** When future demos surface drift in their domain (forms, modals, comments, etc.), they should follow the same Production / Extended / Inconsistencies pattern. The audit is part of the demo's deliverable, not a separate document.

### From C02 — Form Fields & Validation

C02 follows the C01 split: a **Production tier** (7 sections, all sourced 1:1 from `pages/*.html`) and an **Extended tier** (5 sections proposing animation behavior production has not codified). The production scan covered five distinct field families across five page files (`pages/Verita Auth.html`, `pages/Verita Post Editor.html`, `pages/Verita Home.html`, `pages/Verita Admin.html`, `pages/Verita Search Results.html`); each one specifies its own height, radius, focus-ring width, and focus-bg behavior. The Extended tier is where the unified `<TextField>` contract lives.

**Production tier — verified 1:1**

- **Auth `.field-box` (Section 1, primary).** Sourced 1:1 from `pages/Verita Auth.html:126–139`. 44px height, 8px radius, `--bg-elevated` background, 1px `--border-default`, `transition: border-color 120ms`, `.error` modifier flips border to `--danger`. The trailing `.field-eye` (password visibility toggle) is structurally part of this field and is demoed inline. The 120ms literal is intentional and preserved — same rationale as C01: slowing it makes focus feel sticky.
- **Topbar `.search` (Section 2).** Sourced 1:1 from `pages/Verita Home.html:109–118`. 44px height, 10px radius, `--bg-elevated` rest → `#fff` on focus, 4px focus shadow `rgba(10,10,10,0.06)`. The 4px ring is the widest of any production field; see Inconsistencies §2.
- **`.meta-input` (Section 3).** Sourced 1:1 from `pages/Verita Post Editor.html:278–286`. 38px height, 8px radius, 3px focus shadow, focus flips bg to `#fff`. Used for "Subtitle" / "Tags" / similar metadata strips in the post editor.
- **Title + body textarea (Section 4).** Sourced 1:1 from `pages/Verita Post Editor.html:188–200`. Both are borderless: `.title-input` is a 36px+ italic serif autosizing textarea, `.ed-textarea` is a 16px sans body. They have no focus ring and no border at all — the absence of chrome is the spec.
- **Inline modal field (Section 5).** Sourced 1:1 from `pages/Verita Post Editor.html:335–343`. 36px height, 7px radius, 3px focus shadow, **no** bg flip. The "no bg flip" is what makes it visually distinct from `.meta-input` despite similar dimensions — it stays on the modal's white surface throughout focus.
- **Admin `.search-input` (Section 6).** Sourced 1:1 from `pages/Verita Admin.html:204–212`. 34px height, 8px radius, 3px focus shadow, bg flip. The shortest field in the system.
- **Disabled-state recap (Section 7).** Cross-references C01 §2 — fields inherit the same disabled-state drift as buttons (`:disabled`, `[disabled]`, `.disabled` class, with opacity 0.35 vs 0.38). C02 does not re-litigate the convergence target; it shows that fields participate in the same audit.

**Extended tier — proposals**

- **Floating label (Section 8).** Production has no floating label anywhere — every field uses a static `<label>` above the input or no label at all (search). Section 8 proposes a `translateY(-18px) scale(0.85)` transform on focus or filled-state, 160ms `--ease-out`. The label color shifts to `--text-secondary` when raised. Action: confirm with design before this becomes the React `<TextField>` default; the current static-label pattern is acceptable but doesn't communicate which field has focus when the user is mid-tab.
- **Error shake (Section 9, primary).** Field-level shake on submit-with-invalid, 320ms 5-keyframe symmetric decay (`±6px → ±4px → 0`). Sequenced: shake fires first, error message reveals 320ms later (after shake completes). This is the **right home for field-level shake** — C03's deviation noted that `.auth-modal.shake` (modal-level shake) is unreachable in master. Field-level shake at the failed input is more legible than rocking the entire modal; it lets the user see *which* field is wrong. Action: when `<AuthModal onSubmitError={...}>` lands, route field-level shake here, not at the modal root.
- **Success tick (Section 10).** SVG stroke-dashoffset draw, 240ms `--ease-out`. Fires on async-validation pass (e.g. unique-username check). The tick lives in the trailing-icon slot — the same slot the password eye uses, so a field can have at most one trailing icon at a time.
- **Password eye morph (Section 11).** Cross-fade between two SVG glyphs (eye / eye-with-slash), 180ms. Replaces master's instant swap. The morph is a soft visual cue that the field's content visibility just changed — without it the eye click feels like a typo.
- **Character counter (Section 12).** 240ms color shift through three thresholds: neutral (`--text-tertiary`) below 80% of limit, warning (`--warning`) at 80–100%, danger (`--danger`) at ≥100%. The transition smooths the threshold crossings so the user notices the color change. Action: pair with `<Textarea maxLength={n} showCounter />` — counter is opt-in per field, not a global default.

**Inconsistencies observed (audit, surfaced from full `pages/*.html` scan)**

C02's audit found five drift findings across the production form-field families. None block C02 from shipping; they are a punch list for a future "field consistency" pass:

1. **Field heights — 5 different values (high).** `.search-input` 34px, `.meta-input` / `.modal-field input` 36–38px, topbar `.search` 44px, Auth `.field-box` 44px. Convergence target: 40px (between admin's 34px and auth's 44px) for the unified `<TextField>`, with `<TextField size="sm|md|lg">` for the search/admin/auth split.
2. **Focus-ring width — 3px vs 4px (medium).** Topbar `.search` uses a 4px shadow; everything else uses 3px. Convergence target: 3px (the more common value), with the topbar moving down on the next pass through Home.
3. **Bg-flip-on-focus — inconsistent (medium).** `.meta-input` / `.search-input` / `.search` flip bg from `--bg-elevated` to `#fff` on focus; `.modal-field input` and Auth `.field-box` do not. The split tracks surface context — fields on a tinted page surface flip to white to feel "active"; fields already on a white surface (modals) don't need to. Convergence target: keep the split, but encode it as a `flipOnFocus` prop driven by surface context, not as ad-hoc per-field CSS.
4. **No `--dur-*` token references (low).** Every field uses literal `120ms` durations and `rgba(10,10,10,0.06)` shadow color. None reference `--dur-fast (180ms)` or any motion token. Same finding as C01 §5 — decision needed: rename tokens to match observed values, or migrate fields to existing tokens.
5. **Error message reveal — undefined in master (medium).** Master's `.field-error` has display rules but no documented enter motion. C02's Extended tier defines: shake first (320ms), then message fade-up (180ms `translateY(-2px) → 0`). Convergence target: encode this sequence in `useFieldValidation()` so every field error reveals identically.

### From C03 — Modals & Dialogs

- **Shake style is unreachable in master.** `.auth-modal.shake` and `@keyframes auth-shake` are defined (Verita Transition.html:923–930), but no JS path in the master demo applies the `.shake` class. The C03 demo wires a `triggerAuthShake()` button to expose the animation. Action: when the auth modal lands in React, plumb shake through `<AuthModal onSubmitError={...}>` so submit failures actually use this style.
- **Hardcoded motion literals.** Both modal systems use literal `160ms ease-out` / `120ms ease-out` values rather than the existing `--dur-fast` / `--ease-out` tokens (Verita Transition.html:786, 796, 808, etc.). The C03 demo preserves the literals for fidelity. Action: token-ize on the next pass through `Verita Transition.html`, then propagate to C03.
- **Confirm dialog had no implementation in master.** Plan listed a confirm-dialog variant but Verita Transition.html had no markup or JS for it. C03 introduces the first implementation: 320px `.modal--narrow` panel reusing the existing `.modal-backdrop` motion, with `.btn-text` / `.btn-danger` action-row buttons. Action: confirm with design that the 320px width and 7px button radius are correct before page demos (P06 Digest Management, P08 Admin) consume it.
- **Settings modal `.modal-body` uses `padding:0 0 8px`.** That puts the section content flush to the panel edges and relies on inner sections to provide their own padding. C03 inlined a simpler `padding:20px` body since it does not embed the full settings content. Action: when migrating settings into its eventual page demo, restore the original padding model.

### From C04 — Toasts & Notifications

C04 is the **canonical toast spec** for Verita going forward; it intentionally extends what the master demo (`Verita Transition.html`) ships. The deviations below are accepted design — they describe the gap between master's legacy implementation and the spec the React component should target.

- **C04 = single tinted variant system + aligned welcome pill.** Bottom-right hosts a tinted-bg stack with 4 semantic variants (success / error / warning / info), stack max 2, hover-pause, manual ×, 4000ms lifetime. Top-center hosts a tinted neutral pill, text-only at 14.5px / 14px·26px padding (3000ms, no hover-pause). The two surfaces share one visual vocabulary (tinted bg, ink text, ~0.18–0.2 shadow) but live on different surfaces — pill shape + top-center anchor + larger size for greetings, rectangular card + bottom-right column + semantic icon for system reactions. Master's bottom-right accent-fill singleton is replaced by `showToast({variant:'success', …})`; master's ink-fill welcome pill was retired in favor of the tinted version.
- **Stack max is 2, not 3.** Caps visual weight in the 880px doc — single-fire reads like a clean singleton, 2-deep only kicks in when actions land in the same window. Stack uses bottom-right column, oldest at top, newest at bottom, eviction with leave animation.
- **Welcome pill aligned to toast vocabulary, not split from it.** Original ink-fill black pill overpowered the page and read more like an OS Live Activity than a product greeting. Current treatment: `--bg-surface` fill + `--border-default` 1px hairline + ink text at 14.5px · 14px·26px padding + `0.2` shadow + z-index 80 (one tier above the stack at 60). Text-only — no icon, since differentiation already comes from shape (pill vs card), position (top-center vs bottom-right), and size (welcome ≥ stack), not visual weight.
- **Generic toast hardcodes `200ms` (no easing token) — legacy.** Master's `.toast` used `transition:opacity 200ms,transform 200ms` with no easing function. C04's variant stack uses `220ms var(--ease-out) / var(--ease-ios)` instead. Action when migrating master: replace the legacy toast call sites with `showToast({variant, message})` rather than fixing the literal in place.
- **Hover-pause + manual close are required.** Master's pure `setTimeout` is replaced. C04's behavior: timer pauses on `mouseenter`, resumes with remaining time on `mouseleave`; × button dismisses immediately regardless of timer. React component must mirror this — `useToast` + `<ToastProvider>` need to track per-toast `remaining` and `paused` state.
- **Hardcoded motion literals (welcome pill).** Welcome pill uses literal `240ms` rather than `--dur-` tokens. C04 preserves the literal for fidelity to the existing motion vocabulary; lifetime moved from 2400ms → 3000ms (welcome density slightly higher than success, lower than error). Action: token-ize alongside the wider master cleanup pass.
- **Master's `Verita Transition.html` is now drift, not source of truth, for toasts.** When the React component lands, it should target C04's surface; the master demo will be updated (or left as legacy) once the page demos consume the new spec. Do not back-port C04's variant system or the new welcome pill treatment into `Verita Transition.html` ad hoc — the master is changing into a sequencing demo, not a component spec.

### From C05 — Cards & Hover

C05 is the canonical spec for the three feed-card variants (image, text, digest) only. Earlier drafts also tried to host like-bounce, bookmark, and a card-level focus ring; those have all been moved out — see C12 and C13 below. Sources are `pages/Verita Home.html` (markup, sizing, padding) only; the v1 draft sourced from `animations/Verita Transition.html`, which carries an older simplified card with `aspect-ratio: 4/3`, a 19px title, and an interactive feed-row like button — none of which match production.

- **Three card variants live in the feed, not one.** Home renders `type: 'card'` (image), `type: 'text'` (cream-block pull-quote), and `type: 'digest'` (dark surface). Each has its own hover signature: image cards lift the tile + add a shadow on `.cover`; text cards lift the tile + add a shadow on `.card-text`; digest cards do **not** lift — they shift the `.cta-arrow` by 3px and brighten the CTA color. C05 ships all three variants with two real examples each (real titles, quotes, authors, badges from the production posts list). React: `<PostCard variant="image|text">` + a separate `<DigestCard>` component, not a third PostCard variant — digest is structurally a different object (a packaged set of picks, not a single post).
- **Likes in the feed are read-only `<span>`.** Master's `Verita Transition.html` had a `.card-like-btn` inside the author row, but the production Home no longer carries it: `.author-row .likes` is a plain span with a static count. C05 mirrors that exactly. The like *button*, where the bounce animation can fire, lives in C12.
- **Webfont parity.** Until v3, `tokens/tokens.css` declared `--font-sans` / `--font-serif` / `--font-mono` variables but did not load the corresponding webfonts. Component demos silently fell back to system fonts, while production pages (`pages/Verita Home.html`, `pages/Verita Post Detail.html`) `<link>`-loaded Inter + Newsreader + JetBrains Mono from Google Fonts. Card titles in C05 looked off because Inter and SF Pro have different metrics. Fixed in v3: `tokens.css` now `@import`s the same Google Fonts URL as Home, so every demo that links tokens.css picks up the production type rendering automatically. No per-demo `<link>` tag needed.
- **Hardcoded motion literals on `.card` and `.cover`.** Home uses literal `160ms ease-out` (transform), `220ms ease-out` (cover shadow), and `200ms` (digest CTA color + arrow translate) rather than `--dur-*` / `--ease-*` tokens. C05 preserves the literals to stay 1:1 with `pages/Verita Home.html`. Action: token-ize on the next pass through Home and propagate to C05.
- **`.card-slot.hidden` exit motion is owned by C06, not C05.** C06 (Tags & Filters) needs the 220ms opacity + scale .97 exit when a filter chip removes cards from the masonry. C05 does not animate filtering. Action: when C06 lands, verify the values match exactly so the two demos read as one motion vocabulary.
- **Retracted from earlier drafts.** v2 of C05 introduced (a) a card-row `.card-save-btn` with a `save-pop` keyframe and (b) a card-level `:focus-visible` outline with `tabindex="0"` on the article root. Both were wrong: production Home has no save button on feed cards, and the cards rely on inner anchors as tab stops, not a tile-level focusable region. v3 removes both. Bookmark + like-bounce now live in C12; canonical focus-ring spec is deferred to C13.

### From C06 — Tags & Filters

C06 follows the C01 / C02 split: a **Production tier** (3 sections, all sourced 1:1 from `pages/*.html`) and an **Extended tier** (5 sections proposing animation behavior production has not codified). The most important framing for C06: production's tag/filter primitives are mostly **low-animation reality** — text-color shifts, instant tab swaps, static count badges. The plan's named animations (filled/outline cross-fade, count-badge increment, chip remove, masonry filter exit) are all Extended-tier proposals — there is no production source for any of them. The Extended tier is therefore where the unified `<TagChip>` contract actually lives.

**Production tier — verified 1:1**

- **Topbar `.tagbar .chip` (Section 1, primary).** Sourced 1:1 from `pages/Verita Home.html:177–191`. Pure text chip in a horizontal scroll bar — no fill, no border, no underline. 13.5px font, `padding: 4px 14px`, `transition: color 120ms ease-out`. `.active` flips color to `--text-primary` and `font-weight: 600` (the weight shifts instantly; only color transitions). Single-active row by design — clicking a chip swaps which item carries `.active`. The 120ms literal is intentional and preserved (same rationale as C01/C02: slowing it makes hover-passes feel sticky).
- **Decorative `.tag-pill` (Section 2).** Sourced 1:1 from `pages/Verita Home.html:285–290` and `Search Results.html:224–229`. 10.5px font / 500 weight, `padding: 3px 7px`, `border-radius: 4px`, `--bg-elevated` background on `--text-secondary` text. The `.accent` first-child variant flips to `--text-primary` background + white text — but this is render-time only, no toggle, no transition. Surfaced in C06 for vocabulary completeness even though it carries no motion; it is structurally part of the feed-card metadata strip (a C05 concern), not a filter primitive.
- **Filter tabs (`.tab-item` + `.tab-count`) (Section 3).** Sourced 1:1 from `pages/Verita User Profile.html:226–236`. 13.5px / 500 weight, `padding: 14px 16px`, 2px transparent bottom border that flips to `--accent` on `.active`. The inline `.tab-count` (11px / 600, 4px radius) flips bg from `--bg-elevated` to `--accent` + white when its parent goes active. `transition: color 120ms, border-color 120ms` on the tab; `transition: background 120ms, color 120ms` on the count badge. **This is the only filter primitive in production that actually filters content** — User Profile uses it to switch between Posts / Bookmarks / Drafts / Likes panels (`switchTab()` in `pages/Verita User Profile.html:932–935`).

**Extended tier — proposals**

- **Filled/outline cross-fade chip (Section 4, primary).** The unified `<TagChip>` contract production has not codified. 999px-radius pill with two states — off (surface bg + secondary text + hairline border) and on (ink fill + white text + matching border) — that share the same dimensions to avoid layout shift. `transition: background 160ms ease-out, color 160ms ease-out, border-color 160ms ease-out`. Multi-select by default (unlike Section 1's single-active row). Why 160ms (not 120ms): chip toggle is a more deliberate state shift than a hover-pass; 160ms is the same duration C01 uses for link enhancement. Why no bounce: a bounce would lie about the action — toggling a tag is a passive filter selection, not a celebratory event. Action: confirm before this becomes the React `<TagChip>` default; the existing topbar text-chip and tag-pill primitives stay where they are (they are different visual contexts).
- **Count-badge increment bump (Section 5).** 240ms `scale(1.0) → scale(1.10) → scale(1.0)` peak at 35%, ease-out, `transform-origin: center`. Triggered by value change (not chip toggle) — fires whenever a count badge's number actually changes. Why peak 1.10 (not 1.20): the badge is 11px text — bigger peaks read as a glitch at this size. Why on value change rather than parent-active toggle: the production count is static today, so the *interesting* moment is when a server tick or filter-select pushes the number up by one; bumping on tab-active would conflate filter switching with count update. Action: encode in `useCountBump(value)` so any badge can opt in.
- **Chip remove (Section 6).** Symmetric collapse on dismiss — `max-width`, `opacity`, `padding`, `margin` all transition 220ms ease-out. Click × → `.is-leaving` applied → 220ms collapse → DOM removal (gated behind `setTimeout`, not `display:none`). Why `max-width` not `width`: real chip widths vary with label length; `max-width` animates from the actual content width down to 0 without measuring. The `margin-left: -8px` on `.is-leaving` collapses the row gap as well so neighbors slide left instead of leaving a hole. Reduced-motion keeps the geometry collapse but skips the bezier (opacity-only 120ms linear). Action: ensure React `<TagChip removable>` exposes `onDismiss` as a callback that fires *after* the 220ms timeout, not on click — otherwise the parent removes the DOM node before the exit can play.
- **Filter applied state (Section 7).** Distinct from §4's on/off: §4 is a discrete chip-level toggle; §7 is a *filter-set membership* indicator. Visual: 8% accent tint background, 38% accent border, accent tick glyph that slides in (`width 0 → 12px`) on apply. 160ms ease-out on bg, color, border, and tick width — all in parallel. Useful when the filter set persists across pagination (e.g. Search Results filter pills, P03's domain). Why a tick instead of a checkmark inside a box: chips are pill-shaped, not square — a leading tick reads as "yes, this is in the set" without competing with the chip outline. Action: pair with `<FilterChipRow appliedFilters={Set} />`; the tick's `width 0 → 12px` is what makes the apply feel like an active *change* rather than just a recolor.
- **Masonry filter exit (Section 8).** Pairs with C05. When a filter chip removes cards from the feed, slots transition `opacity 1 → 0` + `scale(1) → scale(0.97)` over 220ms ease-out, then JS adds `.is-collapsed` to reflow neighbors. Why 220ms: matches C05's `.cover` shadow transition exactly so the two demos read as one motion vocabulary. Why scale 0.97 (not slide): production cards live in a CSS columns / grid layout; sliding would fight the column flow. A subtle scale-down feels like the card "leaving" without contradicting the masonry. Why two-phase (exit then collapse): single-phase (remove from DOM immediately) skips the exit; combined-phase (animate height + opacity together) breaks the masonry's column packing mid-transition. The 230ms `setTimeout` on collapse-class is intentional — gives the 220ms exit a 10ms safety margin before reflow.

**Inconsistencies observed (audit, surfaced from full `pages/*.html` scan)**

C06's audit found five drift findings across the production tag/filter surface. None block C06 from shipping; they are a punch list for a future "tag/filter consistency" pass:

1. **Three different chip-like primitives, no unified contract (high).** `.chip` (text-only, topbar, 13.5px/14px-padding/no-border), `.tag-pill` (rect, feed-card, 10.5px/4px-radius/`--bg-elevated`), and `.tab-item` (tab-with-bottom-border, profile, 13.5px/16px-padding/2px-accent-border) all coexist with different sizes, radii, and visual approaches. None share styles. Convergence target: keep the three as distinct *components* (they are different surfaces — navigation-style category row vs decorative metadata vs filter tabs vs interactive multi-select) but adopt Section 4's `<TagChip>` as the unified primitive for any *new* interactive tag in the product. Don't retrofit existing surfaces — they read correctly today.
2. **Tag-pills are decorative-only, not interactive (medium).** Production's `.tag-pill` carries no hover state, no toggle, and no enter motion despite looking like it could be clickable. The `.accent` modifier on the first child is a server-render decision, not a state. Risk: users may try to click them, expecting filter behavior. Convergence target: either commit to the static contract (no hover affordance, ever) or migrate feed-card tags to the `<TagChip>` from §4 with the `applied` flag tied to the user's saved filter set.
3. **No production source for filtering motion (medium).** The plan named four animations (filled/outline cross-fade, count-bump, chip-remove, masonry-exit) but production has zero of them — every filter is an instant class swap. C06's Extended tier is therefore proposing the entire motion vocabulary, not refining existing values. Action: when these land in React, expect a brief "feels too animated" reaction during code review — the change is from no-motion to 160–240ms motion, not from old-motion to new-motion. The 5-dim critique on each demo was tuned with this in mind.
4. **Static count badges (medium).** `<span class="tab-count">47</span>` is hardcoded everywhere — no JS path increments it on the client. The bump in §5 is purely a *future* spec for when the React app actually streams updates (e.g. a new bookmark count after `<BookmarkButton>` toggles). Convergence target: pair with `useCountBump(value)` in the `<FilterTabs>` component; don't bump on initial render, only on subsequent value changes.
5. **Hardcoded motion literals (low).** Topbar chips use literal `120ms ease-out`, tabs use `120ms` (no easing function — defaults to `ease`), count badges use `120ms` (no easing). None reference `--dur-*` or `--ease-*` tokens. Same finding as C01 §5 / C02 §4. Decision needed: rename tokens to match observed values, or migrate fields/buttons/chips to existing tokens. C06 preserves the literals for fidelity; do not back-port the Extended-tier values into production until this decision is made.

### From C07 — Tooltips & Popovers

C07 follows the same Production / Extended split as C01–C06: 3 production sections (sourced 1:1 from `pages/*.html`) and 5 Extended-tier sections proposing the unified `<Tooltip>` / `<Popover>` contract. Two of the consumers named in the plan — sidebar collapsed labels (P01 Home) and Admin action hints (P08) — have **no production implementation today**, so C07 is the gating component for those page demos to actually carry tooltips. The collapsed-rail variant of `.sidebar` itself is also not yet wired in production (the `--sidebar-rail: 60px` token exists in `pages/Verita Home.html:31` but is unused); shipping P01's collapsed state and shipping the hover-delay tooltip must happen together.

**Production tier — verified 1:1**

- **Toolbar tooltip `.tb-btn-tip` (Section 1, primary).** Sourced 1:1 from `pages/Verita Post Editor.html:248–257`. The only tooltip primitive in production. Accent-fill ink pill (`background: var(--accent)`, white 10.5px text, 5px radius), positioned `bottom: calc(100% + 6px)` with `translateX(-50%)` centering. CSS-only — `transition: opacity 100ms` triggered by parent `:hover .tb-btn-tip { opacity: 1 }`. No delay, no transform, no scale. The brand-bright accent fill is intentional: this is a confirmation cue ("yes, this button is Bold"), not an explanation, so loud is correct here.
- **Sort dropdown `.sort-dropdown` (Section 2).** Sourced 1:1 from `pages/Verita Post Detail.html:764–803`. Comments-section sort menu (Newest / Oldest / Most Liked). Anchor-relative (no portal), `top: calc(100% + 4px); right: 0`. Motion: `transition: opacity 140ms, transform 140ms` with `transform: translateY(-4px → 0)` on `.open`. The 4px offset is the smallest value that still reads as "down from the trigger" rather than a fade-in-place; don't lengthen it.
- **Manage portal `#manage-portal` (Section 3).** Sourced 1:1 from `pages/Verita User Profile.html:317–341`. Card-level menu (Edit / Unpublish / Delete) — **portaled to `document.body` in production** to escape the masonry's `overflow: hidden` clipping; demoed inline here with absolute positioning relative to the stage. Motion: `@keyframes dropIn 120ms ease-out` — opacity + `translateY(-4px) scale(0.97) → (0, 1)`. This is the only place in production where a popover combines opacity + translate + scale; the scale is what makes the menu feel like it expands from its trigger rather than appears. The danger variant (`.manage-dropdown-item.danger`) flips text + bg to red on hover (`#FEF2F2`), which is the only place in the system where a destructive action has its own hover surface.

**Extended tier — proposals**

- **Hover-delay tooltip (Section 4, primary).** Production §1 fires on plain `:hover` with 100ms fade — right for editor toolbars where the user is *actively scanning* the bar, wrong for navigation and dense icon clusters where casual mouse-passes would spam tooltips. Section 4 proposes a JS-managed `setTimeout(400)` on `mouseenter`, `clearTimeout` + immediate hide on `mouseleave`. Asymmetric motion: 160ms ease-out enter (opacity + `translateY(4px → 0)`), 80ms exit (opacity only). Why 400ms specifically: the threshold Apple, Material, and Floating UI converged on — short enough to feel responsive when intentional, long enough to ignore casual sweeps. Why dark fill (`oklch(20% 0.012 70)`) instead of accent: dark reads as ambient/contextual, accent reads as confirmation — the hover-delay variant is for ambient labels (sidebar nav, rail icons), so it shouldn't compete with toolbar §1's attention-grabbing fill. Action: confirm with design before this becomes the React `<Tooltip>` default; the existing `tb-btn-tip` instant variant must remain reachable as `delay={0}`.
- **Edge-arrow tooltip (Section 5).** Same primitive as §4, four placements (top / bottom / left / right). One `.x-tip-edge` class; placement-specific positioning via `.x-anchor.{top,bottom,left,right}` parent selector. CSS triangle drawn with `::after` + `border-color` tricks (no SVG, no extra DOM). Why four canonical placements (not eight or sixteen): the `useFloating()` auto-flip logic only needs the four cardinals as fallbacks — corners and offsets are reachable by combining placement + horizontal/vertical anchor offset. The slide direction also flips per placement (e.g. bottom-placed tip slides up *into* position from below), so the motion always reads as "expanding away from the anchor" regardless of where it lands.
- **Anchored popover (Section 6).** Production §2 (sort-dropdown) uses `translateY(-4px → 0)` on a fixed origin — fine for menus, weak for richer popovers. §6 proposes `transform-origin` set to the anchor edge (e.g. `top left` for a popover anchored bottom-left of trigger) so the open motion physically reads from the trigger. Curve: `cubic-bezier(0.16, 1, 0.3, 1)` (the "spring-out" easing) — gentler than production §2's `linear`, appropriate for surfaces that carry visual weight (multi-paragraph content, mini forms, share targets). Duration 180ms — slower than §2's 140ms because the scale itself is a slower physical motion than a 4px translate; matching durations would make the scale feel rushed. Action: pair with `<Popover anchor={ref} placement="bottom-start">`; the four canonical origins (top-left, top-right, bottom-left, bottom-right) map 1:1 to the four placements in §5.
- **Dismiss governance (Section 7).** Production §2 and §3 each implement outside-click independently — different selector roots, different stop-propagation rules. §7 proposes the unified contract: every popover dismisses on three triggers — **outside-click** (capture-phase `document.addEventListener('click', …, true)` to avoid the bug where a stop-propagated inner click swallows the dismiss), **Esc** (global `keydown`), and **scroll-on-ancestor** (the popover's nearest scroll ancestor). Why scroll-dismiss: anchored popovers don't track scroll; the alternative is repositioning on every frame, which is heavier than just closing. The 7th demo logs which dismiss path fired so reviewers can verify all three work. Action: encode as `useDismiss({onClose, esc, outsideClick, scrollAncestor})`; default all three to `true` and let consumers opt-out per-flag.
- **Reduced motion (Section 8).** Inside `@media (prefers-reduced-motion: reduce)`: all `transform` animations collapse, transitions become opacity-only 120ms linear, `@keyframes dropIn` disables. Why opacity stays (not pure on/off): an instant on/off makes popovers feel "stuck" — a 120ms fade still communicates state change while respecting the user's motion preference. The §8 demo renders a side-by-side comparison (full motion vs reduced) so reviewers can verify the reduced variant still feels like a state transition, not a glitch. Why this is one media query (not per-section): a single `@media (prefers-reduced-motion: reduce)` rule at the bottom of the stylesheet covers all six tooltip/popover primitives in C07 simultaneously — much cleaner than CSS-in-each-section overrides.

**Inconsistencies observed (audit, surfaced from full `pages/*.html` scan)**

C07's audit found four drift findings across production's tooltip/popover surface. None block C07 from shipping; they are a punch list for a future "overlay consistency" pass:

1. **Only one tooltip primitive in production (high).** Despite the design spec referencing tooltips on toolbar buttons (`pages/Verita Design Spec.html:1111`), the only place tooltips actually exist is the editor toolbar's `.tb-btn-tip`. Sidebar nav, action-bar buttons, avatar buttons, FAB, and admin role-actions all lack any tooltip — the user has no way to learn what `?` / `+` / icon-only buttons do without clicking them. Convergence target: ship the §4 hover-delay variant once and adopt it everywhere icon-only buttons exist.
2. **Two popover motion vocabularies coexist (medium).** §2's sort-dropdown uses `translateY(-4px) → 0` on `linear` for 140ms; §3's manage-portal uses `translateY(-4px) scale(0.97) → 0, 1` on `ease-out` for 120ms. The visual difference is small but the underlying contracts diverge — sort-dropdown is a CSS transition on `.open` class, manage-portal is a `@keyframes` animation that re-fires on every open. Convergence target: encode both as variants of `<Popover>` (`variant="menu"` for §2's lightweight motion, `variant="portal"` for §3's scale-from-origin) so consumers pick by intent rather than re-implementing.
3. **No edge-flip / collision detection in production (medium).** Both production popovers (§2 and §3) hard-code their placement (`right: 0` for sort-dropdown, JS-measured below-trigger for manage-portal) — neither falls back when the placement collides with the viewport edge. On a narrow Post Detail viewport the sort-dropdown can clip past the right edge; on a long User Profile masonry the manage-portal can render below the visible area when the trigger is near the bottom. Convergence target: `useFloating()` with auto-flip — the §5 four placements are the canonical fallback set.
4. **Hardcoded motion literals (low).** Same finding as C01 §5 / C02 §4 / C06 §5: every production popover uses literal durations (100ms, 120ms, 140ms) and no easing tokens. None reference `--dur-*` or `--ease-*`. C07 preserves the literals for fidelity. Decision needed alongside the wider tokenization pass — do not back-port Extended-tier durations (160ms, 180ms, 240ms) into production until that decision is made.

### From C08 — Skeletons & Loading

C08 splits cleanly into 3 production primitives (shimmer, gen-spinner, reading progress) and 5 Extended-tier proposals. Production sources are 1:1 from `Verita Search Results.html`, `Verita Digest Management.html`, and `Verita Post Detail.html`. Notable: the production app has zero indeterminate-spinner-on-light-surface, zero determinate progress bars, zero pull-to-refresh — the entire "active work" vocabulary outside skeleton + scroll progress is Extended-tier.

- **Shimmer is opacity-only, not gradient (production §1).** `.skeleton` in Search Results uses `animation: shimmer 1.4s ease-in-out infinite` where the keyframe just animates `opacity: 1 → 0.45 → 1`. There's no gradient sweep. On a light surface this can read as content fading rather than activity. The Extended §4 sweep variant uses the same 1.4s linear period so the two can swap implementations mid-fetch without timing drift. Decision: keep production behavior as the default; only opt into sweep on surfaces where the pulse is misread.
- **Gen-spinner is hardcoded against `rgba(255,255,255,…)`, only used on dark surface.** Production §2 lives inside the dark digest hero (`pages/Verita Digest Management.html:117–118`). It uses 15%-white background ring + 70%-white top-color, neither of which references a token. It's also the *only* spinner in the entire production app — the Auth modal, Post Editor publish, search, and admin actions all have no spinner today. The unified `<Spinner>` proposal (§5) reads token colors and proposes 14px (in-button inline) and 24px (default) sizes; the on-accent tone covers the dark-surface case. Action: when migrating, fold gen-spinner's existing markup into `<Spinner size={18} tone="on-dark" />` rather than keeping it as a separate primitive.
- **Reading progress is duplicated, not shared.** Identical 13-line CSS block + identical JS handler appear in both `pages/Verita Post Detail.html:750–762` and `pages/Verita Digest Post.html:472–477`. The 60ms width transition is intentional (instant feels twitchy on a fast scroll wheel). Action: extract to `<ReadingProgress target={...} />` so both consumers share one implementation; keep the 60ms literal until tokenization sweep.
- **Pull-to-refresh has no production source (Extended §7).** The plan names it as a P01 Home consumer but there's nothing in the codebase today — not even a placeholder. Extended §7 establishes the contract: 56px threshold, `cubic-bezier(0.16,1,0.3,1)` 220ms snap, 0.9s spin while refreshing (intentionally faster than gen-spinner's 1s so it reads as "active work"). Mobile-only; desktop accidental drag is suppressed. Open question for migration: whether the threshold should be raised under reduced-motion to prevent accidental triggers (currently the §7 implementation only kills the snap easing).
- **Determinate progress is also absent in production (Extended §6).** Post Editor publish today shows no visible progress — clicking *Publish* just transitions to *Saved*. The proposed `<ProgressBar>` adds a 4-step fake publish demo (compile / upload / index / notify) with 240ms width transitions and a 220ms green-flash success swap. The status field (`filling | success | error`) is the data hook the React layer needs.

### From C09 — Comments & Threads

C09 is split into a **Production tier** (4 sections — comment list rendering, inline reply expand, composer focus expand, per-comment like) and an **Extended tier** (4 sections proposing thread-level motions production hasn't codified). The production tier traces 1:1 to `pages/Verita Post Detail.html`; the extended tier addresses thread loading, progressive disclosure, and live arrival, none of which the production page currently animates.

**Production tier — verified 1:1**

- **Comment list rendering is static (Section 1).** Sourced from `pages/Verita Post Detail.html:560–630`. The production list ships fully-rendered with no entry animation — the only motion in the comment block is the inline reply expand and per-comment like. Documenting this explicitly because future contributors are tempted to add a load-in stagger; that proposal lives in the Extended tier (§5), not here.
- **Inline reply uses `@keyframes fadeIn` (Section 2, primary motion).** Verbatim from `pages/Verita Post Detail.html:805–868` — `.reply-inline` runs `animation: fadeIn 180ms ease-out;` over `from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); }`. This is the **canonical comment-area tempo** for Verita; any future thread motion (show-more, edit, delete, react) should reuse 180ms ease-out + 4px translate to stay coherent. The reply container is rendered server-side and toggled via `hidden` — JS just flips the attribute, the keyframe handles the rest.
- **Composer focus expand is `transition: all 240ms cubic-bezier(0.22,1,0.36,1)` (Section 3).** Sourced 1:1 from `pages/Verita Post Detail.html:668–727`. The composer expands height + border + shadow on focus with a single `transition: all` — using the all-shorthand is intentional because it lets the reduced-motion override collapse cleanly to shadow-only (see §8). The 240ms / cubic-bezier(0.22,1,0.36,1) pair is the post-detail standard for "container reveals chrome" (also seen in C12 action bar) and should be lifted into a `--dur-expand` / `--ease-expand` token pair if/when the design system audits chrome motions.
- **Per-comment like is color-only, no bounce (Section 4).** Production at `pages/Verita Post Detail.html:611–619` toggles `.cmt-actions button.liked` with a 120ms color transition only — **no scale, no bounce, no haptic flash**. This is deliberate: the bounce motion lives **only** on the post-detail action bar (C12), where it punctuates the primary CTA. Per-comment likes stay quiet so the thread doesn't twitch every time a long comment chain has multiple likes toggled. Resist the temptation to unify these — the silence is the spec.

**Extended tier — proposals (no production source)**

- **Initial-load stagger (§5, primary).** Production renders comments with no entrance. Proposed: 40ms-step `animation-delay` over the existing `fadeIn` keyframe, capped at 6 items (so a 50-comment thread doesn't run a 2-second cascade). Trade-off: stagger feels good on cold loads but jarring on hot navigations where the user expects content to already be there. The React layer needs a `firstPaint` flag to gate this — only run on initial mount, skip on re-renders / hot-nav.
- **Show-more replies (§6).** Production has no progressive disclosure inside threads — long reply chains render all at once. Proposed: `grid-template-rows: 0fr → 1fr` height-auto trick at 240ms cubic-bezier(0.22,1,0.36,1), reusing the composer tempo so chrome reveals stay coherent. **Browser support note:** `grid-template-rows: auto` interpolation is Chromium 117+ / Firefox 122+ / Safari 17.4+ — if we ship before parity, fall back to a JS-measured `max-height` transition. Document this in the React component's `<noscript>` fallback comment.
- **New-comment slide-in (§7).** Production polls or refreshes — no live thread arrival. Proposed: `@keyframes newCmtIn` at 320ms cubic-bezier(0.16,1,0.3,1) (spring-out, not the production fadeIn — arrivals deserve a stronger arrival than expand) plus a 1.6s tinted background cool-down (`var(--accent)` at 0.06 alpha, fading to transparent). The cool-down is what makes the new comment scannable in a long thread without yanking focus. Cool-down should be cancellable: if the user scrolls past or interacts with another comment within the 1.6s window, drop the tint immediately.
- **Reduced-motion governance (§8).** Single `@media (prefers-reduced-motion: reduce)` rule at the bottom of the file overrides all four extended motions plus collapses the composer's `transition: all` to shadow-only (so focus state still has a visual anchor without the height/border morph). This is the canonical pattern for the C-files and should be the React component's last styled-rule too — don't scatter `prefers-reduced-motion` checks per-keyframe; one block at the bottom keeps the override surface auditable.

**Audit findings**

- Production has exactly one comment-area keyframe (`fadeIn`), no other thread motions. Extended tier explicitly does not modify or rename it — the keyframe ships verbatim.
- Per-comment like and post-detail action-bar like are intentionally different motions. Don't unify.
- Composer's `transition: all` is the right choice here despite the usual "name your properties" guidance, because the reduced-motion override needs to selectively kill height/border without rewriting the transition list. Documented inline in the demo.

### From C10 — Avatars & Identity

C10 is split into a **Production tier** (4 sections — avatar primitives, hover lift, follow toggle, nav badge + status dot) and an **Extended tier** (4 sections proposing presence, badge bump, stack fan-out, and reduced-motion governance). Production today is **almost entirely static identity chrome** — the *only* avatar motion shipping in production is the topbar hover lift (160ms ease-out). This is a deliberately quiet layer; the audit confirmed no pulses, no count-bumps, no follow-confirmation flashes anywhere across Home / Search / Post Detail / User Profile / Digest Management / Post Editor / Auth.

**Production tier — verified 1:1**

- **Five avatar shapes (Section 1).** Sourced from `pages/Verita Home.html:146–165` (44px topbar, 12px radius, gradient + face pseudo-elements), `Post Detail.html:182–205` (36px topbar, 10px radius — same face pattern), `User Profile.html:171–176` (80px profile hero, 3px white border + 1.5px outline shadow), and inline `.av` sizes 22/26/36 from author rows + comment threads (gradient with initials). The face on `.avatar-btn` is decorative `::before` (eyes via dual radial-gradient ellipses) + `::after` (mouth via half-ellipse) — no &lt;img&gt; or SVG required. React's `<Avatar variant="topbar">` should render the same chrome verbatim so the gradient family stays consistent across the app shell.
- **Avatar hover lift (Section 2, primary motion).** Verbatim from `pages/Verita Post Detail.html:182–205` — `.avatar-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.10); }` over 160ms ease-out. **The hover is a navigation affordance, not decoration** — it lifts only on avatars that act as buttons (open profile menu). Inline identity tags (`.av` in feed/comment rows) intentionally do NOT animate; that silence is the spec, because lifting them would make every cursor pass through a feed twitch.
- **Follow toggle (Section 3).** Sourced 1:1 from `pages/Verita Digest Management.html:198–200`. 28px height, 120ms `transition: all` covering color, background, and border-color. Idle state: hollow with `var(--border-default)` + `var(--text-secondary)` text. Followed state: filled `var(--accent)` with `#fff` text + matching border. **No scale, no haptic flash, no confirmation toast** — production is intentionally minimal here because Digest Management is bulk-action territory and louder feedback would compound across multi-toggles. The label flip (Follow ↔ Following) shares the 120ms transition window — don't add a separate label transition.
- **Sidebar badge + Editor status dot (Section 4).** Two static identity-adjacent indicators, both sourced from production. Sidebar count badges (`pages/Verita Home.html:71–75`) — Digest "3", Notifications "12" — are purely visual, no entry animation, no count-up. Post Editor status pill (`Verita Post Editor.html:133–138`) swaps dot color over a 200ms `background` transition only, cycling through idle (tertiary) / saving (warning) / saved (success). The 200ms tempo matches the editor's autosave cadence — slower feels laggy, faster looks frantic when typing.

**Extended tier — proposals (no production source)**

- **Presence pulse (§5, primary).** Production has no online/offline indicator anywhere. Proposed: 1.6s ease-in-out infinite breathing ring on a `::after` pseudo of the `.presence-dot`, opacity 0 → 0.65 → 0 + scale 0.85 → 1.15. **Low-amplitude on purpose** — if the ring is the only motion on screen, that's correct; louder pulses break the calm of feed scroll. Only renders when `state === "online"`; idle/offline keep a static dot. The ring inherits `var(--success)` so dark-mode and accent re-skinning carry through automatically.
- **Notification badge bump (§6).** No production source. Proposed: 320ms cubic-bezier(0.16,1,0.3,1) spring scale (1 → 1.32 → 0.94 → 1) on the count pill, with a 100ms opacity+translateY crossfade for the digit itself. **Triggers on count delta only** — not on initial mount, not on navigation back to a screen with unread count. Demo also enforces: when `count === 0`, the pill should fade out entirely (220ms opacity), not bump from 1 to nothing. The React component owns the prev/next comparison; keep that logic out of CSS.
- **Avatar stack fan-out (§7).** No production source — the closest production thing is the avatar reactions on Post Detail, which today are not stacked. Proposed: tight overlap (-8px margin-left) at rest, fanning to +4px on `:hover` over 220ms cubic-bezier(0.22,1,0.36,1). Cap at 4–5 visible avatars; rest collapse into a `+N` chip that stays inside the stack and travels with it (don't animate the chip separately). Use case: card byline rows ("Read by Elena, Jin, +12") and reaction summaries.
- **Reduced-motion governance (§8).** Single `@media (prefers-reduced-motion: reduce)` block at the bottom kills all four extended motions and **collapses the production hover lift (§2) to shadow-only** — the focus state still has a visual anchor without the 1px translate. The 120ms color swaps in §3 (follow) and the 200ms color swap in §4 (status dot) are preserved because pure color changes are considered safe under reduced-motion guidelines.

**Audit findings**

- Production has **one** avatar motion across the entire app: the 160ms hover lift on `.avatar-btn`. Everything else (follow, badges, status, presence, stacks) is either color-only or fully static.
- Inline `.av` identity tags must never animate. This is enforced by class — only `.avatar-btn` (the topbar button variant) carries the hover transition; the inline tag has no transition declaration at all.
- The face pseudo-elements on `.avatar-btn` are anchored by percentage, so the same `::before`/`::after` rules work for both the 44px and 36px sizes with only a vertical offset adjustment (`top: 38%` → `36%`). Don't hard-code pixel values when porting to React — keep it percentage-based so future sizes work out of the box.
- No production page animates the sidebar badge count change. The bump in §6 is opt-in; the React `<NotificationBadge>` should expose a `bump?: boolean` prop (default true on the bell, default false on the sidebar) so we don't accidentally bump every count delta in the app.

### From C11 — Reduced Motion & A11y

C11 is the cross-cutting governance file. Unlike C01–C10 it has **no Production tier vs Extended tier split** — every section is normative for the React port, and every other C-file references this one's patterns (the single-rule reduced-motion override, the focus-visible scope, the live-region contracts). The file is treated as the audit standard: the §8 checklist at the bottom is the contract every other C-file's "Deviations" subsection should be auditable against.

**Normative content**

- **Reduced-motion override pattern (§1).** One `@media (prefers-reduced-motion: reduce)` block per C-file, located at the bottom of the file's CSS. Override target: named `@keyframes`, non-color transforms, and `transition: all`. **Don't override**: pure `color`, `background-color`, `border-color`, `opacity`, and `box-shadow` transitions ≤ 240ms — these are below the WCAG flicker threshold and are considered safe under reduced-motion. Concentrating the override in one block per file means audits only need to scan one location per file, not every keyframe definition.
- **Per-pattern comparators (§2).** Side-by-side standard vs reduced for the four most common motion patterns: modal (220ms scale+fade → 100ms opacity-only), toast (320ms spring rise → 120ms opacity-only), like-bounce (320ms spring → color-only — bounce killed entirely), skeleton (1.4s shimmer → static at 0.7 opacity). Skeleton is the most opinionated case because the shimmer is gentle but *infinite*, which can be tiring under reduced-motion preferences; static-with-reduced-opacity preserves the "this is loading" affordance without the perpetual pulse.
- **Focus-visible ring (§3).** Every interactive element uses `:focus-visible` (never bare `:focus`) with `2px outline` in `var(--accent)` and `2px outline-offset` (1px on inputs, where the border is part of the ring). Mouse-clicking should not paint a ring; keyboard navigation and screen-reader navigation should. Custom interactive elements (clickable cards, list items with `role="button"`) need scoped rules — never broaden the global selector.
- **Focus order &amp; modal trap (§4).** Open: focus moves to first focusable in modal. Cycle: Tab/Shift+Tab loop within the modal (Tab from last → first; Shift+Tab from first → last). Esc closes. **On close, focus returns to the originating trigger element.** The demo logs every focus event into a polite live region so the cycle is visible without inspecting devtools.
- **Live regions (§5).** `aria-live="polite"` for routine state changes (save, copy, refresh, count); `aria-live="assertive"` for blocking errors only. Don't double-announce — if a toast contains the same text as an inline message, only one needs the live attribute. The visible UI and the SR-only live region should share content via the same React component (`<LiveRegion politeness="polite">`) — single source string, two styling targets.
- **Motion-free state cues (§6).** Every animated state change must convey at least one non-motion signal: color, position, or text. Rule of thumb: kill every animation in the demo, then read the screen as a static snapshot. If you can't tell which state each component is in from the static snapshot alone, the static design is missing a cue — fix the static layer, not the motion layer.
- **Reduced-transparency &amp; forced-colors (§7).** Two less-discussed media queries the React port must respect. `prefers-reduced-transparency: reduce` (Safari macOS today; ratified in spec) collapses tinted/translucent surfaces to solid. `forced-colors: active` (Windows High Contrast) maps colors to system tokens (`ButtonFace`, `ButtonText`, `Highlight`). Set `forced-color-adjust: none` only on elements you've explicitly remapped — never globally.
- **Audit checklist (§8).** Nine checks every C-file must pass before flipping `Pending → Live` in Plan.md. This is the contract for future C-file additions; the existing C01–C10 should also be retroactively verified against it (most already comply; gaps are small).

**Implementation findings**

- **C11 demonstrates the override inline per-section** (left column = standard, right column = reduced) so behavior is comparable without toggling OS settings. The actual `@media (prefers-reduced-motion: reduce)` block at the bottom is intentionally empty in C11 itself — because if it were active, the standard column wouldn't play and the comparator would be useless. Production C-files (C01–C10, C12) use the real form with active overrides.
- **Color-only transitions are explicitly excluded** from the reduced-motion override across C-files. Reviewed C03 (modal), C04 (toast), C05 (cards), C07 (tooltip), C08 (skeleton), C09 (composer + reply), C10 (avatar + follow), C12 (action bar) — all preserve their 120ms color swaps under reduced-motion. This is consistent with WCAG 2.3.3 guidance: pure color/opacity changes under 5Hz are not a vestibular trigger.
- **Like-bounce is the only motion that kills entirely** under reduced-motion (no replacement). All other motions get a degraded fallback (opacity-only fade, static state). Bounce is the most "decorative" motion in the system — there's no information conveyed by the spring scale that isn't already in the color toggle, so it's safe to drop.
- **The `<LiveRegion>` React component** is the single contact point for screen-reader announcements. The C04 toast component, C09 composer validation, C10 follow-state announcement, and any future state-change UI should all consume it. Don't add ad-hoc `aria-live` attributes to existing markup — wrap with `<LiveRegion>` so the politeness contract is centralized.
- **The §8 checklist will be added to the Plan.md "How to land a new C-file" section** as a follow-up. For now it lives only inside the C11 demo. When P-files start landing, this checklist also expands to cover page-level concerns (skip links, landmark roles, page-title announcements on route change).

### From C12 — Post Detail Action Bar

C12 is new in v3, extracted from what used to be C05's "Detail action bar" section. It owns four affordances of the floating `.actions-pill` on the post-detail page: comments (jump), like (toggle + bounce), bookmark (toggle, no animation), share (copy + toast). All markup, padding, sizing, and JS toggles match `pages/Verita Post Detail.html` 1:1.

- **Like-bounce is reachable nowhere in master, but is the canonical spec.** Master's `.cact` defines color + fill toggle on `.on` but no scale keyframe. The 320ms `1 → 1.25 → 0.92 → 1` spring bounce existed only in `Verita Transition.html`'s feed-card like button, which the production Home retired. C12 adopts the bounce as canonical and applies it to the detail-bar `#likeBtn` icon — same surface where the React `<LikeButton>` will land. Action: when porting, ensure the bounce fires on `liked: false → true` only; off-toggle and count-tick (e.g. socket-driven count updates from other readers) must not animate.
- **Bookmark does not animate.** Master ships a bookmark button only on the detail-page action bar (`#bookmarkBtn`) with a pure outline → `currentColor` fill toggle and no scale. C12 preserves that exactly: color + fill swap on `.cact.on svg` only, no scale animation. The React `<BookmarkButton>` should expose `saved` as a state without any animation hook, spring config, or progress.
- **Share toast variant is local to C12.** Master's `pages/Verita Post Detail.html` has its own `#toast` element distinct from the C04 stack and the welcome pill — an ink pill at `bottom: 90px` (so it clears the action bar). C12 reuses that exact treatment for the copy-link confirmation. Action: when migrating, decide whether this becomes a `showToast({variant:'success', position:'bottom-center'})` call in the C04 system or stays as a one-off post-detail toast component.
- **Comments button is a scroll target.** In the real page it scrolls to the comments thread; in C12 it just nudges the demo viewport. Worth flagging because the React component will need access to a comments anchor ref.

### From C13 — Focus & Keyboard

C13 is a planned placeholder, not yet built. It exists in the plan because v2 of C05 attempted a card-level `:focus-visible` outline with `tabindex="0"` on the article root, which mis-modelled Verita's a11y contract — the production cards rely on inner anchors as independent tab stops, not the card root. Rather than smear focus-ring spec across whichever component first needs it, all canonical focus + keyboard behavior is consolidated here.

- **No card-level focus ring.** The production Home cards do not put `tabindex` on `.card`; the cover link, author link, and tag links each carry their own focus rings. C13 will codify per-context focus styles (input, button, link, modal trigger, action-bar button) without overriding this contract.
- **Roving tabindex inside the action bar (referenced from C12).** `.actions-pill` is a toolbar of four buttons; arrow-key navigation between them belongs in C13 (`useRovingTabIndex()`), not in C12's component spec.
- **Skip links + focus trap.** Modal focus trap (paired with C03's open/close motion) and skip-link reveal also belong here.
- **Action when this lands.** Verify against `pages/Verita Home.html` and `pages/Verita Post Detail.html` what the actual focus rings look like — Home uses standard browser default for inner anchors as far as I've seen, but the spec should make a deliberate decision rather than inherit it.

### From P01 — Home

P01 was the first page-level demo shipped and established the chrome scaffold (lead-block, choreography timeline, divided sections, react-hint footer) reused by every subsequent P-file. It composes C01 (FAB), C05 (cards), C06 (tags), C07 (tooltips), and C08 (loading) into the logged-in feed entry experience.

**Production sources discovered**

- **Topbar shadow on scroll.** `pages/Verita Home.html` — `.topbar.scrolled::after` opacity 0 → 1 over 200ms, gated on `scrollY > 0`. The hairline border is what readers anchor to when the page starts scrolling.
- **Refresh FAB spin.** Production fires `@keyframes refresh-fab-spin` on the FAB icon for 600ms with the Material standard easing. Distinct from the indeterminate `gen-spinner` (linear infinite) — this is a one-shot rotation tied to a user action.
- **Sidebar always-expanded.** Production keeps the sidebar at fixed 240px; the `--sidebar-rail: 60px` token exists but is never applied. The collapsed-rail variant is therefore Extended-tier.

**Extended proposals introduced**

- **Sidebar rail collapse/expand (320ms cubic-bezier(0.22,1,0.36,1)).** Pairs with C07's collapsed-tooltip pattern — when the sidebar is in rail mode, hover on a nav item reveals the label as a tooltip rather than expanding the rail. Provides a denser layout for power users.
- **Masonry feed cross-fade on refresh.** Replace the hard swap with a 220ms cross-fade between the old and new card grid — cards that survive the refresh stay in place, new cards fade in at their final position via FLIP.

**Audit findings**

- **No staggered card mount.** Production cards appear instantly when the feed renders. The standard `fadeIn 180ms ease-out` with a 60ms stagger (used by P02 comments and P04 grid) is also Extended for P01.
- **FAB spin uses `cubic-bezier(0.4, 0.0, 0.2, 1)` (Material standard).** This is the only place in the app that pulls from Material's curve set; everywhere else uses the iOS curve `cubic-bezier(0.22, 1, 0.36, 1)`. Worth a deliberate decision before C01 finalizes — either standardize on iOS for consistency, or keep Material here since rotation is a Material idiom.

### From P02 — Post Detail

P02 establishes the reading-view choreography pattern and is the reference page for any long-form route. Composes C07 (sort dropdown), C08 (skeleton + reading progress), C09 (comments + composer), C10 (avatars), and C12 (action bar).

**Production sources discovered**

- **Reading progress bar (1:1).** `pages/Verita Post Detail.html:751–761` — `.reading-progress-bar { transition: width 60ms linear }`. The 60ms-linear motion is deliberate: anything heavier (200ms ease-out) makes the bar feel laggy when the user is actively scrolling. P02 surfaces this as a primary production demo.
- **AI summary panel collapse.** `pages/Verita Post Detail.html:268` — `transition: max-height 280ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease-out, margin 220ms`. Three properties on slightly different durations — the opacity finishes 80ms before the height settles, which prevents the content from flashing during the layout shift.
- **Comment stagger (1:1 from C09).** `pages/Verita Post Detail.html:809–811` — `@keyframes fadeIn` over 180ms ease-out, opacity + translateY 4px → 0. Fired by an IntersectionObserver when the comment block enters the viewport, with a 60ms inter-row stagger.
- **Sticky action bar engagement.** Production toggles a `.stuck` class via IntersectionObserver on the title element; the box-shadow fade is 200ms ease.

**Extended proposals introduced**

- **Push transition from Home (460ms ease-ios).** Detail slides in from the right while Home slides out to the left. Not yet implemented — currently a hard route swap. Reverse for back navigation, with `history.state.scrollY` restoration.

**Audit findings**

- **Sticky action bar uses scrollY in some early variants.** Production now uses IntersectionObserver on the title element, which is the correct pattern; but the Animation Spec doc still references "scrollY threshold" in places. Spec needs to be reconciled with the production implementation.
- **AI summary panel margin transition is 220ms while max-height is 280ms.** This 60ms offset is intentional (margin collapses before height) but is undocumented — anyone refactoring this risks unifying the durations and breaking the shape of the collapse.

### From P03 — Search

P03 orchestrates the query → fetch → results sequence. The audit confirmed the production search page (`pages/Verita Search Results.html`) is animation-thin: a single shimmer keyframe and a 180ms `goHome` opacity flash are the entire motion vocabulary on the page. Everything else in P03 is either canonicalized from a sibling C-file (C06, C08, C09's `fadeIn`) or proposed as Extended-tier.

**Production sources discovered**

- **Skeleton shimmer (1:1).** `pages/Verita Search Results.html:292–296` — `.skeleton { animation: shimmer 1.4s ease-in-out infinite }` over `@keyframes shimmer { 0%,100% { opacity:1 } 50% { opacity:0.45 } }`. Opacity-only pulse, no gradient sweep — same finding as C08's deviations note. P03 mounts the skeleton grid verbatim and uses the same period.
- **Search input focus chrome (1:1).** `pages/Verita Search Results.html:109–118` — `.search:focus-within` flips border to `--accent`, bg to `#fff`, and adds a 4px focus shadow over a 120ms ease-out transition on `border-color`, `box-shadow`, and `background`. The 4px ring is the widest of any production field (C02 §2 audit) and is preserved as-is in the P03 timeline.
- **Empty state markup (motion-free).** `pages/Verita Search Results.html:670–681` — production renders `.empty-state` with no entry animation. P03 surfaces the markup but adds an Extended-tier reveal motion on top.

**Extended proposals introduced**

- **Debounce window (250ms).** `useDebouncedQuery(input, 250)` is **not** in production today — the production input fires `applyResultsState()` on every keystroke (Search Results.html:745–751). 250ms is the conventional value for type-ahead search; longer feels laggy, shorter spams the network. The choreography timeline pencils this in as the gating beat between keystroke commit and skeleton mount.
- **Empty-state reveal (220ms).** Production renders the empty panel with no entry motion. P03 proposes a 220ms opacity + translateY(6px → 0) ease-out — slightly slower than result cards (180ms) so the "no results" beat lands deliberately rather than ghosting in. Belongs alongside C08's loading vocabulary if/when codified.

**Audit findings**

- **No debounce hook in production.** Search fires on every Enter / `applyResultsState()` call. The 250ms debounce in P03's timeline is aspirational — flag for the React port. Without it, fast typers will trigger N skeleton-fade cycles where 1 is sufficient.
- **No `IntersectionObserver` for result reveal.** Result cards in production render without any entry motion at all (the masonry just appears). P03 borrows P02's `@keyframes fadeIn` (180ms / 60ms stagger, capped at 6 items) wholesale rather than introducing a new keyframe — the page-level animation vocabulary should carry one "list arrival" tempo, not two.
- **No filter-chip row in production.** The Search Results topbar is input-only — no filter pills below the results header today. C06 §4's cross-fade lands at the page level for the first time in P03; ship the chip row alongside `useDebouncedQuery` so multi-filter queries can be issued without keyboard re-entry.

### From P04 — User Profile

P04 is the User Profile page demo. It composes inherited motion from C05 (post cards), C06 (tab-item + tab-count), C07 (manage-portal dropIn), and C10 (avatar, follow). The choreography is deliberately quiet — production today is static identity chrome plus a single popover, and the demo preserves that calm rather than inventing entrance motion the page doesn't carry.

**Production findings (verified 1:1 against `pages/Verita User Profile.html`)**

- **Tab switch is instant — no panel transition.** `switchTab()` at `:932` is a `display: none` flip on `.tab-panel`. The only animated parts are the `.tab-item` text-color + bottom-border (120ms) and the `.tab-count` background (`--bg-elevated` → `--accent`, 120ms color/bg). The plan's original P04 row referenced a "horizontal slide between panels (220ms)" — that motion does not exist in production. P04's timeline marks the panel swap as "no production motion" and routes the demo through C06 §3 instead. Action: when `<UserProfileLayout>` lands, do not introduce panel slide ad-hoc; if a panel transition is wanted, propose it as Extended in C06.
- **Manage portal is body-portaled with `dropIn`.** The per-card overflow menu (`#manage-portal`, `pages/Verita User Profile.html:317–341`) lives at `document.body` to escape the masonry's `overflow: hidden`. JS positions it to `triggerRect.bottom + 6px` on every open. Motion is `@keyframes dropIn 120ms ease-out` — opacity 0→1, `translateY(-4px)→0`, `scale(0.97)→1`. The combined opacity + translate + scale is unique to this surface (see C07 §3 inconsistency #2). The demo positions inline (`position: absolute`) for clarity but the React port should mirror the body-portal pattern.
- **No follow button on production User Profile.** The page renders an *Edit Profile* button (own-profile view); the only follow toggle in production lives on Digest Management cards (C10 §3). The plan's "follow flow with optimistic update" framing presumes a public-profile view this page does not yet serve.

**Extended proposals**

- **Follow toggle — 200ms accent cross-fade.** When the public-profile view ships, propose 200ms `ease-out` on `background`, `color`, and `border-color` for the follow button (hollow ↔ accent fill). Slower than C10 §3's 120ms because profile follow is a singular deliberate action rather than a bulk-list toggle; 120ms reads as twitchy when there's only one button on the page. Optimistic update; error path reverts via C04 error toast.
- **Initial-grid stagger gating.** P04 reuses P02's `fadeIn 180ms / 60ms stagger` for the cards-grid initial mount, but the stagger must fire only on first-paint. Re-firing it on every tab swap would compound visibly. Action: `useTabs()` should expose a `firstMount` flag per panel; the React `<PostCardGrid>` consumes it as `staggerOnMount`.

**Audit findings**

- The plan's original P04 description named four motions (avatar push, header reveal stagger, tab slide, follow flow). After scanning production, three of those have no source: (1) avatar push lives at the route-transition layer, not the profile page itself; (2) header has no entrance stagger — name/avatar/bio paint together; (3) tab slide does not exist. Only the follow flow is a real proposal, and it's Extended. P04 reflects the actual production surface rather than the original speculative scope. Plan's P04 §Choreography line should be revised on the next pass to match: "tabs (instant), manage-portal dropIn, card grid stagger (production), follow toggle (extended)".
- The manage-portal has no exit animation in production — `closePortal()` at `:967` flips `display: none` directly. Adding an exit (e.g., 80ms opacity fade) is tempting but would require switching from the keyframe to a transition pattern; not worth it for a 120ms-open menu where the user already has visual closure from the outside-click.

### From P05 — Post Editor

P05 is the first P-file to land. It composes C01 (publish button), C02 (meta-input + modal-field + borderless title/body), C04 (autosave indicator), and C07 (toolbar tooltip primary). The page-level finding: **the Post Editor is a low-chrome surface — there is almost no page-wide motion**. Focus rings, hover tooltips, and the autosave dot are all field-local. This is the right design (writing surfaces should not twitch), and P05 documents it explicitly so future contributors aren't tempted to add hero-style entry choreography.

**Production sources — verified 1:1**

- **Toolbar tooltip (`.tb-btn-tip`).** Sourced 1:1 from `pages/Verita Post Editor.html:248–257`. 100ms instant fade, accent-fill ink pill, no delay. P05's §1 mock is a CSS-faithful copy — same selector structure (`.tb-btn:hover .tb-btn-tip { opacity: 1 }`). This is the production *primary* tooltip (cited by C07 §1); the Extended hover-delay variant in C07 §4 is a different intent (ambient nav labels) and does not apply here.
- **Meta-input focus ring (`.meta-input`).** Sourced 1:1 from `pages/Verita Post Editor.html:335–343`. 38px height, 8px radius, 3px shadow `rgba(10,10,10,0.06)`, bg flips `--bg-surface` → `#fff` on focus. Three properties co-transition over 120ms (border-color, background, box-shadow). Cited from C02 §3.
- **Inline modal field (`.modal-field input`).** Sourced 1:1 from `pages/Verita Post Editor.html:419–422`. 36px height, 7px radius, 3px shadow on focus, **no bg-flip** — the modal is already on a white surface, so the flip would be redundant chrome. Cited from C02 §5; the meta-input vs modal-field bg-flip split is documented in C02 Inconsistencies §3 (encode as `flipOnFocus` prop driven by surface context).
- **Status pill (autosave indicator).** Sourced 1:1 from `pages/Verita Post Editor.html:125–138`. Static markup; class swap (`saving` / `saved`) toggles dot color over a 200ms `background` transition. P05's timeline references this; the demo does not re-mock the pill itself because C10 §4 already owns the production behavior.
- **Borderless title + body.** `.title-input` (line 189) and `.ed-textarea` (line 278) are intentionally borderless with no focus ring — the absence of chrome is the spec. P05's timeline rows mark these as "no transition" rather than treating it as a gap.

**Extended proposals**

- **Save state morph (P05 §4).** 240ms morph from "Save" label → checkmark scale-in (160ms, 80ms delay) with the button background fading from `--accent` → `--success`. Holds 1400ms, then reverts. The motivation: production routes save confirmation through the topbar status pill, which is passive and far from the action button. This proposal puts confirmation on the surface that originated the action — eye-tracking distance is minimal. **Not yet a React contract** — needs design confirmation before becoming the canonical save expression. If accepted, the topbar status pill stays (it covers autosave) and the morph layers on top of explicit *Save* / *Publish* clicks only.

**Audit findings**

- **No page-level entry choreography.** Unlike P02 (reading progress, comment stagger, sticky action bar) the editor surface is intentionally quiet. The only motion at `t=0` is field-local. Documented in the §1 timeline so the absence is normative, not a TODO.
- **Toolbar tooltips are the only ambient label affordance.** Production has no tooltips on the publish button, status pill, or topbar avatar. C07 Inconsistencies §1 already flagged this; P05 inherits the gap and does not paper over it.
- **Modal stack is single-depth.** The Link / Image dialogs do not nest. C03's `useModalStack()` is overkill for this page; P05's React hint specifies `useModalStack()` only for forward-compatibility (image picker → cropper would be a 2-deep stack, deferred).
- **No publish-flow progress indicator in production.** Plan originally listed "publish flow with progress" as P05 scope. The actual `.publish-btn` (line 148) does not show progress — clicking just transitions to the published post detail. This is consistent with C08's audit (determinate progress bar is Extended-tier, no production source). P05 does not mock a publish progress bar; if the React port adds one, it lives in C08 §6 (Extended `<ProgressBar>`).
- **No "focus mode" implementation.** Plan listed an optional focus mode that fades chrome to 0.4 opacity for distraction-free writing. There is no such mode in production today — `pages/Verita Post Editor.html` has no `.focus-mode` class or toggle. P05 does not mock it; deferred to a future Extended addition if/when the React port adopts it.

### From P06 — Digest Management

P06 orchestrates the digest hero (Generated ↔ Generating state toggle), the past-digest history list mount, and the topic follow surface. The original plan framed P06 around FLIP grid entry, drag-reorder, delete collapse, and inline rename — none of which exist in `pages/Verita Digest Management.html`. The actual production surface is a hero panel + a `card-appear` history grid + a topic-management table; P06 reflects the real surface and reroutes the speculative motions to Extended or to other tier files.

**Production sources — verified 1:1**

- **Gen-spinner (C08 §2 reuse).** Sourced 1:1 from `pages/Verita Digest Management.html:117–118` — 18px ring, 2px border at 15% white background + 70% white top-color, `animation: spin 1s linear infinite`. The `@keyframes spin { to { transform: rotate(360deg); } }` is defined inline at `:118`. This is the canonical loading vocabulary for the entire production app (C08 §2 deviations note: it is the *only* spinner in production and lives only on the dark hero surface). P06 mocks the dark hero verbatim so the spinner reads in its native context.
- **`card-appear` keyframe and stagger.** Verbatim from `pages/Verita Digest Management.html:186–187` — `@keyframes card-appear { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: none; } }` over 180ms ease-out. Production fires it on topic-card overflow expand (`:586` adds 35ms `animation-delay` per index) and per-card on `loadMoreDigests()` (`:521`). P06 layers a 35ms initial-mount stagger on the history list to surface the keyframe in its most legible context; React must gate the stagger behind a `firstPaint` flag so re-renders don't re-fire it.
- **Follow toggle (C10 §3 reuse).** Sourced 1:1 from `pages/Verita Digest Management.html:198–200` — 28px height, `transition: all 120ms` covering background, color, and border-color. Hollow → accent-fill on `.followed`. No scale, no haptic flash, no toast. The label flip (Follow ↔ Following) shares the same 120ms window. C10 §3 is canonical; P06 demonstrates the production behavior without re-litigating the spec.
- **State toggle uses `display:none` flip + 100ms color swap.** The `.hero-state-toggle` pills at `:120` use a 100ms `background` + `color` transition; the body swap itself (`hero-generated` ↔ `hero-generating`) is a `.hidden` class flip via `setHeroState()` (`:545–551`) — no built-in cross-fade. P06's demo layers `animation: fadeIn 180ms ease-out` on the entering body so reviewers can see the swap as a deliberate transition; the React port should encode this in a `<HeroBodySwap>` wrapper rather than adding the rule to every consumer.

**Extended proposals**

- **Schedule chip toggle.** Production has no schedule selector — the digest is hard-coded to 06:00 AM (`:290`). P06 §5 proposes a chip row using the C06 §4 cross-fade contract (160ms ease-out on bg/color/border-color), single-select, peer chips share dimensions to avoid layout shift on toggle. Pair with `useDigestSchedule()`. Why 160ms (not C10 §3's 120ms): chip toggle is a more deliberate selection than a bulk follow toggle; matching C06's chip tempo keeps the schedule chips and topic-filter chips visually unified.
- **Hero state cross-fade (formalize).** Production's `.hidden` class flip is a hard cut. P06 demonstrates a 180ms `fadeIn` overlay; the proposal is to encode this in the React `<DigestHero>` so Generated → Generating and Generating → Generated transitions both read as 180ms cross-fades. Skipping this makes the spinner appear to "snap in" rather than arrive.

**Audit findings**

- **Plan's original P06 scope is fictional.** "FLIP entry, drag-reorder, delete collapse, inline rename" do not exist in production — there is no drag handle on history rows, no delete affordance, no rename input. The page is read-only (history) + bulk-toggle (topics) + hero (digest status). P06's choreography has been rewritten to match the real surface: hero spinner, list mount, schedule chip (extended), follow toggle. The catalogue P06 §Choreography line above should be revised on the next pass to match — this deviations subsection is the canonical record in the meantime.
- **`card-appear` is an append/expand keyframe, not a sort/filter keyframe.** Production never animates list reordering on the digest grid — `renderDigestGrid()` (`:502–510`) bulk-replaces innerHTML, restaging the entire list with no per-row keyframe. The keyframe only fires when a card is *appended* via `loadMoreDigests()` (`:521`) or revealed via `toggleCat()` (`:586`). If filter / sort lands later, the keyframe would need to re-fire on reorder; today it does not.
- **Save-bar "Preferences saved" toast is local, not a C04 stack toast.** `pages/Verita Digest Management.html:227–228` defines its own `.toast` element (`bottom:70px`, `right:24px`, `background: var(--accent)`, 200ms opacity+translateY) — same one-off pattern as the Post Detail share toast (C12 deviation). Action: when migrating, either fold both into `showToast({variant:'success'})` from C04 or keep them as page-local components; do not introduce a third toast system.

### From P07 — Digest Post

P07 is a long-form aggregated reading view. The audit confirmed the production digest page (`pages/Verita Digest Post.html`) shares its reading-progress primitive verbatim with Post Detail, and otherwise carries item-level hover affordances and a bottom action pill — but **no entrance choreography, no TOC primitive, no per-item arrival motion**. P07 mirrors P02 structurally (same chrome, same `width 60ms linear` progress hairline) so the React layer can lift `useReadingProgress()` into a single shared hook.

**Production sources — verified 1:1**

- **Reading progress hairline (1:1).** `pages/Verita Digest Post.html:472–481` — `.reading-progress-bar { width: 0%; transition: width 60ms linear }` with `<div class="reading-progress">` fixed at `top: 0; left: 0; right: 0; height: 2px; z-index: 100`. Identical to `pages/Verita Post Detail.html:750–762` — same selector names, same JS handler shape (rect-based scroll arithmetic, `passive: true` listener). C08's audit already flagged this duplication; P07's deviations re-affirm: extract to `<ReadingProgress target />` shared by P02 + P07 in one pass.
- **Item-card hover family (1:1).** `pages/Verita Digest Post.html:360–371` — `.topic-event-link svg { transition: transform 120ms, color 120ms }` with `:hover svg { transform: translateX(2px) }`. Same arrow-shift idiom as C05's digest-card CTA, just at smaller amplitude (2px instead of 3px) because digest items are denser. P07 also lifts the row 1px on hover (`translateY(-1px)` + `border-color`, 160ms ease-out) — extends the C05 lift family to a row primitive that production paints as a static `.topic-event` block.
- **Bookmark + share toast (1:1).** `pages/Verita Digest Post.html:440–469` — bookmark uses C12's color-only swap (no scale), toast uses the local ink-pill at `bottom: 22px right: 22px` with `transition: opacity 200ms, transform 200ms`. P07's timeline cites these for completeness but does not re-mock them; C12 + C04 already own the canonical specs and P07 inherits both.

**Extended proposals (no production source)**

- **Section reveal stagger (220ms / 80ms step).** Production renders all `.topic-event` blocks together, no entrance. Proposed: `opacity + translateY(6px) → 0` over 220ms `cubic-bezier(0.22,1,0.36,1)`, 80ms stagger, **capped at 5 items** (longer digests skip the cascade past item 5 to avoid a 2-second unfold). Tempo borrows from C09's `fadeIn` family (180ms / 60ms) but slowed because digest items are dense headline-bearing blocks rather than comment rows — they need a touch more weight on arrival. Gate on `firstPaint` so back-nav with cached scroll position does not re-fire the cascade.
- **TOC sticky tracking (IntersectionObserver-driven).** Production has no table-of-contents primitive. Proposed: sidebar list anchored `position: sticky; top: 0` with active-section tracking via `IntersectionObserver` watching each `.topic-event-headline`. Active entry transitions `color` + `background` over 160ms ease-out — pure color is safe under reduced-motion (preserved). Observer's `rootMargin: "0px 0px -65% 0px"` so the entry highlights when the headline crosses the upper third, not when it just barely enters. Hook surface: `useTOC(scrollerRef, headingsRef) → { activeId, scrollTo(id) }`.

**Audit findings**

- **`useReadingProgress` is duplicated, not shared.** Both `pages/Verita Post Detail.html:750–762` and `pages/Verita Digest Post.html:472–481` ship identical 13-line CSS + JS. Same finding as C08's deviation — the extract-to-`<ReadingProgress>` action lands in one place when the React layer rationalizes both pages.
- **No comments section in production digest.** Plan's earlier P07 row referenced "completion celebration" + "cross-post swipe"; the production digest has neither. The page is a single long-form article with one reading-progress bar, item rows, and a bottom action pill. P07's choreography reflects the actual surface — reads as a sibling of P02, not a swipe-deck. Plan's P07 §Choreography line should be revised on the next pass to: "reading progress (production), section stagger (extended), TOC (extended), item hover (production)".
- **Topic pills are interactive in production but unused.** `.topic-pill` carries a 120ms bg/color hover transition (`pages/Verita Digest Post.html:268–271`) but production has no click handler — they look filterable but are not. Same risk surface as C06 Inconsistency §2 (`.tag-pill` decorative-vs-interactive ambiguity); converge with `<TagChip>` from C06 §4 if/when topic filtering ships on the digest page.
- **Bottom action pill is a 2-button subset of C12.** Production digest pill has Save + Share only — no Like, no Comments jump (the digest has no comments section). C12's `<ActionsPill>` should expose the action set as a prop (`actions={["save", "share"]}`) rather than render all four affordances unconditionally.

### From P08 — Admin

P08 is the Admin page demo. It composes inherited motion from C02 (`.search-input` §6), C06 (`.tab-btn` + `.tab-count` §3), C07 (manage-portal `dropIn` §3), and C10 (avatar identity for the Users table). The choreography is deliberately quiet — the production page is a low-motion table surface, and the demo preserves that calm rather than inventing entry choreography.

**Production findings (verified 1:1 against `pages/Verita Admin.html`)**

- **`.search-input` is the shortest field in the system (1:1).** `pages/Verita Admin.html:204–212` — 34px height, 8px radius, 240px width-cap, 3px focus shadow `rgba(10,10,10,0.06)`, bg flips `--bg-surface` → `#fff` on focus. Co-transitions `border-color`, `background`, and `box-shadow` over 120ms. C02 §6 already canonicalizes this; P08 surfaces it at the page level so the timeline shows when the focus fires (onFocus into the user-search wrap).
- **Tab swap is instant — no panel transition.** `:186–187` is a `display:none` flip on `.tab-panel`. The animated parts are the `.tab-btn` (color + border-bottom-color, 120ms) and the inline `.tab-count` (background `--bg-elevated` → `--accent`, color → `#fff`, 120ms). Same finding as P04: the *active count badge flipping to accent* is what carries the state change; adding a panel slide here would fight the table's identity (tables don't migrate). Sourced from C06 §3.
- **`.role-select` reuses the search-input focus signature (1:1).** `:331–338` — 30px height, 6px radius, native `<select>` with custom `::after` chevron, 3px focus shadow. The bg-flip + accent-border combo is the same vocabulary as `.search-input`, intentionally — admin's two field-local affordances share one focus expression so a row's interactive controls feel like one surface.
- **Action menu uses the manage-portal `dropIn` keyframe (1:1).** P08's `⋯` row menu mirrors C07 §3 exactly: `@keyframes dropIn 120ms ease-out` over opacity 0→1 + `translateY(-4px)→0` + `scale(0.97)→1`. Production destructive items get the only red hover surface in the system (`#FEF2F2`); P08 preserves that. The demo positions inline; the React port should body-portal to escape table `overflow` (same pattern as User Profile's `#manage-portal`).
- **Row dismiss / delete uses `@keyframes rowFade 400ms`.** `:347–359` defines two near-identical keyframes — `.row-dismissed` (warning-bg flash) and `.row-deleted` (danger-bg flash) — both fade opacity to 0 and collapse the row. See audit finding #1 below for the duplicate-keyframe-name issue.

**Extended proposals**

- **Stat-card hover (3-up KPI strip).** Production lands on the Flagged-content table directly — there's no admin overview row. P08 §2 proposes a 3-up strip (Flagged / Active users / Banned) that mirrors C05's card-hover signature: 160ms `translateY(-1px)` + 220ms shadow + 160ms `border-color` lift. Why mirror C05 rather than invent an admin-specific hover: the page-level motion vocabulary should carry one card hover, not two. Why include `border-color` in the transition: under reduced-motion the translate collapses, so the hairline border serves as the residual hover anchor. Action: confirm with design before this becomes the React `<StatCard>` default; if KPI tiles never ship, the section retires cleanly.
- **`useUserSearch(query, 250)` debounce.** Production fires `filterUsers()` per-keystroke (`:516`). 250ms is the conventional type-ahead debounce — same finding as P03 §Search. Without it, fast typers will trigger N filter passes where 1 is sufficient. Aspirational for the React port; P08 surfaces it in the React-hint footer rather than the timeline because the page renders no skeleton during filter (purely client-side).

**Audit findings**

- **Two `@keyframes rowFade` definitions (low).** `pages/Verita Admin.html:349` and `:355` both declare `@keyframes rowFade`; only the second takes effect (the danger-bg variant). The dismissed-vs-deleted distinction is kept by class (`.row-dismissed` vs `.row-deleted`) but both share the second keyframe's color in practice. Action: rename to `@keyframes rowDismiss` / `@keyframes rowDelete` or unify to one keyframe with a CSS-variable-driven bg-color, so both classes get the bg-tint they describe.
- **Local toast primitive, not C04 (medium).** `:381–385` defines a local ink-pill toast (`@keyframes toastIn` / `@keyframes toastOut`) at `bottom: 24px` with `animation: toastIn 200ms ease, toastOut 300ms ease 2s forwards`. Distinct from the C04 stack and the welcome pill — same situation C12 raised for the share toast. When migrating, decide whether this becomes a `showToast({variant:'success', position:'bottom-center'})` call in the C04 system or stays local.
- **No tooltips on icon-only affordances.** The `⋯` action-menu trigger and the role-select chevron carry no hover tooltip in production — same gap C07 Inconsistencies §1 flagged across the wider app. P08 inherits the gap; once C07 §4's hover-delay variant ships, retrofit the trigger and the chevron.
- **No bulk-select or inline edit in production.** The original Plan.md P08 row mentioned "table row filter (FLIP)", "inline edit row morph", and "bulk-select state". Scanning `pages/Verita Admin.html` confirms none of these exist — there is no FLIP filter (the user-search filter is a client-side text match), there is no inline edit (role changes via `<select>`, status via dialog), and there is no bulk-select toolbar. P08 reflects the actual production surface; the original P08 line in §Page demos should be revised on the next pass to: "stat-card hover (extended), search focus + role focus (production), tab switch (production), action menu (production), confirm dialog + row fade (production)".

### From P09 — 404 & Errors

P09 is the page-level demo for error surfaces. The production source (`pages/Verita 404.html`) is the most motion-thin file in the entire app — zero `@keyframes`, zero entrance choreography, only two 120ms color transitions on the recovery buttons. P09 surfaces this explicitly so future contributors aren't tempted to retro-fit a glitch / illustration motion the design intentionally lacks; the demo's three Extended sections propose where motion should land if/when it's adopted.

**Production findings (verified 1:1 against `pages/Verita 404.html`)**

- **404 page is a hard mount — no entry motion.** `pages/Verita 404.html:171` paints the `.card` synchronously. There is no fade, no stagger, no illustration draw. The only declared transitions in the file are `.btn-primary` `transition: background 120ms ease-out` (`:134`) and `.btn-ghost` `transition: color 120ms ease-out` (`:145`). The page deliberately reads as a quiet editorial surface — the italic numeral and the calm copy do the heavy lifting, not motion. Document this so the React port doesn't introduce a glitch or illustration animation by default.
- **Recovery CTA hover is the canonical button motion (1:1).** The two CTAs (`Go back` primary, `Back to Home` ghost) are sourced from `:120–147`. C01 §1 already canonicalizes the 120ms tint hover; P09's §5 surfaces it inline at the page level. No press feedback in production — same gap C01 Inconsistencies §4 flagged.

**Extended proposals (no production source)**

- **5-element mount cascade (280ms / 60ms step).** P09 §2 proposes layering an entrance on the 404 surface: kicker → numeral → headline → body → CTA, each fading + translating up 6px over 280ms ease-out at 60ms intervals (total 520ms). Why 280ms (not P02's 180ms): the surface is sparse — five elements alone on a page need a touch more weight on arrival than a dense comment row. Why 60ms step (matches P02): one stagger tempo across the page-level vocabulary keeps cascades visually unified. Gate on `firstPaint` so back-nav with cached scroll skips the cascade. If/when adopted, this is the only entrance motion the 404 surface should carry — do not add an illustration draw on top.
- **`useErrorToast()` over C04 §1 error variant.** P09 §3 proposes routing transient failures (network blip, optimistic save reject, background refresh failure) through the C04 bottom-right toast stack with `variant: 'error'` rather than full error pages. The hook wraps `showToast({variant:'error', message, lifetime: 4000})` and defaults `role="alert"` (C04 sets this on error variant). Stack still caps at 2 (C04 §1). Why prefer toast over banner: a banner forces a layout shift the user didn't ask for; a toast leaves the page state intact and recovers automatically on next success. Pair with `<ErrorBoundary>` so render-phase exceptions route to `<NotFoundLayout>` (full page) but render-success-with-failed-effect routes to the toast.
- **Inline form error sequencing (shake + delayed message).** P09 §4 formalizes the shake-then-message order C02 §9 introduced at the component level. Sequence: (1) field border flips to `--danger` over 120ms; (2) `field-shake 320ms` plays in parallel; (3) at `t=320ms` the message reveals (opacity + translateY(-2px → 0), 180ms). Typing into the field clears the error immediately — never re-shake on every keystroke. The 320ms gate is what keeps the message from sliding in *under* a still-vibrating box; without the delay the two motions read as one chaotic event.

**Audit findings**

- **No global error-boundary motion strategy in production.** The React app needs an `<ErrorBoundary>` contract that distinguishes (a) full-route failures (404, 500, auth wall) from (b) partial failures (one widget exploded, the rest of the page works). Production has no such split today — `pages/Verita 404.html` is reachable only via direct route. P09's React-hint encodes the split: full → `<NotFoundLayout>`, partial → `useErrorToast()`. Action: confirm before this becomes the React contract; the boundary's `onError` should also report to telemetry (out of scope for the demo).
- **No empty-state vocabulary in production.** Plan's earlier P09 row referenced "empty-state placeholders" but `pages/Verita Search Results.html:670–681` is the only empty state in the codebase, and it carries no motion (P03 deviations already flagged this). P09 does not mock empty states — they belong in the per-page surface that owns them (P03 search empty, P04 profile no-posts, etc.), not in a centralized error file. The plan's P09 §Choreography line should be revised on the next pass to: "404 mount cascade (extended), error toast via C04 (extended), inline form error sequencing (production + extended shake), recovery CTA (production)".
- **No global error banner in production.** The plan named "error banner slide-in" as P09 scope; scanning all `pages/*.html` confirms zero implementations. Routing this through C04's toast stack (per §3 above) is the proposed substitute — banners force layout shift and can't auto-stack, toasts do both for free. If the React port adds a true full-width banner later, it should compose against C04 rather than inventing a third toast surface (same finding C12 / P08 raised about local toast drift).

### From P10 — Auth & Sign-in Flow

P10 is the auth modal demo — Verita's richest production surface for form-field motion. Auth is the primary consumer of the `.field-box` family canonicalized in C02, and the only place the OTP cell pattern appears anywhere in the app. The page-level demo holds the field/step/OTP/submit choreography in one place so the React `<AuthFlow>` lifts cleanly without re-deriving motion from the modal scaffold.

**Production sources — verified 1:1**

- **`.field-box` focus (1:1).** `pages/Verita Auth.html:128–139` — 44px height, 8px radius, `--bg-elevated` background, 1px `--border-default`, `transition: border-color 120ms`, `.error` modifier flips border to `--danger` (line 133). No `:focus` pseudo-rule lives in production CSS; the focused-vs-rest contrast is carried by the browser's native focus ring on the inner `<input>` plus the JS-driven `.error` border swap. C02 §1 already canonicalizes the field-box; P10 surfaces it at the timeline level so the focus event has a `t=` slot in the page-level choreography.
- **Step panel `modalIn` reflow (1:1).** `pages/Verita Auth.html:97–100` defines the keyframe (200ms cubic-bezier(0.16,1,0.3,1) over opacity 0→1 + translateY(8px)→0 + scale(0.98)→1); `:327–330` defines the per-step re-fire trick (`m.style.animation = 'none'; m.offsetHeight; m.style.animation = ''`). Production never slides the panel sideways — every step change is a re-mount of the *same* card with the *same* keyframe. P10's stage stages this verbatim under `.step-panel .step` + `@keyframes stepIn` (a rename so it doesn't collide with C03's `modalIn` if both are inlined on a page).
- **OTP cell focus shift (1:1).** `pages/Verita Auth.html:160–175` — 52px height, 8px radius, `--bg-elevated` background, `transition: border-color 120ms, box-shadow 120ms`. `.focused` adds `box-shadow: 0 0 0 4px rgba(10,10,10,0.06)` + bg flip to `#fff` + `--text-primary` border (line 167). Caret is a 1.5px element with `animation: caret 1s steps(2) infinite` (lines 174–175). Crucially the input itself is `opacity: 0` + `caret-color: transparent` — the cell *paints* the caret, the input only *receives* keystrokes. The `.focused` class is JS-driven (lines 403–416), conditioned on `focused && !filled`, which is what creates the focus-shift effect: as the user types, the previous cell becomes `.filled` (no shadow), the next becomes `.focused` (4px shadow).

**Extended proposals (no production source)**

- **Submit pending + success morph.** Production CTA at `:142–148` carries only the `:disabled` variant (background swap to `--border-default`). No spinner, no success state — clicking "Log in" goes straight to `show('screen-otp')` with no async stub. P10 §4 proposes a 14px white-on-translucent spinner inside the CTA during `pending`, and a 280ms background morph to `--success` plus a stroke-draw ✓ (`stroke-dasharray: 22; stroke-dashoffset 22 → 0`) on `success`. Why morph the CTA itself rather than fire a separate confirmation: the modal's intended next action is dismiss, so the button-as-confirmation reuses the user's existing visual anchor instead of pulling focus to a new toast. Action: confirm with design before this becomes the React contract; if the C04 welcome-toast is judged sufficient signal post-close, retire the success morph and keep only the spinner.
- **Field error shake.** Production triggers errors with a `display: flex` reveal of `.field-error` plus `.field-box.error` border swap (`:133`, `:244`, `:358–359`). No shake exists. P10 §4 imports the C02 §error-shake proposal — `@keyframes field-shake { 20%/60% translateX(-4px); 40%/80% translateX(4px); }` over 320ms — applied as a one-shot class flush on submit-failure. The shake is *additive* to the production border swap, not a replacement: under reduced-motion the border still flips, only the translate is suppressed.

**Audit findings**

- **Auth is the only place `.field-box` does NOT bg-flip on focus (medium).** Cross-page scan confirms: `.search-input` (Admin), `.search` (Home topbar), `.meta-input` (Post Editor), `.modal-field input` (Post Editor inline modals) all flip `--bg-elevated` → `#fff` on focus; Auth's `.field-box` does not. Already cited in C02 Inconsistencies §3 with the rationale (fields on a tinted page surface flip white to feel "active"; fields on a `#fff` surface — the auth modal — don't). P10 surfaces the exception at the page level so the React `<TextField surface="modal">` knows when to suppress the flip; the convergence target in C02 (a `flipOnFocus` prop driven by surface context) covers this. Action: when `<AuthFlow>` lands, pass `surface="modal"` to its `<TextField>` instances; do not duplicate the no-flip behavior as a per-call CSS override.
- **Step transition is a reflow trick, not a real animation.** `pages/Verita Auth.html:327–330` re-fires the `modalIn` keyframe by toggling `style.animation = 'none'` + reading `offsetHeight` + restoring. This works but conflates "open modal" with "navigate within modal" — both look identical at 200ms. Action: when `useAuthStep()` lands, decide whether step transitions deserve a distinct (lighter, ~120ms opacity-only) signature so the user can tell "modal opened" from "I advanced one step". The current shared keyframe is acceptable for v1 since the flow is rarely deeper than 2 steps.
- **OTP `.focused` is conditioned on `!filled`, which is non-obvious.** Production logic at `:407–408` only sets `.focused` if the cell is empty. Once the cell receives a keystroke, it becomes `.filled` and loses the 4px shadow — focus visually advances even though DOM focus has already moved to the next input. This is the right behavior (the user's eye tracks the shadow, not the DOM), but it means `useOTPInput()` owns *visual* focus separately from *input* focus. Document this in the React port — naive `:focus-visible` styling will paint two cells as focused for one frame.
- **Password visibility toggle not re-mocked in P10 §1.** P10's stage hides the `.field-eye` from the production password row to keep the demo focused on focus + error motion. The eye icon morph (eye → eye-off, 120ms color) is canonical in C02 §1 and inherited by the React `<TextField type="password">`; P10 cites but does not re-mock to stay under the 400-line bar.

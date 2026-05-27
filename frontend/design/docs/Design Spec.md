# Verita Design Spec

> Generated from HTML prototypes · v2.1 (Home feed card refinement — cover 16:10, card size ~340px, digest 5:6 vertical, text-card rhythm fix) · 2026-05-21

---

## Table of Contents

- [1. Design Tokens](#1-design-tokens)
  - [1.1 Colors](#11-colors)
  - [1.2 Typography](#12-typography)
  - [1.3 Spacing & Radius](#13-spacing--radius)
  - [1.4 Elevation & Shadows](#14-elevation--shadows)
  - [1.5 Motion](#15-motion)
- [2. Global Components](#2-global-components)
  - [2.1 Sidebar](#21-sidebar)
  - [2.2 Top Bar](#22-top-bar)
  - [2.3 Post Card](#23-post-card)
  - [2.4 Auth Modal](#24-auth-modal)
  - [2.5 Settings Modal](#25-settings-modal)
  - [2.6 Toast](#26-toast)
  - [2.7 Skeleton Loader](#27-skeleton-loader)
  - [2.8 Avatars](#28-avatars)
  - [2.9 Buttons](#29-buttons)
  - [2.10 Inputs & Fields](#210-inputs--fields)
- [3. Page Specs](#3-page-specs)
  - [3.1 Home Feed](#31-home-feed)
  - [3.2 Post Detail](#32-post-detail)
  - [3.3 Post Editor](#33-post-editor)
  - [3.4 Search Results](#34-search-results)
  - [3.5 User Profile](#35-user-profile)
  - [3.6 Digest Management](#36-digest-management)
  - [3.7 Digest Post](#37-digest-post)
  - [3.8 Admin](#38-admin)
  - [3.9 Settings](#39-settings)
  - [3.10 404](#310-404)
- [4. Interaction Patterns](#4-interaction-patterns)
  - [4.1 Auth Gate](#41-auth-gate)
  - [4.2 Back Navigation](#42-back-navigation)
  - [4.3 Modal Dismiss](#43-modal-dismiss)
  - [4.4 Sidebar Behavior](#44-sidebar-behavior)
  - [4.5 Auto-save](#45-auto-save)
  - [4.6 Reading Progress](#46-reading-progress)
- [5. Responsive Strategy](#5-responsive-strategy)

---

## 1. Design Tokens

### 1.1 Colors

#### Backgrounds

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#FFFFFF` | Page background, card surfaces |
| `--bg-surface` | `#F9F9F9` | Sidebar bg, input resting bg, AI panel bg |
| `--bg-elevated` | `#F0F0F0` | Search bar bg, tag pills, hover fills, skeleton base |
| `--bg-paper` | `oklch(97% 0.012 80)` | Home v3 cream block: text-only post card pull-quote panel, digest history card |

#### Foreground / Text

| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#0A0A0A` | Headings, body text, active nav |
| `--text-secondary` | `#6B6B6B` | Supporting copy, meta text, inactive nav |
| `--text-tertiary` | `#ABABAB` | Placeholders, timestamps, disabled labels |

> **Accessibility constraint.** `--text-tertiary` (#ABABAB on white = 2.85:1) **fails WCAG AA** for body text. It passes AA Large only (≥18pt, or ≥14pt bold). Use it strictly for non-essential decoration: timestamps, hint text, disabled-state labels, separators. Never use it for primary or secondary content. Use `--text-secondary` (5.6:1) for any text the user needs to read.

#### Borders

| Token | Value | Usage |
|---|---|---|
| `--border-subtle` | `#EBEBEB` | Card borders, section dividers, topbar border |
| `--border-default` | `#D4D4D4` | Input borders, button outlines, toggle borders |

#### Accent & Semantic

| Token | Value | Usage |
|---|---|---|
| `--accent` | `#0A0A0A` | Primary CTA, active toggle, focus ring |
| `--accent-hover` | `#333333` | Hover state for accent-colored elements |
| `--success` | `#16A34A` | Saved status dot, positive deltas |
| `--warning` | `#CA8A04` | Saving status dot, draft label, ban button |
| `--danger` | `#DC2626` | Error states, delete actions, admin flag badge |

> **Note:** Verita uses a monochrome accent system. The primary interactive color is `#0A0A0A` (near-black). All semantic colors (success/warning/danger) are reserved for status indicators only.

---

### 1.2 Typography

#### Font Families

| Token | Family | Usage |
|---|---|---|
| `--font-sans` | `"Inter", system-ui, sans-serif` | Body text, UI labels, nav items, buttons |
| `--font-mono` | `"JetBrains Mono", monospace` | Code blocks, timestamps, stat pills, tag chips in editor |
| `--font-serif` | `"Newsreader", Georgia, serif` | Brand wordmark (italic 500), pull quotes (italic), digest titles, 404 numeral |

#### Type Scale

| Element | Size | Weight | Tracking |
|---|---|---|---|
| Page title (Post Detail) | 32px | 700 | -0.025em |
| Section heading (md h2) | 22px | 700 | -0.02em |
| Subheading (md h3) | 16px | 600 | -0.01em |
| Body text (md) | 15px | 400 | -0.005em |
| Card title (Home v3) | 19px | 700 | -0.015em |
| Card title (legacy framed cards) | 15px | 600 | default |
| UI label / nav | 15px | 500 | default |
| Meta / caption | 13–13.5px | 500 | default |
| Section label (uppercase) | 10–10.5px | 600 | 0.06–0.08em |
| Brand wordmark (Home v3) | 32px | 500 italic | -0.02em (lead "V" rendered at 38px) |
| Base body | 13px | 400 | default |

---

### 1.3 Spacing & Radius

#### Spacing Scale

| Use | Value |
|---|---|
| Sidebar width (full-width pages) — token `--sidebar-w` | 240px |
| Sidebar rail width (collapsed pages) — token `--sidebar-rail` | 60px collapsed → 240px expanded on hover |
| Sidebar padding | 0 top, 14px sides, 16px bottom (top space owned by brand block) |
| Brand block height | 88px, content `align-items: flex-end`, `padding-bottom: 16px` (V/Verita sits 16px above first nav-item) |
| Topbar padding | 14px vertical, 24–28px horizontal |
| Feed wrap (masonry area) | `clamp(24px, 4vw, 80px)` horizontal, max-width 1920px |
| Reader column padding | 28px top, 32px sides, 200px bottom |
| Card body padding (image card, below cover) | 12px top, 8px sides, 4px bottom |
| Card body padding (text card, below cream block) | 12px top, 8px sides, 4px bottom |
| Cream block (text card) internal padding | 14px top, 16px left, 28px right, 14px bottom |
| Masonry max-width | 1144px |
| Masonry column gap | 32px |
| Masonry card gap (vertical) | 24px (margin-bottom) |
| Masonry stagger | 5n+2 / 7n+4 organic offset (10–16px) |
| Nav item gap | 4px |
| Nav item internal gap | 13px (icon to label) |
| Nav item padding | 16px 14px (hover-expanded / static); collapsed rail uses `16px 0` + `justify-content: center` |
| Nav icon size | 24×24px |

#### Border Radius

| Element | Radius |
|---|---|
| Cards (Home v3 cover + cream block) | 12px |
| Cards (legacy framed) | 10px |
| Modals | 14px |
| Buttons (primary, ghost) | 7–8px |
| Search bar | 10px |
| Input fields | 8px |
| Tag pills | 4px |
| Badge pills | 999px (full round) |
| Avatars (topbar) | 10–12px (squircle) |
| Avatars (profile) | 50% (circle) |
| FAB / Refresh | 14px |
| Code blocks | 10px |
| Toast | 10px |

---

### 1.4 Elevation & Shadows

| Level | Shadow | Used on |
|---|---|---|
| Subtle hover | `0 6px 20px -10px rgba(0,0,0,0.12)` | Card hover lift |
| Floating bar | `0 4px 20px rgba(0,0,0,0.10)` | Actions pill, composer pill |
| Modal | `0 24px 60px -12px rgba(0,0,0,0.32)` | Auth modal, settings modal |
| Toast | `0 10px 30px rgba(0,0,0,0.25)` | Toast notification |
| FAB | `0 10px 24px -8px rgba(0,0,0,0.35)` | Refresh FAB |
| Dropdown | `0 8px 24px rgba(0,0,0,0.10)` | Sort dropdown, manage menu |

> **Topbar blur:** `background: rgba(255,255,255,0.85); backdrop-filter: saturate(160%) blur(10px);` — used on all sticky topbars.

---

### 1.5 Motion

| Property | Duration | Easing | Context |
|---|---|---|---|
| Hover bg/color | 120ms | ease-out | Nav items, buttons, cards |
| Card lift | 160ms | ease-out | translateY(-1px) on hover |
| Modal enter | 200ms | cubic-bezier(0.16,1,0.3,1) | Scale 0.98→1 + translateY(8→0) |
| Sidebar width | 200ms | ease | 60px ↔ 240px expand/collapse (rail pages) |
| AI panel expand | 280ms | cubic-bezier(0.22,1,0.36,1) | max-height 0→900px |
| Toast show/hide | 200ms | ease | opacity + translateY(8px) |
| FAB spin | 600ms | cubic-bezier(0.4,0,0.2,1) | rotate(360deg) on click |
| Sidebar label appear | 150ms | ease, 60ms delay | opacity 0→1 on sidebar hover |
| Skeleton shimmer | 1.4s | ease-in-out, infinite | opacity 1→0.45→1 pulse |
| OTP caret blink | 1s | steps(2), infinite | opacity toggle |

---

## 2. Global Components

### 2.1 Sidebar

Two structural variants depending on page context:

| Property | Mode A — Static (Home / Search / Settings / Home+Settings) | Mode B — Rail (Post Detail / Editor / Profile / Digest Post / Digest Mgmt / Admin) |
|---|---|---|
| Width | 240px (`var(--sidebar-w)`), static | 60px (`var(--sidebar-rail)`) collapsed → 240px on hover |
| Brand block | 88px tall block, content centered horizontally + flex-end vertically with `padding-bottom: 16px` | Same 88px block; collapsed shows only "V" (38px serif italic 600, `transform: translateX(-2px)` for optical centering of italic glyph), JS swaps `textContent` to "Verita" on hover |
| Brand swap mechanism | Static "Verita" wordmark, no swap | JS: on `mouseenter` of `#sidebar`, set `#brandWord` textContent to "Verita"; on `mouseleave`, restore "V" |
| Nav labels | Always visible, 15px / 500 | Hidden in collapsed (`width: 0`); fade in on hover (150ms, 60ms delay) |
| Nav icons | 24×24px | 24×24px (collapsed icon centered in 60px rail via `justify-content: center` + `padding: 16px 0`) |
| Nav item padding | 16px 14px, 4px gap between items, 13px icon-to-label gap | 16px 0 collapsed → 16px 14px on hover |
| Badge (Digest count) | Always visible (10.5px) | Hidden in collapsed (`width: 0`); fade in on hover |
| Active indicator | 3px left bar (accent) + elevated bg | Same, only on hover-expanded state |
| FAB (New post / Sign in CTA) | Full-width button with icon + label, sits at bottom | Collapsed: 36×36 icon button, centered horizontally in rail. Hover-expanded: morphs to full-width "+ New post" button matching Mode A. |
| Auth state toggle (prototype) | In sidebar spacer (segmented control) | Moved to top bar center (absolute-positioned, `left: 50%; transform: translate(-50%, -50%)`) so collapsed rail is unobstructed |

#### Nav Items

- **Primary:** Explore (compass icon) · Digest (lightning icon, badge count)
- **CTA (logged-in):** "New post" — accent bg, white text, rounded 8px
- **CTA (logged-out):** "Sign in" — same visual as New post, different label + arrow icon
- **Bottom:** Settings (gear icon) — greyed out + disabled when logged out

#### Auth State Toggle (prototype only)

Segmented control "Logged out" | "Logged in" with active segment getting accent bg + white text. **Mode A** pages render this in the sidebar spacer (sidebar always wide, has space). **Mode B** pages render it absolute-positioned in the top bar center (`left: 50%; transform: translate(-50%, -50%)`) so the collapsed rail isn't pushed around. Prototype-only control; not shipped to production.

---

### 2.2 Top Bar

Sticky at top, z-index 20. Frosted-glass effect (`backdrop-filter: blur(10px)`). Five layout variants:

| Page | Layout |
|---|---|
| Home / Search | Full-width search input (flex:1) · avatar or "Sign in" button · Tag filter bar below (Home only) |
| Post Detail / Digest Post | ← Back label (left) · compact search (280px) + avatar (right) |
| Post Editor | ← Back label · spacer · word count pill (mono) · status pill · Publish button · avatar |
| User Profile | ← Back label · full search · avatar |
| Admin | "Admin" title (serif italic) · "ADMIN ROLE REQUIRED" badge · auth state toggle |

#### Scroll Shadow

Home/Search topbar gains a subtle bottom shadow (`linear-gradient(180deg, rgba(0,0,0,0.04), transparent)`, 8px pseudo-element) once `scrollY > 6`.

---

### 2.3 Post Card

Home v3 cards are **frameless** — no background, no border, no card chrome on the wrapper. Differentiation between card types comes from the **colored block** (cover photo or cream pull-quote panel), not from card outlines. All variants share the same scan rhythm: `[colored block] → [title (bare text)] → [author row (bare text)]`.

| Variant | Visual | Content |
|---|---|---|
| Image card | 12px-radius cover image, **16:10 aspect-ratio**, overlay badges (TL: type, TR: read time). No card chrome around the cover. | Title (3-line clamp, **16px / 700**, `text-wrap: auto`) **below cover** as bare text · author row (22px avatar, 12.5px name, 11.5px meta) · card body padding 12px top / 8px sides / 4px bottom |
| Text card | 12px-radius cream block (`oklch(97% 0.012 80)`, padding `14px 28px 14px 16px` top/right/bottom/left). No card chrome around the block. | Inside block: small uppercase eyebrow (10px / 600 / 0.08em tracking) + serif italic pull-quote (**16px, line-height 1.7**) with 2px solid left bar + 12px padding-left, clamp 4 lines. Outside block: title (**16px / 700**) + author row, both bare text below. Card body padding-top 12px to match image card gap. |
| Digest card | Curator's break-the-rhythm card. `#0A0A0A` dark bg, white text, own 12px radius, **`aspect-ratio: 5/6`**, internal padding `24px 26px`. **Flex column** so CTA pins to bottom via `margin-top: auto`. | Label + sublabel (11px, "N picks · X min read") · title (serif italic **22px**) · hairline divider · 4-bullet summary · affordance row (text + arrow icon, no button — whole card is a link) |
| Code card (Home + Settings only) | Black `code-preview` panel as cover-equivalent (12px radius, mono inside) | Same posture as image card: code panel + title outside + author row |
| Thread card (Home + Settings, Search) | Cream block holds eyebrow + thread snippet inside; title + author below | Same structural rule as text card |

#### Author Row (Home v3)

`22px` circle avatar (initials, gradient bg) · Name (12.5px / 500) · "·" · Time ago (11.5px / `--text-secondary`) · Heart icon (13px svg) + like count (12px tabular-nums, right-aligned). No top divider on either image or text cards.

User Profile and Search Results use slightly different scales — see page specs below.

#### Card States

- **Hover (image card):** colored block lifts with soft drop-shadow `0 8px 24px -12px rgba(0,0,0,0.18)`; whole card translates -1px
- **Hover (text card):** cream block lifts with same shadow; whole card translates -1px
- **Hover (digest card):** subtle bg darken
- **Pressed:** No explicit active state (navigates immediately)

> **Frameless rule of thumb:** if you find yourself adding a `border` or `background` to `.card`, you're re-introducing chrome. The colored block (cover or cream) is what carries the silhouette.

---

### 2.4 Auth Modal

Centered overlay with blurred backdrop. Four screens within one modal shell:

1. **Login:** Email + password fields, "Log in" CTA, "Forgot password?" link, tab to Sign up
2. **Sign up:** Username + email + password, "Create account" CTA, terms notice, tab to Log in
3. **Forgot password:** Back arrow → login, email field, "Send reset link" CTA
4. **OTP verification:** 6-digit code input grid (mono 22px), auto-advance, auto-submit on fill

#### Modal Shell

- Width: `380px`, padding: `24px 28px 26px`, radius: `14px`
- Shadow: `0 24px 60px -12px rgba(0,0,0,0.32)`
- Entry animation: `translateY(8px) scale(0.98) → 0 scale(1)`, 200ms spring curve
- Close button: top-right 28×28px, hover → elevated bg
- Backdrop: `rgba(10,10,10,0.36)` + `blur(2px)`

---

### 2.5 Settings Modal

Overlay modal, 440px wide. Three sections:

- **Account:** Email (read-only) · Username (read-only) · "Edit Profile →" link
- **Digest:** Email frequency segmented control (Daily / Weekly / Off) · "Manage Topics →" link
- **Privacy:** "Show Bookmarks to others" toggle · "Show Likes to others" toggle

---

### 2.6 Toast

- Fixed bottom-right, 22px offset, z-index 60
- Accent bg (`#0A0A0A`), white text, 12.5px 500 weight
- Icon: green checkmark (`#9ce0a0`) or contextual
- Auto-dismiss: 2.4s (show → fade out)
- Entry: `translateY(8px) → 0`, opacity 0→1, 200ms

---

### 2.7 Skeleton Loader

- Background: `--bg-elevated` (`#F0F0F0`)
- Radius: 6px (generic blocks), matches component shape otherwise
- Animation: `shimmer` — opacity pulse 1 → 0.45 → 1, 1.4s ease-in-out infinite
- Structure mirrors card layout: optional cover slab + 2–4 line blocks at varying widths (100%, 80%, 60%, 40%)

---

### 2.8 Avatars

| Context | Size | Shape | Content |
|---|---|---|---|
| Topbar (own user) | 34–44px | Squircle (10–12px radius) | Gradient bg with CSS face illustration |
| Author row (Home v3 cards) | 28px | Circle | Initials, gradient bg |
| Author row (User Profile cards) | 26px | Circle | Initials, gradient bg |
| Post Detail author | 36px | Circle | Initials, gradient bg |
| Comment author | 28px (top) / 22px (reply) | Circle | Initials, gradient bg |
| User Profile header | 80px | Circle | Initials or photo, 3px border + 1.5px ring |

---

### 2.9 Buttons

| Variant | Style | Height | Radius |
|---|---|---|---|
| Primary (CTA) | Accent bg, white text, 600 weight | 34–44px | 7–8px |
| Ghost | Transparent, border-default, secondary text | 34px | 7px |
| Danger | Red-tinted bg (`#FEF2F2`), red text, red border | 30px | 6px |
| Warn | Yellow-tinted bg (`#FEFCE8`), yellow text | 30px | 6px |
| Success | Green-tinted bg (`#F0FDF4`), green text | 30px | 6px |
| Icon-only (toolbar) | 32×32px, hover → elevated bg | 32px | 6px |

---

### 2.10 Inputs & Fields

- **Height:** 38–44px. **Radius:** 8px. **Border:** `--border-subtle` resting, `--accent` on focus.
- **Focus ring:** `box-shadow: 0 0 0 3–4px rgba(10,10,10,0.06)`. Background transitions from `--bg-elevated`/`--bg-surface` to `#fff`.
- **Error state:** Border becomes `--danger`. Error message below: 11.5px, danger color, with alert icon.
- **Search bar:** Left-aligned search icon (16px, tertiary color), no border on inner input.
- **Tags input:** Flex-wrap container holding tag chips + trailing text input. Chips: mono font, `--bg-elevated` bg, 4px radius, × remove button.

---

## 3. Page Specs

### 3.1 Home Feed

**Route:** `/`

#### Layout

- Grid: `240px sidebar | 1fr main`
- Sidebar: Mode A static 240px, brand block 88px tall with "Verita" wordmark centered horizontally + bottom (16px above first nav-item)
- Topbar: Search bar + avatar + tag filter bar
- Feed: Masonry via **CSS columns** (`column-count`), responsive: 3 cols ≥1144, 2 cols 760–1143, 1 col <760. Column gap **32px**, card margin-bottom **24px**. Max-width **1144px**.
- **Stagger:** every 5n+2 and 7n+4 card gets a **10–16px** `margin-top` offset for organic, non-stair-step rhythm
- Max content width: 1920px, centered
- Feed-wrap horizontal padding: `clamp(24px, 4vw, 80px)`

#### Components

- Tag filter bar: horizontal scroll, first chip = "For you" (logged-in) / "Trending" (logged-out), active = bold text
- Auth banner (logged-out): rounded card above feed, "Browsing as guest" text + Log in / Create account buttons
- Refresh FAB: fixed bottom-right, 52×52px, accent bg, rotate animation on click, reshuffles cards
- Digest card: always first position in feed

#### States

| State | Behavior |
|---|---|
| Logged-in | "For you" first chip · digest badge visible · New Post CTA · avatar in topbar · no auth banner |
| Logged-out | "Trending" first chip · no digest badge · Sign In CTA · Sign in button in topbar · auth banner shown · Settings disabled |
| Hover (card) | translateY(-1px), border darken, shadow appear |
| Hover (nav) | Elevated bg, text → primary |
| Scroll > 6px | Topbar gains subtle bottom shadow |

---

### 3.2 Post Detail

**Route:** `/post/:id`

#### Layout

- Grid: `60px sidebar (collapsed) | 1fr main`
- Topbar: ← Back label + compact search + avatar
- Reader column: centered, max-width 720px
- Reading progress bar: 2px fixed at top of viewport, accent color

#### Components

- **Author block:** 36px avatar · name + verified badge · org · time ago · publish date
- **AI summary:** Collapsed toggle button (pill shape, chevron icon). Expands to panel with 4–6 bullets, source refs, regenerate link. Panel: `--bg-surface` bg, subtle border, 12px radius.
- **Markdown body:** Full rich-text rendering — headings, code blocks (dark bg), blockquotes (left border, serif italic), figures, stat tables
- **Meta row:** Tag pills + external source link at article end
- **Engage strip:** Like count · Comment count · Save count · View count
- **Floating bottom bar:** Two pill components — actions pill (Like/Save/Share/Jump to comments) + composer pill (comment input, expands on click)
- **Comments:** Sort dropdown (Newest/Oldest/Most Liked) · threaded at one level (replies indented with left border) · inline reply input · OP badge · role badge (mono)

#### States

| State | Behavior |
|---|---|
| Logged-in | All actions work. Composer shows avatar + input. New Post CTA in sidebar. |
| Logged-out | Like/Save → auth gate. Composer replaced with "Sign in to comment" bar. Sign In CTA in sidebar. |
| AI panel open | Chevron rotates 180°, panel animates open with max-height transition 280ms |
| Composer expanded | Single-line → multi-line textarea + char count + send button |
| Like toggled | Icon fills, weight goes to 600, count increments |
| Share clicked | Toast: "Link copied to clipboard" |

---

### 3.3 Post Editor

**Route:** `/post/new` · `/post/:id/edit`

#### Layout

- Grid: `60px sidebar (collapsed) | 1fr main`
- Topbar: ← Back + word count pill + status pill + Publish btn + avatar
- Canvas: centered, max-width 760px

#### Components

- **Cover zone:** Add cover image button (dashed border) → file picker → 3:2 preview with remove button
- **Title input:** 32px, 700 weight, auto-resize textarea
- **Toolbar:** Bold · Italic · Code · Code block | Link · Image | H1 · H2 · H3 · Blockquote · Divider | Edit/Preview toggle. Each button 32×32px, tooltip on hover.
- **Editor area:** Mono font textarea (14px, line-height 1.7). Preview mode renders markdown with full .md styles.
- **Meta section:** Sources (multi-URL, add/remove rows) + Tags (chip input, max 10)
- **Modals:** Link insert, Image insert, Publish confirmation

#### States

| State | Visual |
|---|---|
| Draft | Grey dot in status pill, label "Draft" |
| Saving | Yellow dot (`--warning`), label "Saving…" — triggers 2s after last keystroke |
| Saved | Green dot (`--success`), label "Saved" |
| Published | Green dot, label "Published", toast "Post published to Verita" |
| Publish confirm | Centered modal: icon + "Ready to publish?" + "Keep editing" / "Publish now" buttons |
| Preview mode | Toolbar buttons disabled, markdown rendered in .md styles, "Preview" badge shown |

---

### 3.4 Search Results

**Route:** `/search?q=`

#### Layout

- Grid: `240px sidebar (full) | 1fr main`
- Same Home v3 masonry rules (CSS columns, 3/2/1 cols at 1280 / 880 breakpoints, organic stagger), no tag filter bar
- Search input pre-filled with query, has clear (×) button

#### Components

- **Results header:** "{N} results for {query}" — count in 600 weight, query in mono code pill
- **Masonry grid:** Same Home v3 frameless card variants (image, text-quote, thread). Skeletons alternate between cover-style and cream-block-style during load.

#### States

| State | Visual |
|---|---|
| Results | Results header + masonry grid of matching cards |
| Loading | "Searching…" header + skeleton card grid (shimmer pulse) |
| Empty | "0 results" header + centered empty state: search icon, "No results found" title, description with query echo, Clear search / Browse feed buttons |

---

### 3.5 User Profile

**Route:** `/profile/:username`

#### Layout

- Grid: `60px sidebar (collapsed) | 1fr main`
- Topbar: ← Back + full search + avatar
- Profile content: max-width 900px, centered

#### Components

- **Profile header:** 80px circle avatar (with edit pencil on own profile) · display name + verified badge · @handle · bio · meta row (org, joined date, website) · stats row (posts, followers, following, likes received)
- **Tabs (sticky):** Posts (count) · Bookmarks (count) · Drafts (count) · Likes (count). Active tab: accent underline + accent count badge.
- **Posts grid:** 3-column masonry of frameless post cards (Home v3 system) — cover image with own 12px radius and 4:3 aspect-ratio, title 19px / 700 below cover, 26px avatar in author row, no card chrome, no internal divider. Text-only posts use the cream block (`oklch(97% 0.012 80)`) applied to `.card-body` so the eyebrow + title + summary live inside the cream and the footer (likes/views/manage) sits below as bare text. Own profile shows ⋯ manage button anchored top-right of the cover.
- **Draft cards:** Dashed border kept (functional cue: "not published yet"), yellow "DRAFT" status label, 3 action buttons inline (Publish/Edit/Delete), title scaled to v3 17px / 700.
- **Edit Profile modal:** Avatar section + form fields (Display Name, Bio, Organization, Website, Research Interests) + save/cancel.
- **Delete confirmation modal:** Red icon + title + description + post preview snippet + Cancel/Delete buttons.

#### States

| State | Behavior |
|---|---|
| Own profile | All tabs visible. Edit pencil on avatar. ⋯ manage on published posts. Draft tab shown. |
| Other profile | Only Posts tab guaranteed. Bookmarks/Likes visibility depends on privacy settings. |
| Logged-out | Only Posts tab visible. No edit controls. |
| Manage menu | Portaled dropdown (fixed position): Edit → Editor, Unpublish → converts to draft, Delete → confirmation modal. |

---

### 3.6 Digest Management

**Route:** `/digest`

#### Layout

- Grid: `60px sidebar (collapsed) | 1fr main`
- Topbar: ← Back + centered search + avatar/sign-in
- Tab bar: "Past Digests" | "Manage Topics"

#### Past Digests Tab

- **Today hero (logged-in):** Dark card (`#0A0A0A`), serif italic title, subtitle, meta row (events/mins/generated time), "Read →" CTA. Toggle between Generated/Generating states.
- **Sign-in hero (logged-out):** Dark card with upsell — "Sign in for your personalised digest" + Log in / Create account buttons.
- **Digest grid:** 4-column grid of **frameless cream blocks** (`oklch(97% 0.012 80)`, 12px radius, 18px internal padding) holding date eyebrow (mono uppercase) + title as the in-block "pull quote" parallel. Topic pills, footer meta (events + mins), and "Read →" link sit BELOW the cream block as bare text — same scan rhythm as Home v3 text cards.
- **Load more:** Button below grid, paginates by 10.

#### Manage Topics Tab

- **Logged-in:** Category groups (Research, Models & Labs, Applications, Engineering) with 5-column topic cards. Each card: tag name, post count, activity bar, follow/unfollow button, follower count. Expand for more topics per category.
- **Logged-out:** Gate screen — "Sign in to manage your topics" + Log in / Create account.
- **Save bar:** Fixed bottom, "Following N topics" + Reset / Save preferences buttons.

---

### 3.7 Digest Post

**Route:** `/digest/:date`

#### Layout

Same reader-column layout as Post Detail (720px max). Reading progress bar at top.

#### Differences from Post Detail

| Element | Digest Post |
|---|---|
| Author row | "Verita AI Digest" badge (dark bg) + date + read time (mono pill) |
| Title | "Your Monday Digest" (logged-in) / "Today's Digest — May 13" (logged-out) |
| Topic pills row | Horizontal tag pills below title |
| Personalization slot | Logged-in: subtle callout "Personalised from 4 topics · Manage →". Logged-out: dark upsell banner. |
| Body | Structured topic events: headline + source (domain + time) + bullet list + external link |
| Comments | None |
| Floating bar | Save + Share only (no Like, no Comment) |
| Footer | "Generated by Verita AI" + "Manage Digest →" link (logged-in only) |

---

### 3.8 Admin

**Route:** `/admin`

#### Layout

- Grid: `60px sidebar (collapsed) | 1fr main`
- Topbar: "Admin" title (serif italic) + ADMIN badge + auth state toggle
- Tab bar: Moderation (count badge) | Users

#### Moderation Tab

Table: Type (post/comment pill) · Content preview (2-line clamp) + author · Reporter count (warning color) · Flagged date (mono) · Actions (Delete / Dismiss).

#### Users Tab

Table: User (avatar + name + @handle) · Email (mono) · Role pill (user/verified/admin) · Joined date · Status (active/banned) · Actions (role dropdown + ban/unban button).

Searchable via top-right search input. Empty state shown when no results.

#### States

| State | Behavior |
|---|---|
| Admin role | Full table UI shown |
| Non-admin / Guest | Access Denied screen: lock icon, "Access denied" heading, "← Back to Home" CTA |
| Delete action | Confirmation dialog overlay with content snippet preview. On confirm: row fades with red flash, toast "Content deleted permanently." |
| Dismiss action | Row fades with yellow flash, toast "Flag dismissed — content preserved." |
| Role change | Immediate re-render, toast "@handle role changed: old → new" |
| Ban/unban | Immediate re-render, toast message |
| All flags cleared | Empty state: checkmark icon, "No flagged content" message |

---

### 3.9 Settings

**Type:** Modal overlay (no dedicated route)

Triggered by sidebar Settings item (logged-in only). Rendered as a modal over whatever page is currently active. See [2.5 Settings Modal](#25-settings-modal) for component spec.

---

### 3.10 404

**Route:** `*` (catch-all)

#### Layout

Full-viewport centered, no sidebar. Single card (max-width 520px) on `--bg-surface` bg:

- **Kicker:** "route not found · error 404" (mono, 11px, uppercase)
- **Numeral:** "404" (serif italic, 72–120px responsive clamp)
- **Headline:** "This page has gone off the record." (serif italic 22px)
- **Body:** Explanation copy (14px, secondary color)
- **Actions:** "Go back" (primary btn with ← arrow) + "Back to Home" (ghost link)
- **Wordmark** below card

---

## 4. Interaction Patterns

### 4.1 Auth Gate

Any auth-gated action performed while logged out triggers the Auth Modal instead of executing the action. Gated actions:

- Like/Save a post or comment (Post Detail, Digest Post)
- Submit a comment or reply (Post Detail)
- Create a new post (sidebar CTA)
- Open Settings
- Manage digest topics

The Auth Modal stores the intended action and executes it after successful login (e.g., auto-focus comment input).

---

### 4.2 Back Navigation

Sub-pages show a `← Label` button in the top-left of the topbar. Label reflects the previous page context:

```
← Explore     (from Home Feed)
← Search      (from Search Results)
← Digest      (from Digest Management)
← Post        (from Post Detail → Profile)
```

- Set via `location.state.from` when navigating via React Router
- Fallback: `← Explore` when state is absent (direct URL access)
- Click action: `navigate(-1)` (history back)

---

### 4.3 Modal Dismiss

All modals (Auth, Settings, Edit Profile, Delete Confirm, Link Insert, Image Insert, Publish Confirm) support three dismiss methods:

1. Click backdrop (outside modal)
2. Press `Escape`
3. Click explicit × close button (where present)

Auth Modal close returns to current page. Settings modal close just hides it. Destructive modals (Delete) require explicit action — backdrop/Escape also dismisses without action.

---

### 4.4 Sidebar Behavior

| Behavior | Description |
|---|---|
| Mode A — Static (full-width) | Home Feed, Search Results, Settings, Home + Settings: sidebar is always **240px** wide, no collapse/expand. Brand block (88px tall, content centered horizontally + flex-end vertically with 16px bottom padding) renders the "Verita" wordmark always. |
| Mode B — Rail (hover-expand) | All others (Post Detail, Post Editor, Digest Post, User Profile, Admin, Digest Management): sidebar is **60px** rail. On hover, grid column transitions to **240px**, sidebar width expands, labels and badges fade in (150ms, 60ms delay). Brand block always 88px; collapsed shows only "V" (38px serif italic 600, optical-centered with `transform: translateX(-2px)`); JS swaps `textContent` from "V" to "Verita" on `mouseenter` of the sidebar. |
| Grid transition | `grid-template-columns` transitions via `:has(.sidebar:hover)` — 200ms ease. |
| CTA / FAB | Mode A: full-width "+ New post" / "Sign in" button. Mode B collapsed: 36×36 icon button centered horizontally in the rail. Mode B hover-expanded: morphs to full-width "+ New post" matching Mode A. |
| Auth toggle (prototype) | Mode A: in sidebar spacer. Mode B: in top bar center (`left:50%; transform: translate(-50%, -50%)`) so the rail stays clean. |

---

### 4.5 Auto-save

Post Editor specific:

- **Debounced:** triggers 2 seconds after user stops typing
- **Status progression:** **Draft** (grey dot) → **Saving…** (yellow dot) → **Saved** (green dot)
- **Nav guard:** if status is Draft and content is non-empty, attempting to navigate away triggers "Discard unsaved changes?" dialog
- If status is Saving…, wait for save completion then navigate silently
- If status is Saved, navigate freely

---

### 4.6 Reading Progress

- 2px fixed bar at very top of viewport (z-index 100)
- Background: transparent. Bar: `--accent` (`#0A0A0A`)
- Width: percentage of article scroll position. Transitions at 60ms linear for smooth tracking.
- Used on: Post Detail, Digest Post

---

## 5. Responsive Strategy

Mockups are drawn at the **desktop canonical viewport (≥1280px)**. Mobile and tablet are not yet drawn — until they are, follow these rules so the engineer doesn't improvise:

| Breakpoint | Range | Layout target |
|---|---|---|
| Desktop | ≥ 1280px | Canonical — matches `pages/*.html` |
| Laptop | 1024–1279px | Same as desktop, masonry collapses to 2 columns |
| Tablet | 768–1023px | Sidebar collapses to rail (Mode B for all pages) · masonry 2 cols · topbar search compresses |
| Mobile | < 768px | Sidebar becomes bottom nav (Explore / Digest / Profile / Settings) · masonry 1 col · topbar shrinks · floating bars become full-width sticky |

**Reflow rules:**
- Reader column (`max-width: 720px`) stays centered; horizontal padding becomes `clamp(16px, 5vw, 32px)` below tablet.
- All hit targets must hit **44×44px minimum** below 768px (currently desktop-only specs allow 30–34px).
- Modals (Auth, Settings, Edit Profile) become **full-screen sheets** below 600px.
- Tag filter bar gains horizontal scroll-snap below 768px.
- Floating action bars (Post Detail composer pill) collapse to a single full-width sticky composer below 600px.

When mobile/tablet mockups land, this section is replaced with per-page specs.

# Verita Frontend PRD

**Project:** Verita — AI Knowledge Sharing Platform **Stack:** React 18 + TypeScript · Vite · Chakra UI **Version:** 2.28

---

## 1. Design Tokens

```css
--bg-base:        #FFFFFF;
--bg-surface:     #F9F9F9;
--bg-elevated:    #F0F0F0;
--bg-paper:       #F5F0E8;   /* text-only post card background */

--text-primary:   #0A0A0A;
--text-secondary: #6B6B6B;
--text-tertiary:  #ABABAB;

--border-subtle:  #EBEBEB;
--border-default: #D4D4D4;

--accent:         #0A0A0A;   /* all interactive + AI colors */
--accent-hover:   #333333;

--success:        #16A34A;
--danger:         #DC2626;

--font-sans:      "Inter", system-ui, sans-serif;
--font-mono:      "JetBrains Mono", monospace;
--font-serif:     "Newsreader", Georgia, serif;   /* logo + pull-quote */
```

---

## 2. Global Components

|Component|Used in|Description|
|---|---|---|
|**Sidebar**|All pages|See unified sidebar spec below.|
|**Auth Modal**|Global overlay|Login + Sign up tabs. Triggered by any auth-gated action. Stores intended action, executes post-login.|
|**Post Card**|Home Feed, Search, Tag Detail, Bookmarks|Three variants: Digest card · text-only (paper bg) · cover image card. See §3.1 for card spec.|
|**Tag Filter Bar**|Home Feed|Horizontal scrollable chips below search bar. Component, not a page.|

#### Sidebar — Unified Design

Two distinct states depending on current page. Transition animation plays when navigating between them.

|                 |Home Feed|All other pages|
|---|---|---|
| Width           |Full (220px)|Narrow — wide enough for "Explore" and "Digest" text only|
| Logo            |"Verita" wordmark|V mark icon only|
| Nav items shown |All items with full labels|Explore · Digest (primary items only)|
| Animation       |No collapse/expand on this page|Receives collapse animation on entry from Home Feed|
| Hover behavior  |None (already full)|None (stays narrow)|

**Transition:** Navigating from Home Feed → any other page triggers a sidebar width animation (full → narrow). Navigating back plays the reverse.

**Back navigation (top-left of content area on sub-pages):**

A single back label showing the name of the previous page. Clicking returns to that page.

```
← Explore      ← Search      ← Digest      ← Profile
```

- Label is set via React Router `location.state.from` when navigating
- Fallback: `← Explore` when `location.state` is absent (e.g. direct URL access)
- No current page title shown — user can see the page they're on already

Examples by entry point:

- Home Feed → Post Detail: `← Explore`
- Search → Post Detail: `← Search`
- Digest Management → Digest Post: `← Digest`
- Home Feed → Post Editor: `← Explore`
- Post Detail → User Profile: `← Post`

> **Note:** This is the current design direction. Sidebar narrow-state item list to be confirmed once prototype is reviewed. | **Floating Comment Input** | Post Detail | Fixed bottom-center, 52% width, shadow. | | **Toast** | Global | Bottom-right, auto-dismiss 4s. Variants: default · success · danger. |

---

## 3. Screens

---

### 3.1 Home Feed

`/` · **Core**

**Purpose:** Main browsing page. Users discover and filter posts, access navigation, and enter all other flows.

**Functions:**

- Browse a masonry grid of posts (infinite scroll, cursor-based pagination)
- Filter posts by tag using the Tag Filter Bar below the search bar
- Search for posts via the search bar → navigates to Search Results
- View three core post card types in the feed (see Card Types below)
- Click any post card → Post Detail
- Click the Digest card CTA → Digest Post
- Refresh feed recommendations via floating FAB button (bottom-right, icon only)
- New Post button (sidebar, logged-in) → Post Editor
- Sign in button (sidebar, logged-out) → Auth Modal

**Sidebar (Home Feed only — full width 220px):** Explore · Digest · [spacer] · New Post CTA (logged-in) or Sign in CTA (logged-out) · Settings

Profile and Notifications are not in the sidebar. Future nav items (Publish, Notifications, Profile, More) may be added later.

**Card Types:**

|Type|Visual|Content|
|---|---|---|
|**Digest** (all users)|Black background, first position in feed|"Today's Digest" label + date · title · bullet summary · "Read full digest" CTA → Digest Post|
|**Text-only**|`--bg-paper` (#FAF8F4) cream background|Title · AI prose summary (spark icon prefix) · one main tag · author row|
|**Cover**|Cover image (3:2, SVG or uploaded) + overlay badges|TL badge: article type · TR badge: read time or "Live · Xm ago" · Title · one main tag · author row · **no AI summary**|

_Extended card types (stat, code, quote, thread) exist in the HTML prototype but are out of scope for the current implementation. Core types only: Digest · Text-only · Cover._

_Note: Digest card is shown to all users (logged-in and logged-out). No Digest-gate variant._

**Author Row** (all card types except Digest/Digest-gate): Avatar (initials circle) · Name · Verified badge (if applicable) · `·` · Time ago · Heart icon + like count (right-aligned)

**Auth Banner (logged-out only):** Shown at the top of the feed area, above the masonry grid. Rounded card. Text: "Browsing as guest. Sign in to get a personalised feed, save bookmarks, and join the discussion." Actions: `Log in` (ghost button) · `Create account` (primary black button)

**Tag Filter Bar:**

- First chip: `For you` (logged-in) · `Trending` (logged-out)
- Followed by subscribed topic tags (logged-in) or popular tags (logged-out)
- Active chip: bold text, no filled background (tab-style underline)

**Navigation — all clickable elements:**

|Element|Location|Logged-in action|Logged-out action|
|---|---|---|---|
|Verita wordmark|Sidebar top|Refresh Home Feed|Refresh Home Feed|
|Explore|Sidebar|Refresh Home Feed|Refresh Home Feed|
|Digest|Sidebar|→ Digest Management|→ Digest Management|
|New Post button|Sidebar|→ Post Editor|— (hidden)|
|Sign in button|Sidebar|— (hidden)|→ Auth Modal|
|Settings|Sidebar|→ Settings|Greyed out, no action|
|Search bar|Top bar|→ Search Results on submit|→ Search Results on submit|
|Avatar button|Top bar right|→ User Profile|— (hidden)|
|Sign in button|Top bar right|— (hidden)|→ Auth Modal|
|Tag chip (any)|Tag filter bar|Filters feed in place|Filters feed in place|
|Log in button|Auth banner|— (hidden)|→ Auth Modal (login tab)|
|Create account button|Auth banner|— (hidden)|→ Auth Modal (signup tab)|
|Digest card CTA|Feed — Digest card|→ Digest Post (today)|→ Digest Post (today, generic content)|
|Post card (body click)|Feed|→ Post Detail|→ Post Detail|
|Author name|Post card|→ User Profile|→ User Profile|
|Tag pill|Post card|Filters feed by that tag|Filters feed by that tag|
|Heart / like icon|Post card|Toggle like|→ Auth Modal|
|Refresh FAB|Bottom-right fixed|Reshuffles feed|Reshuffles feed|

**API:**

```
GET  /api/v1/posts?cursor=&limit=20&tag=     feed
GET  /api/v1/tags/trending                   tag filter bar
GET  /api/v1/users/me/subscriptions          subscribed tags (auth)
POST /api/v1/posts/:id/vote                  like post (auth)
DELETE /api/v1/posts/:id/vote                unlike post (auth)
```

---

### 3.2 Post Detail

`/post/:id` · **Core**

**Purpose:** Full reading experience for a single post with comments and engagement actions.

**Functions:**

_Top bar:_

- Back label top-left: `← [previous page name]` → returns to previous page via `navigate(-1)`
- Search bar (top-right, left of avatar) → navigates to Search Results
- Avatar (top-right, logged-in) → User Profile
- Reading progress bar: 2px fixed bar at very top of page, grows as user scrolls through article

_Post content:_

- View author avatar, name, verified badge, role/organization (if set), time ago, exact publish date
- Read post title
- Toggle AI Summary (collapsed by default, click to expand)
- Read full Markdown body
- View tags at end of article → navigate to Tag Detail (extended)
- Click source URL at end of article → opens external link

_Post stats (displayed at end of article, above comments):_

- Like count · Comment count · Save count · View count

_Floating bottom bar (two separate pill components, side by side, fixed bottom):_

```
[ ♥ ][ 🔖 ][ ↗ ][ 💬 ]     [ Add a comment...           ]
   Actions pill (left)          Composer pill (right)
```

- **Actions pill:** Like (toggle) · Save (toggle) · Share (copy link → Toast) · Jump to comments (scroll anchor)
- **Composer pill:** Comment input. Collapsed = single line. Click to expand → textarea + character count + Send button
- Two independent pill components with same shadow/border style, positioned together

_Comment section:_

- Sort comments by: Newest · Oldest · Most Liked (dropdown)
- Each comment shows: user avatar · username · verified badge (if any) · role badge (monospace, if set) · `OP` badge (if commenter is the post author) · time ago
- Like any comment (toggle)
- Reply to any comment (inline reply input, appears below comment)
- Replies are flat (one level only) — a reply to a reply appears under the same parent comment prefixed with `@username`
- Load More button after initial comment batch (not infinite scroll)

**Sidebar:** Icon-only (collapsed) by default. Hover to expand (same items as Home Feed). New Post button when logged in, Sign In when logged out.

**AI Summary — two levels:**

||Home Feed card|Post Detail panel|
|---|---|---|
|Format|2–3 short bullets|4–6 detailed bullets (structure depends on backend)|
|Trigger|Always visible on card|User clicks toggle|
|Default|Shown|Collapsed|

**Navigation:**

|Entry from|Exit to|
|---|---|
|Home Feed card click|Previous page (back button)|
|Search Results|Search Results (back button)|
|Digest story link|Post Editor (edit, own post only)|
||User Profile (author click)|

**Auth States:**

|Element|Logged out|
|---|---|
|Like, Save (floating bar)|Opens Auth Modal|
|Comment input|Shows Sign In instead|
|Reply, like a comment|Opens Auth Modal|
|Sidebar bottom button|Shows Sign In|

> Follow button not included in current scope. To be added in a future iteration.

**API:**

```
GET    /api/v1/posts/:id                          post content + stats
GET    /api/v1/posts/:id/comments?sort=&cursor=   comments (sort: newest/oldest/top)
POST   /api/v1/posts/:id/summary                  generate AI summary
POST   /api/v1/posts/:id/vote                     like
DELETE /api/v1/posts/:id/vote                     unlike
POST   /api/v1/posts/:id/bookmark                 save
DELETE /api/v1/posts/:id/bookmark                 unsave
POST   /api/v1/posts/:id/comments                 submit comment
POST   /api/v1/comments/:id/replies               reply to comment
POST   /api/v1/comments/:id/vote                  like comment
DELETE /api/v1/comments/:id/vote                  unlike comment
```

---

### 3.3 Post Editor

`/post/new` · `/post/:id/edit` · **Core**

**Purpose:** Create and edit posts. Both routes share one component; edit pre-fills all fields.

**Functions:**

_Top bar:_

- Back label top-left: `← Explore` (or `← [previous page]` based on entry point)
- Word count display (live, monospace pill, updates as user types)
- Status pill with three states:
    - `Draft` — grey dot, content not yet saved to server
    - `Saving...` — yellow dot, auto-save request in flight
    - `Saved` — green dot, all changes persisted
- **Auto-save:** triggers 2 seconds after the user stops typing (debounced). Status transitions: Draft → Saving... → Saved automatically.
- Publish button → opens Publish Confirmation modal before submitting
- Avatar button (top-right) → User Profile

_Publish Confirmation modal:_

- Triggered by clicking Publish button
- Shows title, brief confirmation message
- Actions: `Back to editing` (cancel) · `Publish` (confirm)
- Dismissed by confirming or cancelling

_Unsaved Changes modal (navigation guard):_

- Implemented via React Router v6 `useBlocker`
- Triggers when user attempts to navigate away and status is `Draft` (content non-empty, never saved)
- When status is `Saving...`: waits for save to complete, then navigates — no dialog shown
- When status is `Saved`: navigates freely — no dialog shown
- Dialog: "Discard unsaved changes?"
- Actions: `Keep editing` (cancel, stay on page) · `Discard` (leave without saving)
- Save Draft option omitted — auto-save already handles saving

_Content area:_

- Add / change cover image (aspect ratio 3:2, consistent with feed card display)
- Title input (plain text, large, auto-resize)
- Markdown editor toolbar: **B** · _I_ · `inline code` · code block · link · image · Heading (H2) · blockquote · divider
- Toggle button: switch between Edit mode and Preview mode (not split-screen)
- Add one or multiple source URLs (each as a separate input row, add/remove rows)
- Tag input: type to add tags manually as chips (no AI suggestions)

**Sidebar:** Same narrow state as Post Detail. Hover to expand.

**Navigation:**

|Entry from|Back label|Exit to|
|---|---|---|
|Sidebar New Post|`← Explore`|Home Feed (after publish)|
|User Profile ⋯ Edit|`← Post`|Post Detail (after save)|

**Auth States:** Requires login. Unauthenticated access → Home Feed + Auth Modal.

**API:**

```
POST   /api/v1/posts     create post
PUT    /api/v1/posts/:id update post
DELETE /api/v1/posts/:id delete post
```

---

### 3.4 Digest Management

`/digest` · **Core**

**Purpose:** Hub for browsing past digests by date and customizing topic preferences for future digests. This is the destination of the sidebar Digest nav item.

**Functions:**

- View list of past digests (by date — calendar or list view)
- Click a past digest → opens Digest Post (see §3.4a)
- View and edit subscribed topics for digest personalization
- Add or remove topics from digest preferences
- See today's digest status (generated / pending)
- CTA to view today's digest

**Navigation:**

|Entry from|Exit to|
|---|---|
|Sidebar Digest item|Digest Post (digest entry click)|
|Home Feed Digest card button|Settings (topic preferences)|

**Auth States:**

- Logged out: shows sample digest list, topic customization requires login

**API:**

```
GET   /api/v1/digest/list                  list of past digests
GET   /api/v1/users/me/digest-preferences  subscribed topics for digest
PUT   /api/v1/users/me/digest-preferences  update topic preferences
```

---

### 3.4a Digest Post _(variant of Post Detail)_

`/digest/:date` · **Core**

**Purpose:** Read a specific day's AI-generated digest. Uses Post Detail layout with the following modifications — no separate HTML design needed.

**Differences from Post Detail:**

|Element|Post Detail|Digest Post|
|---|---|---|
|Top navigation|`← [previous page]`|`← [previous page]` — shorter label (e.g. `← Digest`, `← Explore`)|
|Author row|User avatar + name + time|AI Digest badge + date + estimated read time|
|Content|User-written Markdown|Structured AI-generated events (see Content Structure below)|
|Comment section|Full threaded comments|None|
|Floating bar|Like · Save · Share · Jump to comments|Save · Share only|
|Sidebar|Narrow, hover to expand|Same|

No date prev/next navigation within the post. Date selection happens in Digest Management.

**Content Structure:**

```
[Verita AI Digest badge]  Monday, May 13, 2026  ·  ~8 min read
[Digest title]  e.g. "Your Monday Digest"
[Topic pills]   #ai-models  #mech-interp  #alignment  #open-source

[Personalization note — logged-in]
  "Personalised from 4 subscribed topics. Manage subscriptions →"

[Auth upsell — logged-out]
  "Get a digest built for you" + Log in + Create account buttons

[Intro paragraph — AI-generated, adapts to auth state]

[Event 1]
  Headline
  Source domain · time ago
  • Bullet 1
  • Bullet 2
  • Bullet 3+
  ↗ External link to source

[Event 2...N]

[Footer]
  "Generated by Verita AI from posts published [date range]"
  "Manage Digest →" link  (logged-in only)
```

**Navigation:**

|Entry from|Back label|Exit to|
|---|---|---|
|Digest Management|`← Digest`|External source link (event)|
|Home Feed Digest card|`← Explore`|Digest Management (footer link)|

**Auth States:**

||Logged out|Logged in|
|---|---|---|
|Digest title|"Today's Digest — [date]"|"Your [Weekday] Digest"|
|Personalization slot|Auth upsell banner|"Personalised from N topics · Manage →"|
|Intro paragraph|Generic: mentions sign-in link|Personalised to subscribed topics|
|Footer manage link|Hidden|Visible → Digest Management|
|Save button|Opens Auth Modal|Toggles save|

Public access allowed — logged-out users see platform-wide trending content, not personalised digest.

**API:**

```
GET  /api/v1/digest/:date    digest content for a specific date
```

---

### 3.5 Search Results

`/search?q=` · **Core**

**Purpose:** Display keyword search results as a browsable masonry grid, consistent with Home Feed.

**Functions:**

- View result count and current query ("12 results for "GPT-4o"")
- Browse matching posts in masonry grid (same layout and card style as Home Feed)
- Click any post card → Post Detail
- Modify query via the search bar (pre-filled with current query)
- Clear query → returns to Home Feed
- Empty state when no results found

**Layout:** Same as Home Feed — sidebar (narrow), search bar pre-filled, masonry grid below. No tag filter bar.

**Navigation:**

|Entry from|Exit to|
|---|---|
|Home Feed search bar|Post Detail (card click)|
|Post Detail search bar|Home Feed (clear search)|

**Auth States:** Public — no login required.

**API:**

```
GET  /api/v1/posts/search?q=&cursor=&limit=20
```

---

### 3.6 User Profile

`/profile/:id` · **Core**

**Purpose:** View a user's profile, their posts, and engagement history. Two variants depending on whether the viewer is the profile owner.

**Layout:** Same sidebar, search bar, and top-right avatar as Post Editor.

**Layout:** Same narrow sidebar, search bar, and top-right avatar as Post Editor. Back label top-left: `← [previous page]` (e.g. `← Post`, `← Explore`).

**Profile header (all viewers):**

- User photo (80px circle) · display name · verified badge (if applicable)
- Display Name (editable) shown in large text · Username shown as `@handle` below (read-only after registration)
- Bio (self-introduction)
- Organization _(optional, shown only if filled)_
- Website _(optional, clickable external link, shown only if filled)_
- Research Interests _(optional)_
- Joined date (e.g. "Joined January 2024")
- Stats row: Post count · Followers · Following · Likes received

**Edit profile (own profile only):**

- Pencil icon on bottom-right of avatar → opens Edit Profile Modal
- Modal fields: avatar upload · Display Name · Bio · Organization · Website · Research Interests
- Username (`@handle`) is read-only in the modal — set at registration, cannot be changed (username change is an extended feature)
- Save button in modal footer

**Content tabs:**

|Tab|Own profile|Others' profile|
|---|---|---|
|Posts|All published posts|All published posts|
|Bookmarks|Visible|Hidden (or visible if owner enabled sharing in Settings)|
|Drafts|Visible|Always hidden|
|Likes|Visible|Hidden (or visible if owner enabled sharing in Settings)|

**Post cards in Posts tab:**

- Show multiple tags (not limited to one, unlike Home Feed cards)
- ⋯ manage button on own profile only:
    - On cover cards: absolute positioned over top-right of cover image
    - On text-only cards: inline button in card footer
- Menu actions: **Edit** → Post Editor (pre-filled) · **Unpublish** → converts to draft · **Delete** → confirmation modal required

**Draft cards in Drafts tab:**

- Dashed border to distinguish from published posts
- Yellow "DRAFT" status label at top of card
- Three action buttons displayed directly at the bottom of the card (no ⋯ menu):
    - **Publish** → publishes immediately (same confirmation modal as Post Editor)
    - **Edit** → Post Editor (pre-filled)
    - **Delete** → confirmation required
- Clicking draft card body → Post Editor (same as Edit)

Clicking any published post card (outside the menu) → Post Detail.

**Privacy settings** (configured in Settings page):

- Owner can toggle whether Bookmarks and Likes tabs are visible to others

**Data model note:** Two separate fields in the `users` table:

- `display_name` — editable, non-unique, shown in large text on profile
- `username` — unique, set at registration, immutable (shown as `@handle`). Changing username is an extended feature.
- Login uses `email`, not `username`. Profile URL uses `username`: `/profile/:username`

**Navigation:**

|Entry from|Exit to|
|---|---|
|Post Detail author row|Post Detail (post card click)|
|Top-right avatar (own)|Post Editor (edit post via ⋯ menu)|
|Sidebar Profile item|Settings (privacy toggle)|

**Auth States:**

|Element|Logged out|
|---|---|
|Pencil edit icon|Hidden|

> Follow / Unfollow not included in current scope. To be added in a future iteration. | Bookmarks / Drafts / Likes tabs | Hidden |

**API:**

```
GET    /api/v1/users/:id                    profile data
GET    /api/v1/users/:id/posts              published posts
GET    /api/v1/users/me/bookmarks           own bookmarks (auth)
GET    /api/v1/users/me/drafts              own drafts (auth)
GET    /api/v1/users/me/likes               own liked posts (auth)
PUT    /api/v1/users/me                     update profile (auth)
PUT    /api/v1/users/me/avatar              update avatar (auth)
PUT    /api/v1/posts/:id/unpublish          convert to draft (auth, own post)
DELETE /api/v1/posts/:id                    delete post (auth, own post)
```

---

### 3.7 Admin

`/admin` · **Core** · ADMIN role required (JWT guard)

**Purpose:** Minimal moderation and user management for administrators. Function over form — table-based layout, no dashboard charts.

**Layout:** Same narrow sidebar. Two tabs at the top of the content area.

**Tab 1 — Moderation:**

- Table of flagged posts and comments
- Each row: content preview · reporter count · flagged date · **Delete** · **Dismiss** actions
- Dismiss removes the flag without deleting the content

**Tab 2 — Users:**

- Searchable user table
- Each row: avatar · username · email · role · join date · **Change Role** · **Ban/Unban** actions
- Change Role: dropdown to switch between USER / ADMIN / VERIFIED
- Ban toggles the user's access

**Access:** Direct URL only (`/admin`). No sidebar link shown to regular users.

**Auth States:** Non-ADMIN JWT or unauthenticated → shows inline "Access Denied" screen with "← Back to Home" button. No redirect.

**Users tab note:** Role change includes setting a user to VERIFIED status, which serves as the manual verification flow. Formal verification request submission and review UI is an extended feature.

**API:**

```
GET    /api/v1/admin/flagged               flagged content list
DELETE /api/v1/admin/posts/:id             delete post
DELETE /api/v1/admin/comments/:id          delete comment
PUT    /api/v1/admin/flagged/:id/dismiss   dismiss flag
GET    /api/v1/admin/users?q=              user list with search
PUT    /api/v1/admin/users/:id/role        change role (includes setting VERIFIED)
PUT    /api/v1/admin/users/:id/ban         ban / unban user
```

---

### 3.8 Settings

**Type:** Modal overlay · **Core** No dedicated route. Settings is a modal triggered by the Settings sidebar item on any page.

**Purpose:** Account info, digest configuration, and privacy controls in a lightweight modal — no page navigation required.

**Trigger:** Sidebar Settings item (logged-in only — greyed out and non-interactive when logged out).

**Modal sections:**

_Account:_

- Email (read-only)
- Username / @handle (read-only)
- "Edit Profile →" link → navigates to User Profile

_Digest:_

- Email frequency segmented control: Daily · Weekly · Off
- "Manage Topics →" link → navigates to Digest Management

_Privacy:_

- Toggle: "Show my Bookmarks to others" — controls Bookmarks tab visibility on User Profile
- Toggle: "Show my Likes to others" — controls Likes tab visibility on User Profile

**Dismissal:** Click backdrop · press Escape · click X button

**Auth States:** Modal only opens when logged in. Clicking Settings when logged out → no action (item is greyed out).

**API:**

```
GET  /api/v1/users/me/settings    current settings
PUT  /api/v1/users/me/settings    update frequency + privacy toggles
```

---

### 3.9 Auth Modal

Global overlay · **Core**

**Purpose:** Handle login and registration from any point in the app without losing context.

**Functions:**

- Log in with email and password
- Register with username, email, and password
- Switch between Log in and Sign up tabs
- Dismiss modal to return to current page
- Store and execute intended action after login (e.g. auto-focus comment input)

**Triggered by:** Sidebar Login item · top-right avatar (logged out) · any auth-gated action.

**Optional panels** _(if time allows):_

- `verify-email` — 6-digit OTP after registration
- `forgot-pw` → `forgot-sent` — password reset request
- `/reset-password` standalone page for email reset link landing

**API:**

```
POST  /api/v1/auth/login              returns JWT
POST  /api/v1/auth/register           returns JWT
POST  /api/v1/auth/verify-email       optional
POST  /api/v1/auth/forgot-password    optional
POST  /api/v1/auth/reset-password     optional
```

---

### 3.10 404

`*` · **Core**

**Purpose:** Catch unmatched routes.

**Functions:** Display error message. Link back to Home Feed.

---

## 4. Extended Screens

Implement only if time allows. No detailed spec until prioritized.

|ID|Screen|Route|Extends|
|---|---|---|---|
|DISC-03|Tag Detail|`/tag/:name`|Home Feed tag filter — adds subscribe button and dedicated URL|
|DISC-02|Trending|`/trending`|Home Feed — ranked by engagement score, time window toggle|
|DISC-05|Bookmarks|`/bookmarks`|Post Detail bookmark action — saved posts list|
|NOTIF-01|Notifications|`/notifications`|Sidebar bell — activity feed (comments, likes, digest ready)|
|AUTH-05|Verification Apply|`/verify/apply`|User Profile — apply for verified badge|

---

## 5. Design Reference Files

HTML prototype files are the source of truth for visual design and component behavior. PRD defines what and why. HTML files define how it looks.

|Screen|File|
|---|---|
|Home Feed|`Verita_Home.html`|
|Post Detail|`Verita_Post_Detail.html`|
|Post Editor|`Verita_Post_Editor.html`|
|User Profile|`Verita_User_Profile.html`|
|Digest Management|`Verita_Digest_Management.html`|
|Digest Post|— _(variant of Post Detail, no separate file needed)_|
|Search Results|—|
|Admin|—|
|Settings (Modal)|`Verita_Home___Settings.html`|
|Auth Modal|—|

---

_Screens without a design file use the Design Tokens (§1) and Global Components (§2) as the implementation reference._

---

## 6. Future TODO List

Features and improvements discussed during design but deferred due to scope or time constraints. Ordered roughly by implementation priority within each category.

---

### Extended Screens _(see §4 for specs)_

- [ ] **Tag Detail** `/tag/:name` — dedicated tag page with subscribe button; extends Home Feed filter
- [ ] **Trending** `/trending` — ranked posts by engagement, time window toggle (Today / This Week)
- [ ] **Bookmarks** `/bookmarks` — saved posts list, accessible from User Profile or sidebar
- [ ] **Notifications** `/notifications` — activity feed (comments, likes, digest ready alerts)
- [ ] **Verification Apply** `/verify/apply` — apply for verified badge (Organization / Expert)

---

### Auth & User Features

- [ ] **Follow / Unfollow user** — Follow button on User Profile and Post Detail author row; follower/following counts already shown in UI
- [ ] **Username change** — currently immutable after registration; allow change with uniqueness check and profile URL update
- [ ] **Email verification flow** — 6-digit OTP modal panel after registration (`verify-email` panel in Auth Modal)
- [ ] **Forgot password flow** — `forgot-pw` → `forgot-sent` panels in Auth Modal + standalone `/reset-password` page for email link landing
- [ ] **Admin: Verification request UI** — formal submit + review flow for verified badge applications; currently handled manually via role change in Users tab

---

### Content & Feed Features

- [ ] **Extended post card types** — `stat` (trend stat + sparkline) · `code` (syntax preview) · `quote` (pull quote serif) · `thread` (comment preview); HTML prototypes exist in `Verita_Home.html`
- [ ] **Share popover** — multiple share options (copy link, Twitter, etc.); currently only copy link
- [ ] **Tag Detail page click-through** — clicking tag pills on Post Detail navigates to Tag Detail page (currently no destination)
- [ ] **Semantic / RAG search** — natural language search powered by vector embeddings; current search is keyword-only

---

### UI / UX Enhancements

- [ ] **Logo animation** — cross-fade or morph between V mark icon and "Verita" wordmark during sidebar expand/collapse transition (P2)
- [ ] **Mobile navigation** — bottom tab bar or hamburger drawer for viewports < 768px; currently no mobile nav pattern defined
- [ ] **Light / Dark mode toggle** — dark mode token mapping; Settings modal toggle; currently light mode only
- [ ] **Sidebar navigation items** — Profile · Notifications · More items not yet shown in sidebar; space reserved for future addition
- [ ] **Digest sidebar badge** — unread digest count badge on Digest nav item; currently always hidden

---

### Technical

- [ ] **Post Editor: Remove Save Draft button** — redundant with auto-save; top bar becomes `← · word count · status pill · Publish · avatar`
- [ ] **Digest pagination (real API)** — replace mock data with real API-driven pagination; PAGE_SIZE = 30 in production
- [ ] **State management upgrade** — add Zustand (global state) + React Query (server state / caching) in Phase 2
- [ ] **Infinite scroll optimisation** — virtualised list for large feeds to avoid DOM bloat
- [ ] **Next.js migration** — SSR + better SEO if needed post-MVP

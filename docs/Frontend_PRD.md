# Verita — Product Requirements Document

**Project:** Verita · AI Knowledge Sharing Platform
**Team:** Internal development reference
**Version:** 1.0 · May 2026

---

## 1. Product Overview

Verita is an AI-focused community platform where developers, researchers, and enthusiasts share and discover practical AI knowledge. Users publish Markdown posts, engage through comments and votes, and receive a daily AI-generated digest personalised to their subscribed topics. The platform uses AI to summarise content, suggest tags, and curate daily briefings — reducing information overload in the fast-moving AI industry.

**Core value:** Make every minute spent on the platform directly useful for the user's AI work or learning.

---

## 2. Core Screens

|Screen|Route|Priority|Type|
|---|---|---|---|
|Home Feed|`/`|P0|Page|
|Post Detail|`/post/:id`|P0|Page|
|Post Editor|`/post/new` · `/post/:id/edit`|P0|Page (shared component)|
|Digest Management|`/digest`|P0|Page|
|Digest Post|`/digest/:date`|P0|Page (variant of Post Detail)|
|Search Results|`/search?q=`|P0|Page|
|User Profile|`/profile/:username`|P0|Page|
|Admin|`/admin`|P0|Page (ADMIN role only)|
|Auth Modal|—|P0|Global modal overlay|
|Settings Modal|—|P0|Global modal overlay|
|404|`*`|P0|Page|

---

## 3. Screen Functions

---

### 3.1 Home Feed `/`

**Purpose:** Primary discovery page. All users can browse; personalisation requires login.

**Sidebar (full 220px — Home Feed only):**

- Click Verita logo → refresh Home Feed
- Click Explore → refresh Home Feed
- Click Digest → navigate to Digest Management
- Click New Post (logged-in) → navigate to Post Editor
- Click Sign In (logged-out) → open Auth Modal
- Click Settings (logged-in) → open Settings Modal
- Settings item is greyed out and non-interactive when logged out

**Top bar:**

- Submit search query → navigate to `/search?q=`
- Click avatar (logged-in) → navigate to User Profile
- Click Sign In button (logged-out) → open Auth Modal

**Tag Filter Bar:**

- First chip: "For you" (logged-in) or "Trending" (logged-out)
- Click any tag chip → filter feed in place (no page navigation)
- Active chip shown with bold underline style

**Auth Banner (logged-out only, above feed):**

- Click "Log in" → open Auth Modal on Log In tab
- Click "Create account" → open Auth Modal on Sign Up tab

**Feed — Digest card (logged-in):**

- Click "Read →" CTA → navigate to today's Digest Post

**Feed — Digest card (logged-out):**

- Card shows teaser only; click "Sign in to read" → open Auth Modal

**Feed — Text-only post card:**

- Click card body → navigate to Post Detail
- Click author name → navigate to User Profile
- Click tag pill → filter feed in place by that tag
- Click heart icon (logged-in) → toggle like on that post
- Click heart icon (logged-out) → open Auth Modal

**Feed — Cover image post card:**

- Click card body → navigate to Post Detail
- Click author name → navigate to User Profile
- Click tag pill → filter feed in place by that tag
- Click heart icon (logged-in) → toggle like
- Click heart icon (logged-out) → open Auth Modal

**Refresh FAB (bottom-right, all users):**

- Click → reshuffle and reload feed recommendations

**Infinite scroll:**

- Reaching end of feed → auto-load next page (cursor-based, 20 posts/page)

---

### 3.2 Post Detail `/post/:id`

**Purpose:** Full reading experience for a single post with AI summary, comments, and engagement.

**Top bar:**

- Click `← [previous page]` → navigate back (context-aware: Explore / Search / Digest / Post)
- Click avatar (logged-in) → navigate to User Profile
- Reading progress bar at top of page (visual only, no interaction)

**Author row:**

- Click author avatar or name → navigate to User Profile
- Verified badge, role/organisation, time ago, publish date — visual only

**AI Summary:**

- Click "AI Summary" toggle → expand summary panel
- Click again → collapse panel
- Panel shows 4–6 detailed bullet points (structure depends on backend/LLM)

**Post body:**

- External links within Markdown → open in new tab

**End of article — Tags:**

- Tags are visual labels (Tag Detail navigation is a future feature)

**End of article — Source URL:**

- Click source link → open external URL in new tab

**End of article — Stats row:**

- Like count · Comment count · Save count · View count — all visual only

**Floating bottom bar (fixed, bottom of viewport):**

- Click Like (logged-in) → toggle like on post; count updates
- Click Like (logged-out) → open Auth Modal
- Click Save (logged-in) → toggle bookmark; icon fills when saved
- Click Save (logged-out) → open Auth Modal
- Click Share → copy post URL to clipboard → show Toast "Link copied"
- Click Jump to Comments → scroll to comment section anchor
- Comment input (logged-in) → click to expand composer (textarea + character count + Send button)
- Comment input (logged-out) → shows "Sign in to comment" instead; click → open Auth Modal

**Comment section:**

- Click sort dropdown → select Newest / Oldest / Most Liked → re-render comments
- Each comment: avatar, username, verified badge, role badge (if set), OP badge (if author), time ago
- Click heart on comment (logged-in) → toggle like; count updates
- Click heart on comment (logged-out) → open Auth Modal
- Click Reply (logged-in) → show inline reply input directly below comment
- Click Reply (logged-out) → open Auth Modal
- Reply to a reply → appears flat under same parent comment, prefixed with `@username`
- Submit comment (Send button or Enter) → post comment; input clears
- Click "Load More" button → load next batch of comments (not infinite scroll)

---

### 3.3 Post Editor `/post/new` · `/post/:id/edit`

**Purpose:** Create and edit posts. Both routes share one component; edit pre-fills all fields.

**Top bar:**

- Click `← [previous page]`:
    - If status = Saved → navigate back immediately
    - If status = Saving → wait for save to complete → navigate back
    - If status = Draft and content non-empty → show Unsaved Changes modal
- Word count pill — visual only, updates live as user types
- Status pill — visual only: Draft (grey) · Saving (yellow) · Saved (green)
- Click Publish → open Publish Confirmation modal
- Click avatar → navigate to User Profile
- Click Discard (visible only when status = Draft and content is non-empty) → open Unsaved Changes modal

**Publish Confirmation modal:**

- Click "Back to editing" → close modal, return to editor
- Click "Publish" → submit post → navigate to Home Feed

**Unsaved Changes modal:**

- Click "Keep editing" → close modal, stay in editor
- Click "Discard" → discard content, navigate back

**Cover image:**

- Click cover area or "Add cover" button → open file picker → select image → preview at 3:2 ratio
- Click remove on cover → remove cover image

**Title input:**

- Plain text, large, auto-resize — required to publish

**Markdown toolbar:**

- Bold (B) · Italic (I) · Inline code · Code block · Link · Image · Heading (H2) · Blockquote · Divider
- Each button → inserts corresponding Markdown syntax at cursor

**Edit / Preview toggle:**

- Click "Preview" → switch to rendered Markdown view (full viewport, no editor)
- Click "Edit" → switch back to editor

**Editor body:**

- Full Markdown input; auto-save triggers 2 seconds after user stops typing

**Sources:**

- Click "Add source" → append new URL input row
- Type URL into input field
- Click × on any row → remove that source

**Tags:**

- Type tag name + Enter → add as chip
- Click × on chip → remove tag
- Tags are entered manually (no AI suggestions)

---

### 3.4 Digest Management `/digest`

**Purpose:** Browse past digests as cards and manage subscribed topics for future digest personalisation.

**Top bar:**

- Click `← [previous page]` → navigate back
- Submit search → navigate to Search Results
- Click avatar (logged-in) → navigate to User Profile

**Tab bar:**

- Click "Past Digests" tab → show Tab 1
- Click "Manage Topics" tab → show Tab 2

**Tab 1 — Past Digests:**

_Today's hero card (logged-in):_

- Displays: date · title · top story subtitle · event count · read time · generation time
- Click "Read →" → navigate to today's Digest Post
- If digest not yet generated: shows spinner + "Generating... check back later" (no CTA)

_Today's card (logged-out):_

- Shows auth upsell: "Sign in for your personalised digest"
- Click "Log in" → open Auth Modal on Log In tab
- Click "Create account" → open Auth Modal on Sign Up tab

_History digest cards (cream paper background):_

- Each card: date · headline title · topic pills · event count + read time
- Click card → navigate to that date's Digest Post
- Initial load: 30 cards; click "Load more" → load next 10

**Tab 2 — Manage Topics (logged-out):**

- Entire tab shows auth gate with Log In and Create account buttons

**Tab 2 — Manage Topics (logged-in):**

- Type in search bar → filter topic cards by name in real time
- Each category (Research · Models & Labs · Applications · Engineering):
    - Shows 5 topic cards by default
    - Click "More →" → expand to show all cards in category with staggered animation
    - Click "More →" again (now "Less ←") → collapse back to 5
- Each topic card:
    - Click "Follow" → subscribe to topic; card border turns black; button shows "Following"
    - Click "Following" → unsubscribe; card reverts to unsubscribed state
- Bottom fixed bar:
    - Shows live count: "Following N topics"
    - Click "Save preferences" → persist subscriptions → show Toast "Preferences saved"

---

### 3.5 Digest Post `/digest/:date`

**Purpose:** Read a specific day's AI-generated digest. Variant of Post Detail layout.

**Top bar:**

- Click `← [previous page]` → navigate back (Explore or Digest depending on entry)
- Click avatar (logged-in) → navigate to User Profile
- Reading progress bar at top (visual only)

**Header:**

- AI Digest badge · date · read time — visual only
- Digest title and top story subtitle — visual only
- Topic pills — visual only

**Personalisation slot (logged-in):**

- Text: "Personalised from N subscribed topics"
- Click "Manage subscriptions →" → navigate to Digest Management

**Auth upsell (logged-out, in place of personalisation):**

- Click "Log in" → open Auth Modal
- Click "Create account" → open Auth Modal

**Content — each event:**

- Headline, source domain + time ago, bullet points — visual only
- Click external link (↗) → open source URL in new tab

**Footer (logged-in only):**

- Click "Manage Digest →" → navigate to Digest Management

**Floating bottom bar:**

- Click Save (logged-in) → toggle save on this digest; icon fills when saved
- Click Save (logged-out) → open Auth Modal
- Click Share → copy URL to clipboard → Toast "Link copied"
- No Like button, no comment section on Digest Post

---

### 3.6 Search Results `/search?q=`

**Purpose:** Display keyword search results in a masonry grid matching the Home Feed style.

**Top bar:**

- Click `← [previous page]` → navigate back
- Search bar pre-filled with current query
- Modify query + submit → reload results with new query
- Clear search bar + submit → return to Home Feed
- Click avatar (logged-in) → navigate to User Profile

**Results area:**

- Result count shown above grid: "N results for '[query]'"
- Same masonry grid and Post Card style as Home Feed
- Click card body → navigate to Post Detail
- Click author name → navigate to User Profile
- Click tag pill → navigate back to Home Feed filtered by that tag
- Click heart (logged-in) → toggle like
- Click heart (logged-out) → open Auth Modal

**Empty state:**

- No results: illustration + "No results for '[query]'" + "Clear search" link

---

### 3.7 User Profile `/profile/:username`

**Purpose:** View a user's public profile and content. Two variants: own profile vs others'.

**Top bar:**

- Click `← [previous page]` → navigate back
- Submit search → navigate to Search Results
- Click avatar → navigate to own User Profile

**Profile header (all viewers):**

- User photo, display name, verified badge, @username, role/organisation, joined date — visual only
- Bio, website, research interests — visual only
- Website: click → open external URL in new tab
- Stats row (post count · followers · following · likes received) — visual only

**Edit profile (own profile only):**

- Click pencil icon (bottom-right of avatar) → open Edit Profile modal
- Edit Profile modal fields: avatar upload · display name · bio · organisation · website · research interests
- @username shown as read-only in modal
- Click "Save" → persist changes → close modal

**Content tabs:**

- Click "Posts" → show published posts grid
- Click "Bookmarks" → show saved posts (own always; others' depends on privacy setting)
- Click "Drafts" → show draft posts (own profile only)
- Click "Likes" → show liked posts (own always; others' depends on privacy setting)

**Posts tab — published post cards:**

- Click card body → navigate to Post Detail
- Click ⋯ menu (own profile only) → show: Edit / Unpublish / Delete
    - Edit → navigate to Post Editor with content pre-filled
    - Unpublish → convert post to draft; card moves to Drafts tab
    - Delete → show confirmation modal → confirm → remove post permanently

**Drafts tab — draft post cards:**

- Dashed border + yellow "DRAFT" label
- Click "Edit" button → navigate to Post Editor
- Click "Publish" button → show Publish Confirmation modal → confirm → publish post
- Click "Delete" button → show confirmation modal → confirm → delete draft

**Bookmarks / Likes tabs:**

- Click card → navigate to Post Detail

---

### 3.8 Admin `/admin`

**Purpose:** Content moderation and user management. ADMIN role only.

**Access denied screen (non-admin or logged-out):**

- Click "← Back to Home" → navigate to Home Feed

**Tab bar:**

- Click "Moderation" → show flagged content table
- Click "Users" → show user management table

**Moderation tab:**

- Each row: content preview · report count · flagged date · actions
- Click "Delete" → show confirmation modal → confirm → remove post or comment
- Click "Dismiss" → remove flag without deleting content

**Users tab:**

- Type in search input → filter user list in real time
- Each row: avatar · display name · @username · email · role · joined date · status · actions
- Change Role dropdown → select USER / VERIFIED / ADMIN → update user role immediately
- Click "Ban" → ban user (restrict access); button changes to "Unban"
- Click "Unban" → restore user access

---

### 3.9 Auth Modal

**Purpose:** Handle login and registration from any page without losing user context. Stores intended action and executes it after successful login.

**Triggers:** Sidebar Sign In · top bar Sign In · any auth-gated interaction (like, save, comment, follow, reply)

**Log In tab:**

- Email input + Password input
- Click "Log in" → validate → receive JWT → store in localStorage → execute intended action → close modal
- Invalid credentials → inline error below password field
- Click "Forgot password?" → optional extended flow (future feature)
- Click "Sign up" link → switch to Sign Up tab

**Sign Up tab:**

- Username input + Email input + Password input (min 8 chars)
- Click "Create account" → validate → receive JWT → store → execute intended action → close modal
- Username taken → inline error below username field
- Email already registered → inline error below email field
- Click Terms / Privacy Policy links → open external page
- Click "Log in" link → switch to Log In tab

**Dismiss:**

- Click backdrop → close modal
- Press Escape → close modal

---

### 3.10 Settings Modal

**Purpose:** Manage account preferences and privacy settings. Global modal, no dedicated route.

**Trigger:** Click Settings in sidebar (logged-in only; greyed out and non-interactive when logged-out)

**Account section:**

- Email (read-only) · @username (read-only) — visual only
- Click "Edit Profile →" → navigate to User Profile

**Digest section:**

- Click frequency control → select Daily / Weekly / Off → update immediately
- Click "Manage Topics →" → navigate to Digest Management Tab 2

**Privacy section:**

- Toggle "Show my Bookmarks to others" → update immediately → affects Bookmarks tab visibility on own profile
- Toggle "Show my Likes to others" → update immediately → affects Likes tab visibility on own profile

**Dismiss:**

- Click backdrop → close modal
- Press Escape → close modal
- Click X button → close modal

---

### 3.11 404 Page `*`

- Displays error message for unmatched routes
- Click "Go to Home" link → navigate to Home Feed

---

## 4. Key User Flows

### Flow 1: New User Registration → First Post

1. Land on Home Feed → see auth banner → click "Create account"
2. Auth Modal (Sign Up tab) → fill username, email, password → submit
3. JWT stored → modal closes → user is now logged-in on Home Feed
4. Click New Post in sidebar → navigate to Post Editor
5. Add cover image → write title → write Markdown body → add sources and tags
6. Auto-save fires → status shows Saved
7. Click Publish → Publish Confirmation modal → click Publish
8. Navigate to Home Feed → post appears in feed

---

### Flow 2: Browse → Read → Comment

1. Land on Home Feed → browse masonry feed
2. Click tag chip → feed filters in place
3. Click post card → navigate to Post Detail
4. Reading progress bar grows as user scrolls
5. Click "AI Summary" → expand panel → read bullet points → click again to collapse
6. Scroll to bottom → click comment input (logged-out) → Auth Modal opens → log in
7. Auth Modal closes → comment input now active → type comment → Send
8. Comment appears in thread

---

### Flow 3: Daily Digest Routine

1. Click Digest in sidebar → navigate to Digest Management (Tab 1: Past Digests)
2. See today's black hero card → click "Read →" → navigate to Digest Post
3. Read AI-generated events, follow external links to sources
4. Click "Manage Digest →" in footer → navigate to Digest Management (Tab 2)
5. Search for a new topic → click "Follow" on topic card
6. Click "Save preferences" → Toast "Preferences saved"
7. Tomorrow's digest includes the new topic

---

### Flow 4: Publish and Manage Posts

1. Navigate to Post Editor → write post → auto-saves
2. Decide not to publish → click `← Explore` → Unsaved Changes modal → click "Discard"
3. Later: click New Post → editor is blank (discarded, not saved)
4. Write again → click Publish → confirm → post is live
5. Navigate to own User Profile → Posts tab → find the post
6. Click ⋯ on post → click Unpublish → post moves to Drafts tab
7. In Drafts tab → click Edit → back in Post Editor with content pre-filled
8. Edit content → auto-saves → click Publish again → post is live again

---

### Flow 5: Search and Discover

1. Click search bar (any page) → type query → submit
2. Navigate to Search Results → see result count and masonry grid
3. Click post card → Post Detail → read → click `← Search` → back to results
4. Modify search query → new results load
5. Clear search → return to Home Feed

---

### Flow 6: Admin Moderation

1. Admin navigates directly to `/admin`
2. Moderation tab active by default → review flagged content table
3. Click "Delete" on a violating post → confirmation modal → confirm → row removed
4. Click "Dismiss" on a false report → row removed, post stays
5. Click "Users" tab → search for a user → change role dropdown to VERIFIED
6. User now has verified badge across the platform

---

## 5. Auth & Permissions

|Action|Logged Out|USER|ADMIN|
|---|---|---|---|
|Browse Home Feed|✓ (popular, non-personalised)|✓ (personalised)|✓|
|Read Post Detail|✓|✓|✓|
|Like / Save / Share post|→ Auth Modal|✓|✓|
|Comment / Reply / Like comment|→ Auth Modal|✓|✓|
|Create / Edit / Delete own post|→ Auth Modal|✓|✓|
|Read Digest Post|✓ (generic)|✓ (personalised)|✓|
|Manage digest topics|→ Auth Modal|✓|✓|
|View own Bookmarks / Drafts / Likes|→ Auth Modal|✓|✓|
|Access Settings|✗ (greyed out)|✓|✓|
|Access `/admin`|→ Access Denied screen|→ Access Denied screen|✓|
|Delete any post or comment|✗|✗|✓|
|Change user roles|✗|✗|✓|
|Ban / Unban users|✗|✗|✓|

---

## 6. Out of Scope

Features discussed and deferred. See Future TODO List for details.

**Extended screens:** Tag Detail · Trending · Bookmarks page · Notifications · Verification Apply

**Auth features:** Email verification OTP · Forgot password flow · `/reset-password` page

**User features:** Follow / Unfollow · Username change

**Content features:** Extended card types (stat, code, quote, thread) · Share popover · RAG semantic search · AI tag suggestions

**UI enhancements:** Logo transition animation · Mobile navigation · Dark mode · Digest sidebar badge

**Technical:** Next.js SSR migration · Real-time updates (Socket.io)

---

_For visual design and component behaviour, see Design Spec._ _For API endpoints, data models, and state management, see Frontend Tech Spec._

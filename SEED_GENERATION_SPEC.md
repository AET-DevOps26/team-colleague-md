# Seed Data Generation Spec

> **Purpose.** This document is the complete, self-contained brief for a generative AI to
> **regenerate the Verita demo seed data** so the local demo looks real and full. Read it end
> to end, then produce the code changes described in **§10 Deliverables**. Do **not** invent
> facts about the codebase beyond what is stated here plus the files it points at.
>
> Produced from a grilling/domain-modeling session on 2026-07-02. All open decisions are
> already resolved and recorded inline as **DECISION** callouts — do not re-litigate them.

---

## 1. Problem being fixed

The current demo seed has four problems:

1. **Ugly "Sample X post #N" junk posts.** `V10__seed_topic_stats_sample.sql` inserts 10 posts
   titled `Sample LLM post #N` / `Sample Agents post #N`, body `"Seed content for
   topic-activity demo."`, authored by a free-standing UUID with no matching user (renders as
   **"unknown", no avatar**). They exist only to fake Topic-card activity numbers.
2. **Too few, too short real posts.** The 21 real posts in
   `scripts/seed/services/content/contentData.ts` all share **one identical filler body**
   (the `post()` helper synthesizes `"...is a practical note from the Verita community..."`),
   so every article reads like an empty stub and fits on screen without scrolling.
3. **No digest seed data.** Zero `DIGEST`-type posts are seeded; the Past Digests page and
   the "Today" digest hero are empty.
4. **Comments only on one post.** 9 comments exist, 5 piled on a single post; nearly every
   other post's detail page is empty.

---

## 2. How the seed & the relevant domain work (ground truth)

**Seed entrypoint.** `npm run seed:local` → `scripts/seed-local.ts` → runs `seedUsers`,
`seedContent`, `seedRecommendations` in order (each idempotent/upsert). Content data lives in
`scripts/seed/services/content/contentData.ts`; the DB writer is
`scripts/seed/services/content/contentRepository.ts`.

**Posts table.** Cross-service refs are free UUIDs (no FK to user-service). A post row has:
`id, author_id, title, content, excerpt, cover_image_url, content_summary, status ('PUBLISHED'),
type ('NORMAL' | 'DIGEST'), like_count, dislike_count, comment_count, view_count, save_count,
deleted, created_at, updated_at, target_user_id (nullable UUID)`.

**Digests (ADR-0013).** A digest is a **post** with `type = 'DIGEST'`, `author_id =` the fixed
digest system id `00000000-0000-0000-0000-000000000000` (from `app.digest.system-author-id`),
and `target_user_id =` the user it was personalised for. The **only** UI path to digests is
`GET /api/v1/posts/digests`, which filters `type = 'DIGEST' AND target_user_id = <caller
userId>`. The main feed (`GET /api/v1/posts`) defaults to `type = NORMAL` and excludes digests.
Consequence: a digest with `target_user_id = NULL` is invisible on every screen.

**Digest UI mapping (frontend `content.service.ts`).** From a digest `PostResponse`:
`eventCount = sourceUrl.length` (fallback `topics.length`); `topStorySubtitle = summary`; the
newest digest whose `createdAt` date-part equals **today** becomes the "Today" hero, the rest
become the Past Digests list. → **A digest's number of source URLs is its event count**, and the
hero requires one digest dated today.

**Topic activity stats.** After posts are written, `refreshTopicCounters()` in
`contentRepository.ts` recomputes `total_post_count`, `posts_this_week`, `posts_prev_week`,
`activity_score`, `is_hot` per topic **from the actual posts**, relative to a reference time.
`is_hot` requires `posts_this_week >= 3 AND (posts_prev_week == 0 OR this/prev > 1.5)`.
`follower_count` is **not** touched here — it is set by the recommendation seed
(`refreshContentTopicFollowerCounts`) to the count of seeded topic subscriptions.

---

## 3. DECISIONS (already made — implement exactly)

- **DECISION A — Delete `V10__seed_topic_stats_sample.sql` entirely** (both the fake-post
  INSERTs and the stat UPDATEs). Topic activity comes only from real seed posts.
- **DECISION B — Relative dates.** The reference "now" is captured **at seed run time**; every
  post / comment / digest / interaction / notification date is a **relative offset** from it, so
  every seed run is fresh and topics stay hot. No frozen absolute ISO strings.
- **DECISION C — ~35 real posts, real bodies.** Each post gets a unique, realistic Markdown
  body. **Most posts must be 600–1200 words** (long enough to require scrolling on the detail
  page); a **few** short "note"/link-share posts are allowed for variety.
- **DECISION D — Topic follower baseline.** Every topic gets a **realistic baseline
  follower_count** in the seed. For topics that also have seeded subscriptions, final count =
  `baseline + subscriptionCount` (make the recommendation seed **add** to, not overwrite, the
  baseline).
- **DECISION E — Digests: ~8–10, all `target_user_id = alexchen`.** Exactly one dated **today**
  (→ hero); the rest spread across the last ~2 weeks (→ Past list). `author_id` = digest system
  id; `type = 'DIGEST'`. **No global (`target_user_id = NULL`) digests.**
- **DECISION F — Comments: most posts have comments + partial nesting.** ~25 of the ~35 posts
  get **2–6 comments each**, some with **1–2 levels** of nested replies; varied authors and
  `like_count`; ~80–100 comments total. A handful of posts may stay comment-free for realism.

---

## 4. Reference data the generator MUST use (do not invent new identities)

**Seed users** (username → displayName, org, expertise — use these as post authors / commenters).
`author_id`/author username must be one of these (defined in
`scripts/seed/services/users/usersData.ts`):

| username | display | org | expertise |
|---|---|---|---|
| `alexchen` | Alex Chen | — | Agents, RAG, Fine-tuning (ADMIN; the demo login) |
| `sarahjkim` | Sarah Kim | DeepMind | Interpretability, Alignment, Fine-tuning |
| `priya_ml` | Priya Nair | Hugging Face | RAG, Open Source, Multimodal |
| `marcello_r` | Marcello Rossi | — | Agents, LLMs |
| `tobiask` | Tobias Klein | — | LLMs, Evaluation, Developer Tools |
| `ananya_roy` | Ananya Roy | Anthropic | Mechanistic Interpretability, Alignment |
| `helena_park` | Helena Park | AISI | AI Safety, Policy, Evaluation |
| `naomi_greene` | Naomi Greene | DeepMind | RAG, Evaluation, Long Context |

**Topic names** usable on posts (must match `name` values already in `SEED_TOPICS`; keep this
list, extend only if you also add the topic to `SEED_TOPICS`):
`large-language-models`, `ai-agents`, `fine-tuning`, `retrieval-augmented-generation`,
`multimodal-ai`, `open-source`, `model-evaluation`, `mechanistic-interpretability`,
`alignment`, `in-context-learning`, `inference-optimization`.
(Note `inference-optimization` is referenced by posts today but is **missing** from
`SEED_TOPICS` — add it to `SEED_TOPICS` with a sensible category/sortOrder while you are in
there, category `engineering`.)

**Cover images.** Only these 6 files exist in `scripts/seed/assets/post-covers/`:
`agent-tooling.png`, `fine-tuning.png`, `inference-optimization.png`,
`mechanistic-interpretability.png`, `model-evaluation.png`, `rag-evaluation.png`.
A post/digest's `coverImageFile` must be one of these **or `null`**. Do **not** reference cover
filenames that don't exist (the seed asserts their presence). Most posts should be `null`; give
covers to a handful of "feature" posts + the hero digest.

**ID scheme** (keep the existing block layout; assign new sequential IDs):
- Posts `90000000-0000-4000-8000-0000000000NN`
- Comments `91000000-0000-4000-8000-0000000000NN`
- Votes `92000000-0000-4000-8000-0000000000NN`
- Bookmarks `93000000-0000-4000-8000-0000000000NN`
- **Digests `98000000-0000-4000-8000-0000000000NN`** (new block)
- (recommendation-side blocks `94–97` are unrelated but see §7)

---

## 5. Post spec (`SEED_POSTS`)

Produce **~35** `SeedPost` entries (keep the existing interface shape). Fields:

- `id` — from the `90000000-…` block.
- `authorUsername` — one of §4; distribute across all 8 users (alexchen may keep more, he's the
  demo user, but not a majority).
- `title` — realistic, specific AI/ML article titles (the existing 21 titles are good models;
  keep them, rewrite bodies, add ~14 new ones).
- `excerpt` — 1–2 sentence hook (already good in existing data).
- `content` — **NEW: a unique full Markdown article.** Requirements:
  - Most posts **600–1200 words**; a few short notes (150–300 words) for variety.
  - Real Markdown structure: `##`/`###` headings, bullet/numbered lists, at least some posts
    with fenced code blocks (```python / ```bash) and/or tables where topical.
  - Written in the author's voice/domain; technically plausible, no lorem ipsum, no repeated
    boilerplate across posts. **Never** reuse one shared body.
  - Self-consistent with the title and topics.
- `contentSummary` — a genuine 1–2 sentence summary (may differ from excerpt).
- `sourceUrls` — 1–4 plausible URLs (arxiv/github/blog style). Fine to keep example.com style
  but vary them.
- `topicNames` — 1–3 from §4.
- `viewCount` — realistic (hundreds → tens of thousands). **Must be ≥ likeCount, commentCount,
  and saveCount** for that post (validation enforces this; counters are derived — see §8).
- `coverImageFile` — one of the 6 files or `null` (mostly `null`).
- `createdAt` / `updatedAt` — **relative offsets** (see §6). Distribute so that **several topics
  have ≥3 posts within the last 7 days** (to make them `is_hot`) and some posts fall in the
  8–14-day-ago window (previous-week bucket). Spread across hours/days; do not cluster all at
  one timestamp.

Keep the `post()` / `comment()` / `link()` / `vote()` helper pattern if convenient, **but the
`post()` helper must stop synthesizing a shared body** — `content` becomes a required real
string per post.

---

## 6. Relative-date mechanism (implement once, use everywhere)

Add a small shared clock module, e.g. `scripts/seed/services/seedClock.ts`:

```ts
export const SEED_NOW = new Date();               // captured at import (seed start)
export function minutesAgo(n: number): string { return iso(SEED_NOW.getTime() - n*60_000); }
export function hoursAgo(n: number): string   { return iso(SEED_NOW.getTime() - n*3_600_000); }
export function daysAgo(n: number): string    { return iso(SEED_NOW.getTime() - n*86_400_000); }
function iso(ms: number): string { return new Date(ms).toISOString(); }
```

- Replace `SEED_REFERENCE_TIME` (currently the const `"2026-06-10T12:00:00Z"`) with
  `SEED_NOW.toISOString()`, and pass that as the reference into `refreshTopicCounters`.
- All `createdAt`/`updatedAt` in `contentData.ts` and all dates in `recommendationsData.ts`
  become `daysAgo(...)` / `hoursAgo(...)` calls.
- **Hero digest** must be `hoursAgo(small)` so its calendar date == today.
- Comments must be dated **at or after** their post's `createdAt` (use a smaller offset than the
  parent post; replies after their parent comment).

---

## 7. Topic follower baseline (DECISION D)

- Extend `SeedTopic` with `followerBaseline: number` and set a realistic value per topic
  (e.g. LLMs ~4000, Agents ~2800, RAG ~2100, others a few hundred → low thousands — vary them,
  keep them plausible, not round-identical).
- In `upsertTopics` (contentRepository), INSERT `follower_count = <followerBaseline>` instead of
  `0`, and on `ON CONFLICT` update it too.
- In `scripts/seed/services/recommendations/recommendationsRepository.ts`,
  `refreshContentTopicFollowerCounts` currently does
  `UPDATE topics SET follower_count = <subscriptionCount>` — change it to **add**:
  `SET follower_count = follower_count + <subscriptionCount>` (so baseline is preserved and
  subscriptions increment it). Alternatively pass baseline+count; either way the baseline must
  survive.

---

## 8. Comment spec (`SEED_COMMENTS`)

- ~80–100 `SeedComment` entries across ~25 of the ~35 posts (DECISION F).
- Fields: `id` (`91000000-…`), `postId` (valid post), `authorUsername` (§4; not usually the post
  author, but self-replies by the author are fine occasionally), `parentCommentId`
  (`null` for top-level; a valid earlier comment id for replies — **1–2 levels deep only**),
  `text` (real, on-topic, 1–4 sentences), `likeCount` (0–8, varied),
  `createdAt`/`updatedAt` (relative, ≥ post date, replies ≥ parent date).
- Validation requires every `parentCommentId` to reference an existing comment and every
  `postId` an existing post.
- `comment_count` per post is **derived** from these (see §9) — you don't set it on the post.

---

## 9. Digest spec (`SEED_DIGESTS` — new)

Add a `SeedDigest` array + interface (mirror the post fields it needs). Produce **8–10** digests,
**all `targetUsername: "alexchen"`**:

- `id` — `98000000-…` block.
- `authorId` — the **digest system id** `00000000-0000-0000-0000-000000000000` (constant; not a
  seed user).
- `type` — `'DIGEST'`; `status` `'PUBLISHED'`.
- `title` — a daily-digest headline (e.g. "Your AI digest — <topic theme>"). The existing
  frontend mock `DIGEST_LIST_LOGGEDIN` has good example titles to imitate in tone.
- `summary` — the **top-story subtitle** (1 sentence). This is what the hero shows.
- `content` — Markdown digest body: a short intro then **N "events"**, each an `###` headline +
  1–3 summary bullets, matching the genai digest style. Keep it real and scannable.
- `sourceUrls` — **N URLs where N = the event count you want shown** (5–11 is realistic). This
  drives `eventCount` in the UI.
- `topicNames` — 1–3 topics (used for association; see counter exclusion below).
- `coverImageFile` — give the **hero** (today's) digest a cover; others `null`.
- `targetUsername` — `"alexchen"` for all.
- `createdAt` — **exactly one** digest `hoursAgo(small)` (today → hero); the rest `daysAgo(1..14)`
  spread one-per-day, newest-first, so the Past list looks like a daily cadence.

**Repository work for digests** (in `contentRepository.ts`):
- Insert digests into `posts` with `type='DIGEST'`, `author_id=<system id>`,
  `target_user_id=seedUserId('alexchen')`, plus their `post_source_urls` and `post_topics`.
- Include digests in the pre-delete cleanup (delete by their ids) and, if you extend
  `assertNoContentIdentityConflicts`, include digest ids so re-seeding is idempotent.
- **CRITICAL: exclude digests from topic counters.** `refreshTopicCounters`'s counting query
  must add `AND p.type = 'NORMAL'` so `DIGEST` posts do not inflate topic `posts_this_week` /
  `total_post_count`.
- Digest `view_count` can be modest; `like/comment/save` counters 0 (digests aren't
  voted/commented in this seed).

---

## 10. Deliverables (files to change)

1. **Delete** `backend/content-service/src/main/resources/db/migration/V10__seed_topic_stats_sample.sql`.
   (Leave V1–V9 untouched. Flyway: since V10 was already applied in existing local DBs,
   note in the PR that a fresh DB / `flyway clean` or volume reset is expected for local demo.)
2. **New** `scripts/seed/services/seedClock.ts` (§6).
3. **Rewrite** `scripts/seed/services/content/contentData.ts`:
   - `SEED_TOPICS` gains `followerBaseline` per topic; add missing `inference-optimization`.
   - `SEED_POSTS` → ~35 entries with real unique Markdown bodies + relative dates (§5).
   - `SEED_COMMENTS` → ~80–100 entries, distributed + nested (§8).
   - **New `SEED_DIGESTS`** + `SeedDigest` interface (§9).
   - `SEED_BOOKMARKS` / `SEED_VOTES` → expand modestly so counters look alive; keep derived-≤-view
     invariant; use relative dates.
   - `SEED_REFERENCE_TIME` → `SEED_NOW.toISOString()`.
4. **Update** `scripts/seed/services/content/contentRepository.ts`:
   - `upsertTopics` writes `follower_count = followerBaseline`.
   - `refreshTopicCounters` counting query adds `AND p.type = 'NORMAL'`; uses `SEED_NOW` reference.
   - Add digest insertion + cleanup + (optional) identity-conflict coverage (§9).
   - `validateContentFixtures` extended to validate digests (valid target user, valid topics).
5. **Update** `scripts/seed/services/content/seedContent.ts`: include `SEED_DIGESTS` in the
   dry-run log lines and the write path.
6. **Update** `scripts/seed/services/recommendations/recommendationsRepository.ts`:
   `refreshContentTopicFollowerCounts` **adds** subscription count to baseline (§7).
7. (Optional consistency) `scripts/seed/services/recommendations/recommendationsData.ts`: convert
   its absolute dates to relative (`daysAgo`/`hoursAgo`) so notifications like "Your AI digest is
   ready" read as recent.

---

## 11. Invariants the result MUST satisfy (acceptance checklist)

- [ ] `npm run seed:local -- --dry-run` and a real `npm run seed:local` both succeed with no
      validation errors.
- [ ] Every `authorUsername` / commenter / voter / bookmarker resolves to a §4 seed user.
- [ ] Every comment's `postId` and `parentCommentId` resolve; nesting ≤ 2 levels.
- [ ] For every post: `like_count`, `comment_count`, `save_count` are the **derived** counts and
      each `≤ view_count`.
- [ ] No post/digest references a `coverImageFile` that isn't one of the 6 existing PNGs.
- [ ] All dates are relative to `SEED_NOW`; comments ≥ their post; replies ≥ their parent;
      exactly one digest dated today.
- [ ] Digests: all `type='DIGEST'`, `author_id=00000000-…0000`, `target_user_id=alexchen`;
      excluded from topic counters (topic `posts_this_week`/`total_post_count` count only NORMAL).
- [ ] After seeding: several topics are `is_hot=true` (≥3 NORMAL posts in last 7 days); every
      topic shows a plausible non-zero `follower_count`.
- [ ] No "Sample X post #N" rows anywhere; no shared/duplicated post body.
- [ ] Logged in as **alexchen**, the digest hero (today) + a multi-item Past Digests list render;
      most post detail pages show comments and require scrolling.

---

## 12. Out of scope (do not do)

- Do **not** build genai digest generation, a scheduled batch job, or a global-digest UI.
- Do **not** change the frontend mock fixtures in `frontend/src/services/*.ts` (the demo runs
  against the real backend seed; mocks are separate and not part of this task).
- Do **not** add DB-level foreign keys or alter service contracts / `openapi.yaml`.

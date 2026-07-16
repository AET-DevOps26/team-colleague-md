import pg from "pg";
import type { SeedConfig } from "../../config.ts";
import {
  DIGEST_SYSTEM_AUTHOR_ID,
  SEED_BOOKMARKS,
  SEED_COMMENTS,
  SEED_DIGESTS,
  SEED_POSTS,
  SEED_REFERENCE_TIME,
  SEED_TOPICS,
  SEED_VOTES,
  seedUserId,
  type SeedDigest,
  type SeedPost,
} from "./contentData.ts";
import { SEED_NOW } from "../seedClock.ts";
import { SEED_USERS, type SeedUser } from "../users/usersData.ts";

const { Client } = pg;

export type ContentDbClient = pg.Client;

export function createContentDbClient(config: SeedConfig): ContentDbClient {
  return new Client({
    host: config.contentDb.host,
    port: config.contentDb.port,
    database: config.contentDb.database,
    user: config.contentDb.user,
    password: config.contentDb.password,
  });
}

export async function connectContentDb(client: ContentDbClient, config: SeedConfig) {
  try {
    await client.connect();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not connect to Postgres at ${config.contentDb.host}:${config.contentDb.port}/${config.contentDb.database}: ${message}. ` +
        "Start local content database with: docker compose up -d content-db content-service",
    );
  }
}

export async function assertContentSeedSchemaExists(client: ContentDbClient) {
  const tables = ["posts", "topics", "post_topics", "post_source_urls", "comments", "bookmarks", "votes"];
  const result = await client.query<{ table_name: string }>(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
    `,
    [tables],
  );
  const existing = new Set(result.rows.map((row) => row.table_name));
  const missing = tables.filter((table) => !existing.has(table));

  if (missing.length > 0) {
    throw new Error(
      `Content database schema is missing table(s): ${missing.join(", ")}. ` +
        "Start content-service once so Flyway creates the local schema, then rerun the seed.",
    );
  }
}

export async function assertSeedUsersExist(client: pg.Client, users: SeedUser[]) {
  const ids = users.map((user) => user.id);
  const result = await client.query<{ id: string }>(
    "SELECT id::text FROM users WHERE id = ANY($1::uuid[])",
    [ids],
  );
  const existing = new Set(result.rows.map((row) => row.id));
  const missing = users.filter((user) => !existing.has(user.id)).map((user) => user.username);

  if (missing.length > 0) {
    throw new Error(`Seeded user(s) missing from user DB: ${missing.join(", ")}. Run npm run seed:local -- --only users first.`);
  }
}

export async function assertNoContentIdentityConflicts(client: ContentDbClient) {
  const allIds = [...SEED_POSTS.map((post) => post.id), ...SEED_DIGESTS.map((d) => d.id)];
  const allTitles = new Map([
    ...SEED_POSTS.map((post) => [post.id, post.title] as const),
    ...SEED_DIGESTS.map((d) => [d.id, d.title] as const),
  ]);
  const result = await client.query<{ id: string; title: string }>(
    "SELECT id::text, title FROM posts WHERE id = ANY($1::uuid[])",
    [allIds],
  );
  const conflicts = result.rows
    .filter((row) => allTitles.get(row.id) !== row.title)
    .map((row) => `post "${row.id}" already exists as "${row.title}", expected "${allTitles.get(row.id)}"`);

  if (conflicts.length > 0) {
    throw new Error(`Seed content identity conflict(s): ${conflicts.join("; ")}.`);
  }
}

export function validateContentFixtures() {
  // Validate all usernames resolve
  const userNames = new Set(SEED_POSTS.map((post) => post.authorUsername));
  for (const comment of SEED_COMMENTS) userNames.add(comment.authorUsername);
  for (const bookmark of SEED_BOOKMARKS) userNames.add(bookmark.userUsername);
  for (const vote of SEED_VOTES) userNames.add(vote.userUsername);
  for (const username of userNames) seedUserId(username);

  // Validate post references
  const postIds = new Set(SEED_POSTS.map((post) => post.id));
  for (const comment of SEED_COMMENTS) {
    if (!postIds.has(comment.postId)) throw new Error(`Comment "${comment.id}" references unknown post "${comment.postId}".`);
    if (comment.parentCommentId && !SEED_COMMENTS.some((candidate) => candidate.id === comment.parentCommentId)) {
      throw new Error(`Comment "${comment.id}" references unknown parent "${comment.parentCommentId}".`);
    }
  }
  for (const bookmark of SEED_BOOKMARKS) {
    if (!postIds.has(bookmark.postId)) throw new Error(`Bookmark "${bookmark.id}" references unknown post "${bookmark.postId}".`);
  }
  for (const vote of SEED_VOTES) {
    if (!postIds.has(vote.postId)) throw new Error(`Vote "${vote.id}" references unknown post "${vote.postId}".`);
  }

  // Validate post counter invariants
  for (const post of SEED_POSTS) {
    const counters = derivedCounters(post);
    if (counters.likeCount > post.viewCount || counters.commentCount > post.viewCount || counters.saveCount > post.viewCount) {
      throw new Error(`Post "${post.title}" has derived counters greater than view_count.`);
    }
  }

  // Validate cover images
  const validCovers = new Set([
    "agent-tooling.png", "fine-tuning.png", "inference-optimization.png",
    "mechanistic-interpretability.png", "model-evaluation.png", "rag-evaluation.png",
  ]);
  for (const post of SEED_POSTS) {
    if (post.coverImageFile && !validCovers.has(post.coverImageFile)) {
      throw new Error(`Post "${post.title}" references unknown cover image "${post.coverImageFile}".`);
    }
  }

  // Validate digests
  const topicNames = new Set(SEED_TOPICS.map((t) => t.name));
  for (const digest of SEED_DIGESTS) {
    if (digest.targetUsername !== null) seedUserId(digest.targetUsername); // personal target must resolve; null = public (ADR-0016)
    if (digest.coverImageFile && !validCovers.has(digest.coverImageFile)) {
      throw new Error(`Digest "${digest.title}" references unknown cover image "${digest.coverImageFile}".`);
    }
    for (const topicName of digest.topicNames) {
      if (!topicNames.has(topicName)) {
        throw new Error(`Digest "${digest.title}" references unknown topic "${topicName}".`);
      }
    }
  }
}

interface SeedDigestEventData {
  headline: string;
  summaryBullets: string[];
  topicIds: string[];
  sources: { url: string; sourceName: string | null; provider: string | null; publishedAt: string | null; title: string | null }[];
}

function sourceNameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Derive a structured event stream (ADR-0019) from a fixture's Markdown body and flat sources. */
function buildDigestEvents(digest: SeedDigest, topicIds: string[]): SeedDigestEventData[] {
  const sections = digest.content.split(/\n(?=### )/).filter((s) => s.includes("### "));
  const urls = digest.sourceUrls;
  const events: SeedDigestEventData[] = sections.map((section, idx) => {
    const lines = section.split("\n");
    const headingLine = lines.find((l) => l.startsWith("### ")) ?? "";
    const headline = headingLine.replace(/^###\s*/, "").trim();
    const bullets = lines
      .filter((l) => l.trim().startsWith("- "))
      .map((l) => l.replace(/^\s*-\s*/, "").trim())
      .slice(0, 3);
    if (bullets.length === 0) {
      const prose = lines.filter((l) => l.trim() && !l.startsWith("#")).join(" ").trim();
      if (prose) bullets.push(prose.length > 200 ? prose.slice(0, 197) + "…" : prose);
    }
    // Round-robin the flat sources across events so each cites at least one when available.
    const eventUrls = urls.filter((_, i) => (urls.length ? i % sections.length === idx : false));
    const chosen = eventUrls.length ? eventUrls : urls.slice(0, 1);
    return {
      headline,
      summaryBullets: bullets.length ? bullets : [headline],
      topicIds,
      sources: chosen.map((url) => ({
        url,
        sourceName: sourceNameFromUrl(url),
        provider: null,
        publishedAt: digest.createdAt,
        title: null,
      })),
    };
  });
  if (events.length === 0) {
    events.push({
      headline: digest.title,
      summaryBullets: [digest.summary],
      topicIds,
      sources: urls.map((url) => ({
        url,
        sourceName: sourceNameFromUrl(url),
        provider: null,
        publishedAt: digest.createdAt,
        title: null,
      })),
    });
  }
  return events;
}

function estimateReadTime(digest: SeedDigest): number {
  const words = digest.content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export async function upsertSeedContent(client: ContentDbClient, coverUrlsByPostId: Map<string, string> = new Map()) {
  await client.query("BEGIN");
  try {
    await upsertTopics(client);
    const topicIdsByName = await getTopicIdsByName(client, topicNamesUsedByPostsAndDigests());

    // Clean up existing seed data. Digests are a standalone entity now (ADR-0019), so only
    // NORMAL posts live in `posts`; digests are cleaned from `digests` / `digest_assignments`.
    const allPostIds = SEED_POSTS.map((post) => post.id);
    const allDigestIds = SEED_DIGESTS.map((d) => d.id);
    await client.query("DELETE FROM votes WHERE target_type = 'POST' AND target_id = ANY($1::uuid[])", [allPostIds]);
    await client.query("DELETE FROM bookmarks WHERE post_id = ANY($1::uuid[])", [allPostIds]);
    await client.query("DELETE FROM comments WHERE post_id = ANY($1::uuid[])", [allPostIds]);
    await client.query("DELETE FROM post_source_urls WHERE post_id = ANY($1::uuid[])", [allPostIds]);
    await client.query("DELETE FROM post_topics WHERE post_id = ANY($1::uuid[])", [allPostIds]);
    await client.query("DELETE FROM digest_assignments WHERE digest_id = ANY($1::uuid[])", [allDigestIds]);
    await client.query("DELETE FROM digests WHERE id = ANY($1::uuid[])", [allDigestIds]);

    // Upsert posts
    for (const post of SEED_POSTS) {
      const counters = derivedCounters(post);
      await client.query(
        `
        INSERT INTO posts (
          id, author_id, title, content, excerpt, cover_image_url, content_summary,
          summary_status, summary_generated_at, summary_model,
          status, like_count, dislike_count, comment_count, view_count, save_count,
          deleted, deleted_at, created_at, updated_at
        )
        VALUES (
          $1::uuid, $2::uuid, $3, $4, $5, $6, $7,
          'COMPLETED', $8::timestamptz, $9,
          'PUBLISHED', $10, 0, $11, $12, $13,
          false, NULL, $14::timestamptz, $15::timestamptz
        )
        ON CONFLICT (id) DO UPDATE SET
          author_id = EXCLUDED.author_id,
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          excerpt = EXCLUDED.excerpt,
          cover_image_url = EXCLUDED.cover_image_url,
          content_summary = EXCLUDED.content_summary,
          summary_status = EXCLUDED.summary_status,
          summary_generated_at = EXCLUDED.summary_generated_at,
          summary_model = EXCLUDED.summary_model,
          status = EXCLUDED.status,
          like_count = EXCLUDED.like_count,
          dislike_count = 0,
          comment_count = EXCLUDED.comment_count,
          view_count = EXCLUDED.view_count,
          save_count = EXCLUDED.save_count,
          deleted = false,
          deleted_at = NULL,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at
        `,
        [
          post.id,
          seedUserId(post.authorUsername),
          post.title,
          post.content,
          post.excerpt,
          coverUrlsByPostId.get(post.id) ?? null,
          post.contentSummary,
          post.summaryGeneratedAt,
          post.summaryModel,
          counters.likeCount,
          counters.commentCount,
          post.viewCount,
          counters.saveCount,
          post.createdAt,
          post.updatedAt,
        ],
      );

      for (const sourceUrl of post.sourceUrls) {
        await client.query("INSERT INTO post_source_urls (post_id, source_url) VALUES ($1::uuid, $2)", [post.id, sourceUrl]);
      }
      for (const topicName of post.topicNames) {
        const topicId = topicIdsByName.get(topicName);
        if (!topicId) throw new Error(`Topic "${topicName}" was not found after topic upsert.`);
        await client.query("INSERT INTO post_topics (post_id, topic_id) VALUES ($1::uuid, $2::uuid)", [post.id, topicId]);
      }
    }

    // Upsert digests into the standalone `digests` table (ADR-0019). Events are derived from the
    // fixture Markdown so existing fixtures need no restructuring.
    for (const digest of SEED_DIGESTS) {
      const topicIds = digest.topicNames.map((name) => {
        const topicId = topicIdsByName.get(name);
        if (!topicId) throw new Error(`Topic "${name}" was not found after topic upsert (digest).`);
        return topicId;
      });
      const topicsJson = digest.topicNames.map((name) => ({ id: topicIdsByName.get(name)!, name }));
      const events = buildDigestEvents(digest, topicIds);
      const previewHeadlines = events.slice(0, 3).map((e) => e.headline);
      const sourceCount = new Set(digest.sourceUrls).size;
      const readTimeMin = estimateReadTime(digest);
      const digestType = digest.targetUsername === null ? "PUBLIC" : "PERSONAL";
      const targetUserId = digest.targetUsername === null ? null : seedUserId(digest.targetUsername);
      const digestDate = digest.createdAt.slice(0, 10);

      await client.query(
        `
        INSERT INTO digests (
          id, digest_type, target_user_id, digest_date, title, subtitle, summary,
          events, topics, event_count, source_count, read_time_min, preview_headlines,
          model, generated_at, created_at
        )
        VALUES (
          $1::uuid, $2, $3::uuid, $4::date, $5, $6, $7,
          $8::jsonb, $9::jsonb, $10, $11, $12, $13::text[],
          $14, $15::timestamptz, $16::timestamptz
        )
        ON CONFLICT (id) DO UPDATE SET
          digest_type = EXCLUDED.digest_type,
          target_user_id = EXCLUDED.target_user_id,
          digest_date = EXCLUDED.digest_date,
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          summary = EXCLUDED.summary,
          events = EXCLUDED.events,
          topics = EXCLUDED.topics,
          event_count = EXCLUDED.event_count,
          source_count = EXCLUDED.source_count,
          read_time_min = EXCLUDED.read_time_min,
          preview_headlines = EXCLUDED.preview_headlines,
          model = EXCLUDED.model,
          generated_at = EXCLUDED.generated_at,
          created_at = EXCLUDED.created_at
        `,
        [
          digest.id,
          digestType,
          targetUserId,
          digestDate,
          digest.title,
          // No distinct subtitle in seed fixtures — leave null so the reader does not
          // render the summary twice (subtitle above the fold + intro below). Real
          // generated digests supply a distinct topStorySubtitle.
          null,
          digest.summary,
          JSON.stringify(events),
          JSON.stringify(topicsJson),
          events.length,
          sourceCount,
          readTimeMin,
          previewHeadlines,
          "seed-fixture",
          digest.createdAt,
          digest.createdAt,
        ],
      );
    }

    // Assign each PUBLIC digest to seeded users as a zero-subscription fallback (ADR-0018/0019).
    // A user gets the public digest only on a day they have no PERSONAL digest — the
    // (user_id, digest_date) primary key enforces personal/public mutual exclusivity per day.
    const personalDigestDays = new Set(
      SEED_DIGESTS.filter((d) => d.targetUsername !== null).map(
        (d) => `${d.targetUsername}|${d.createdAt.slice(0, 10)}`,
      ),
    );
    for (const digest of SEED_DIGESTS) {
      if (digest.targetUsername !== null) continue; // personal digests aren't assigned
      const digestDate = digest.createdAt.slice(0, 10);
      for (const user of SEED_USERS) {
        if (personalDigestDays.has(`${user.username}|${digestDate}`)) continue;
        await client.query(
          `
          INSERT INTO digest_assignments (user_id, digest_date, digest_id, created_at)
          VALUES ($1::uuid, $2::date, $3::uuid, $4::timestamptz)
          ON CONFLICT (user_id, digest_date) DO UPDATE SET
            digest_id = EXCLUDED.digest_id,
            created_at = EXCLUDED.created_at
          `,
          [user.id, digestDate, digest.id, digest.createdAt],
        );
      }
    }

    // Upsert comments
    for (const comment of SEED_COMMENTS) {
      await client.query(
        `
        INSERT INTO comments (
          id, post_id, author_id, parent_comment_id, text, like_count, deleted, deleted_at, created_at, updated_at
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, false, NULL, $7::timestamptz, $8::timestamptz)
        `,
        [
          comment.id,
          comment.postId,
          seedUserId(comment.authorUsername),
          comment.parentCommentId,
          comment.text,
          comment.likeCount,
          comment.createdAt,
          comment.updatedAt,
        ],
      );
    }

    for (const bookmark of SEED_BOOKMARKS) {
      await client.query(
        "INSERT INTO bookmarks (id, user_id, post_id, created_at, updated_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::timestamptz, $4::timestamptz)",
        [bookmark.id, seedUserId(bookmark.userUsername), bookmark.postId, bookmark.createdAt],
      );
    }

    for (const vote of SEED_VOTES) {
      await client.query(
        "INSERT INTO votes (id, user_id, target_type, target_id, vote_type, created_at, updated_at) VALUES ($1::uuid, $2::uuid, 'POST', $3::uuid, $4, $5::timestamptz, $5::timestamptz)",
        [vote.id, seedUserId(vote.userUsername), vote.postId, vote.voteType, vote.createdAt],
      );
    }

    await refreshTopicCounters(client, topicIdsByName);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

/**
 * Purges all seed-owned content: posts authored by a seed user or by the digest
 * system author, their child rows, plus any votes/bookmarks/comments a seed user
 * placed on a *non-seed* post. Catches stale rows from earlier fixture versions
 * because ownership is resolved from live author/user ids, not the current fixtures.
 * Topics are intentionally left intact (shared, no author; reseed recomputes their
 * counters). When dryRun, rolls back so nothing is mutated but counts are reported.
 */
export async function resetSeedContent(
  client: ContentDbClient,
  seedUserIds: string[],
  { dryRun }: { dryRun: boolean },
): Promise<{ posts: number; votes: number; bookmarks: number; comments: number }> {
  const postAuthorIds = [...seedUserIds, DIGEST_SYSTEM_AUTHOR_ID];

  await client.query("BEGIN");
  try {
    const seedPostRows = await client.query<{ id: string }>(
      "SELECT id::text FROM posts WHERE author_id = ANY($1::uuid[])",
      [postAuthorIds],
    );
    const seedPostIds = seedPostRows.rows.map((row) => row.id);

    // Resolve the comments that will be deleted up front so their COMMENT-target
    // votes can be purged too — otherwise a non-seed user's vote on a seed comment
    // would be stranded pointing at a missing row (votes are polymorphic, no FK).
    const seedCommentRows = await client.query<{ id: string }>(
      "SELECT id::text FROM comments WHERE post_id = ANY($1::uuid[]) OR author_id = ANY($2::uuid[])",
      [seedPostIds, seedUserIds],
    );
    const seedCommentIds = seedCommentRows.rows.map((row) => row.id);

    const votes = await client.query(
      `DELETE FROM votes WHERE (target_type = 'POST' AND target_id = ANY($1::uuid[]))
         OR (target_type = 'COMMENT' AND target_id = ANY($2::uuid[]))
         OR user_id = ANY($3::uuid[])`,
      [seedPostIds, seedCommentIds, seedUserIds],
    );
    const bookmarks = await client.query(
      "DELETE FROM bookmarks WHERE post_id = ANY($1::uuid[]) OR user_id = ANY($2::uuid[])",
      [seedPostIds, seedUserIds],
    );
    const comments = await client.query(
      "DELETE FROM comments WHERE id = ANY($1::uuid[])",
      [seedCommentIds],
    );
    await client.query("DELETE FROM post_source_urls WHERE post_id = ANY($1::uuid[])", [seedPostIds]);
    await client.query("DELETE FROM post_topics WHERE post_id = ANY($1::uuid[])", [seedPostIds]);
    const posts = await client.query("DELETE FROM posts WHERE id = ANY($1::uuid[])", [seedPostIds]);

    await client.query(dryRun ? "ROLLBACK" : "COMMIT");
    return {
      posts: posts.rowCount ?? 0,
      votes: votes.rowCount ?? 0,
      bookmarks: bookmarks.rowCount ?? 0,
      comments: comments.rowCount ?? 0,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function getSeedPostIds(client: ContentDbClient): Promise<Set<string>> {
  const ids = SEED_POSTS.map((post) => post.id);
  const result = await client.query<{ id: string }>(
    "SELECT id::text FROM posts WHERE id = ANY($1::uuid[])",
    [ids],
  );
  return new Set(result.rows.map((row) => row.id));
}

export async function getSeedTopicIdsByName(client: ContentDbClient): Promise<Map<string, string>> {
  return getTopicIdsByName(client, topicNamesUsedByPostsAndDigests());
}

export async function getExistingSeedTopicIdsByName(client: ContentDbClient): Promise<Map<string, string>> {
  const result = await client.query<{ id: string; name: string }>(
    "SELECT id::text, name FROM topics WHERE name = ANY($1::text[])",
    [topicNamesUsedByPostsAndDigests()],
  );
  return new Map(result.rows.map((row) => [row.name, row.id]));
}

function derivedCounters(post: SeedPost) {
  return {
    likeCount: SEED_VOTES.filter((vote) => vote.postId === post.id).length,
    commentCount: SEED_COMMENTS.filter((comment) => comment.postId === post.id).length,
    saveCount: SEED_BOOKMARKS.filter((bookmark) => bookmark.postId === post.id).length,
  };
}

async function upsertTopics(client: ContentDbClient) {
  const referenceTime = SEED_NOW.toISOString();
  for (const topic of SEED_TOPICS) {
    await client.query(
      `
      INSERT INTO topics (
        id, name, display_name, category_id, sort_order,
        total_post_count, posts_this_week, posts_prev_week, activity_score, is_hot,
        follower_count, created_at, updated_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, 0, 0, 0, false, $5, $6::timestamptz, $6::timestamptz)
      ON CONFLICT (name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        category_id = EXCLUDED.category_id,
        sort_order = EXCLUDED.sort_order,
        follower_count = EXCLUDED.follower_count,
        updated_at = EXCLUDED.updated_at
      `,
      [topic.name, topic.displayName, topic.categoryId, topic.sortOrder, topic.followerBaseline, referenceTime],
    );
  }
}

async function getTopicIdsByName(client: ContentDbClient, topicNames: string[]): Promise<Map<string, string>> {
  const result = await client.query<{ id: string; name: string }>(
    "SELECT id::text, name FROM topics WHERE name = ANY($1::text[])",
    [topicNames],
  );
  const topicIdsByName = new Map(result.rows.map((row) => [row.name, row.id]));
  const missing = topicNames.filter((name) => !topicIdsByName.has(name));
  if (missing.length > 0) {
    throw new Error(`Content topics missing from DB: ${missing.join(", ")}.`);
  }
  return topicIdsByName;
}

function topicNamesUsedByPostsAndDigests(): string[] {
  return [...new Set([
    ...SEED_POSTS.flatMap((post) => post.topicNames),
    ...SEED_DIGESTS.flatMap((digest) => digest.topicNames),
  ])];
}

async function refreshTopicCounters(client: ContentDbClient, topicIdsByName: Map<string, string>) {
  const referenceTime = SEED_NOW.toISOString();
  const stats = new Map<string, { total: number; thisWeek: number; prevWeek: number }>();
  let maxThisWeek = 0;

  for (const [topicName, topicId] of topicIdsByName) {
    const result = await client.query<{ total: string; this_week: string; prev_week: string }>(
      `
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (
          WHERE p.created_at >= ($2::timestamptz - interval '7 days')
            AND p.created_at <= $2::timestamptz
        )::text AS this_week,
        COUNT(*) FILTER (
          WHERE p.created_at >= ($2::timestamptz - interval '14 days')
            AND p.created_at < ($2::timestamptz - interval '7 days')
        )::text AS prev_week
      FROM posts p
      JOIN post_topics pt ON pt.post_id = p.id
      WHERE pt.topic_id = $1::uuid
        AND p.status = 'PUBLISHED'
        AND p.deleted = false
      `,
      [topicId, referenceTime],
    );
    const row = result.rows[0];
    const values = {
      total: Number(row?.total ?? 0),
      thisWeek: Number(row?.this_week ?? 0),
      prevWeek: Number(row?.prev_week ?? 0),
    };
    stats.set(topicName, values);
    maxThisWeek = Math.max(maxThisWeek, values.thisWeek);
  }

  for (const [topicName, values] of stats) {
    const topicId = topicIdsByName.get(topicName);
    const activityScore = maxThisWeek === 0 ? 0 : values.thisWeek / maxThisWeek;
    const isHot = values.thisWeek >= 3 && (values.prevWeek === 0 || values.thisWeek / values.prevWeek > 1.5);
    await client.query(
      `
      UPDATE topics
      SET total_post_count = $2,
          posts_this_week = $3,
          posts_prev_week = $4,
          activity_score = $5,
          is_hot = $6,
          updated_at = $7::timestamptz
      WHERE id = $1::uuid
      `,
      [topicId, values.total, values.thisWeek, values.prevWeek, activityScore.toFixed(3), isHot, referenceTime],
    );
  }
}

import pg from "pg";
import type { SeedConfig } from "../../config.ts";
import {
  SEED_BOOKMARKS,
  SEED_COMMENTS,
  SEED_POSTS,
  SEED_REFERENCE_TIME,
  SEED_TOPICS,
  SEED_VOTES,
  seedUserId,
  type SeedPost,
} from "./contentData.ts";
import type { SeedUser } from "../users/usersData.ts";

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
  const postIds = SEED_POSTS.map((post) => post.id);
  const result = await client.query<{ id: string; title: string }>(
    "SELECT id::text, title FROM posts WHERE id = ANY($1::uuid[])",
    [postIds],
  );
  const expectedById = new Map(SEED_POSTS.map((post) => [post.id, post.title]));
  const conflicts = result.rows
    .filter((row) => expectedById.get(row.id) !== row.title)
    .map((row) => `post "${row.id}" already exists as "${row.title}", expected "${expectedById.get(row.id)}"`);

  if (conflicts.length > 0) {
    throw new Error(`Seed content identity conflict(s): ${conflicts.join("; ")}.`);
  }
}

export function validateContentFixtures() {
  const userNames = new Set(SEED_POSTS.map((post) => post.authorUsername));
  for (const comment of SEED_COMMENTS) userNames.add(comment.authorUsername);
  for (const bookmark of SEED_BOOKMARKS) userNames.add(bookmark.userUsername);
  for (const vote of SEED_VOTES) userNames.add(vote.userUsername);
  for (const username of userNames) seedUserId(username);

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

  for (const post of SEED_POSTS) {
    const counters = derivedCounters(post);
    if (counters.likeCount > post.viewCount || counters.commentCount > post.viewCount || counters.saveCount > post.viewCount) {
      throw new Error(`Post "${post.title}" has derived counters greater than view_count.`);
    }
  }
}

export async function upsertSeedContent(client: ContentDbClient, coverUrlsByPostId: Map<string, string> = new Map()) {
  await client.query("BEGIN");
  try {
    await upsertTopics(client);
    const topicIdsByName = await getTopicIdsByName(client, topicNamesUsedByPosts());

    const postIds = SEED_POSTS.map((post) => post.id);
    await client.query("DELETE FROM votes WHERE target_type = 'POST' AND target_id = ANY($1::uuid[])", [postIds]);
    await client.query("DELETE FROM bookmarks WHERE post_id = ANY($1::uuid[])", [postIds]);
    await client.query("DELETE FROM comments WHERE post_id = ANY($1::uuid[])", [postIds]);
    await client.query("DELETE FROM post_source_urls WHERE post_id = ANY($1::uuid[])", [postIds]);
    await client.query("DELETE FROM post_topics WHERE post_id = ANY($1::uuid[])", [postIds]);

    for (const post of SEED_POSTS) {
      const counters = derivedCounters(post);
      await client.query(
        `
        INSERT INTO posts (
          id, author_id, title, content, excerpt, cover_image_url, content_summary,
          status, type, like_count, dislike_count, comment_count, view_count, save_count,
          deleted, deleted_at, created_at, updated_at
        )
        VALUES (
          $1::uuid, $2::uuid, $3, $4, $5, $6, $7,
          'PUBLISHED', 'NORMAL', $8, 0, $9, $10, $11,
          false, NULL, $12::timestamptz, $13::timestamptz
        )
        ON CONFLICT (id) DO UPDATE SET
          author_id = EXCLUDED.author_id,
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          excerpt = EXCLUDED.excerpt,
          cover_image_url = EXCLUDED.cover_image_url,
          content_summary = EXCLUDED.content_summary,
          status = EXCLUDED.status,
          type = EXCLUDED.type,
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

export async function getSeedPostIds(client: ContentDbClient): Promise<Set<string>> {
  const ids = SEED_POSTS.map((post) => post.id);
  const result = await client.query<{ id: string }>(
    "SELECT id::text FROM posts WHERE id = ANY($1::uuid[])",
    [ids],
  );
  return new Set(result.rows.map((row) => row.id));
}

export async function getSeedTopicIdsByName(client: ContentDbClient): Promise<Map<string, string>> {
  return getTopicIdsByName(client, topicNamesUsedByPosts());
}

export async function getExistingSeedTopicIdsByName(client: ContentDbClient): Promise<Map<string, string>> {
  const result = await client.query<{ id: string; name: string }>(
    "SELECT id::text, name FROM topics WHERE name = ANY($1::text[])",
    [topicNamesUsedByPosts()],
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
  for (const topic of SEED_TOPICS) {
    await client.query(
      `
      INSERT INTO topics (
        id, name, display_name, category_id, sort_order,
        total_post_count, posts_this_week, posts_prev_week, activity_score, is_hot,
        follower_count, created_at, updated_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 0, 0, 0, 0, false, 0, $5::timestamptz, $5::timestamptz)
      ON CONFLICT (name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        category_id = EXCLUDED.category_id,
        sort_order = EXCLUDED.sort_order,
        updated_at = EXCLUDED.updated_at
      `,
      [topic.name, topic.displayName, topic.categoryId, topic.sortOrder, SEED_REFERENCE_TIME],
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

function topicNamesUsedByPosts(): string[] {
  return [...new Set(SEED_POSTS.flatMap((post) => post.topicNames))];
}

async function refreshTopicCounters(client: ContentDbClient, topicIdsByName: Map<string, string>) {
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
      [topicId, SEED_REFERENCE_TIME],
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
      [topicId, values.total, values.thisWeek, values.prevWeek, activityScore.toFixed(3), isHot, SEED_REFERENCE_TIME],
    );
  }
}

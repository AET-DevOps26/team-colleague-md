import pg from "pg";
import type { SeedConfig } from "../../config.ts";
import { seedUserId } from "../content/contentData.ts";
import {
  SEED_INTERACTIONS,
  SEED_NOTIFICATIONS,
  SEED_TOPIC_SUBSCRIPTIONS,
  SEED_USER_SUBSCRIPTIONS,
} from "./recommendationsData.ts";

const { Client } = pg;

export type RecommendationDbClient = pg.Client;

export function createRecommendationDbClient(config: SeedConfig): RecommendationDbClient {
  return new Client({
    host: config.recommendationDb.host,
    port: config.recommendationDb.port,
    database: config.recommendationDb.database,
    user: config.recommendationDb.user,
    password: config.recommendationDb.password,
  });
}

export async function connectRecommendationDb(client: RecommendationDbClient, config: SeedConfig) {
  try {
    await client.connect();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not connect to Postgres at ${config.recommendationDb.host}:${config.recommendationDb.port}/${config.recommendationDb.database}: ${message}. ` +
        "Start local recommendation database with: docker compose up -d recommendation-db recommendation-service",
    );
  }
}

export async function assertRecommendationSeedSchemaExists(client: RecommendationDbClient) {
  const tables = ["interactions", "topic_subscriptions", "user_subscriptions", "notifications"];
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
      `Recommendation database schema is missing table(s): ${missing.join(", ")}. ` +
        "Start recommendation-service once so Flyway creates the local schema, then rerun the seed.",
    );
  }
}

export function validateRecommendationFixtures(seedPostIds: Set<string>, topicIdsByName: Map<string, string>) {
  for (const subscription of SEED_TOPIC_SUBSCRIPTIONS) {
    seedUserId(subscription.userUsername);
    if (!topicIdsByName.has(subscription.topicName)) {
      throw new Error(`Topic subscription references missing topic "${subscription.topicName}".`);
    }
  }
  for (const subscription of SEED_USER_SUBSCRIPTIONS) {
    seedUserId(subscription.followerUsername);
    seedUserId(subscription.followedUsername);
    if (subscription.followerUsername === subscription.followedUsername) {
      throw new Error(`User subscription "${subscription.id}" follows itself.`);
    }
  }
  for (const interaction of SEED_INTERACTIONS) {
    seedUserId(interaction.userUsername);
    if (!seedPostIds.has(interaction.postId)) {
      throw new Error(`Interaction "${interaction.id}" references missing seeded post "${interaction.postId}".`);
    }
  }
  for (const notification of SEED_NOTIFICATIONS) {
    seedUserId(notification.userUsername);
    if (notification.relatedPostId && !seedPostIds.has(notification.relatedPostId)) {
      throw new Error(`Notification "${notification.id}" references missing seeded post "${notification.relatedPostId}".`);
    }
  }
}

export async function upsertSeedRecommendations(
  recommendationClient: RecommendationDbClient,
  contentClient: pg.Client,
  topicIdsByName: Map<string, string>,
) {
  await recommendationClient.query("BEGIN");
  try {
    await recommendationClient.query("DELETE FROM interactions WHERE id = ANY($1::uuid[])", [SEED_INTERACTIONS.map((row) => row.id)]);
    await recommendationClient.query("DELETE FROM notifications WHERE id = ANY($1::uuid[])", [SEED_NOTIFICATIONS.map((row) => row.id)]);
    await recommendationClient.query(
      "DELETE FROM topic_subscriptions WHERE user_id = ANY($1::uuid[]) AND topic_id = ANY($2::uuid[])",
      [seededRecommendationUserIds(), [...topicIdsByName.values()]],
    );
    await recommendationClient.query(
      "DELETE FROM user_subscriptions WHERE follower_id = ANY($1::uuid[]) AND followed_id = ANY($1::uuid[])",
      [seededRecommendationUserIds()],
    );

    for (const subscription of SEED_TOPIC_SUBSCRIPTIONS) {
      await recommendationClient.query(
        "INSERT INTO topic_subscriptions (id, user_id, topic_id, created_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::timestamptz)",
        [subscription.id, seedUserId(subscription.userUsername), topicIdsByName.get(subscription.topicName), subscription.createdAt],
      );
    }
    for (const subscription of SEED_USER_SUBSCRIPTIONS) {
      await recommendationClient.query(
        "INSERT INTO user_subscriptions (id, follower_id, followed_id, created_at) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::timestamptz)",
        [subscription.id, seedUserId(subscription.followerUsername), seedUserId(subscription.followedUsername), subscription.createdAt],
      );
    }
    for (const interaction of SEED_INTERACTIONS) {
      await recommendationClient.query(
        `
        INSERT INTO interactions (
          id, user_id, post_id, interaction_type, duration_seconds, scroll_depth, metadata, created_at
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::jsonb, $8::timestamptz)
        `,
        [
          interaction.id,
          seedUserId(interaction.userUsername),
          interaction.postId,
          interaction.interactionType,
          interaction.durationSeconds,
          interaction.scrollDepth,
          JSON.stringify(interaction.metadata),
          interaction.createdAt,
        ],
      );
    }
    for (const notification of SEED_NOTIFICATIONS) {
      await recommendationClient.query(
        `
        INSERT INTO notifications (
          id, user_id, type, content, related_post_id, is_read, created_at
        )
        VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6, $7::timestamptz)
        `,
        [
          notification.id,
          seedUserId(notification.userUsername),
          notification.type,
          notification.content,
          notification.relatedPostId,
          notification.isRead,
          notification.createdAt,
        ],
      );
    }

    await recommendationClient.query("COMMIT");
  } catch (error) {
    await recommendationClient.query("ROLLBACK");
    throw error;
  }

  await refreshContentTopicFollowerCounts(contentClient, topicIdsByName);
}

function seededRecommendationUserIds(): string[] {
  return [...new Set([
    ...SEED_TOPIC_SUBSCRIPTIONS.map((row) => seedUserId(row.userUsername)),
    ...SEED_USER_SUBSCRIPTIONS.flatMap((row) => [seedUserId(row.followerUsername), seedUserId(row.followedUsername)]),
    ...SEED_INTERACTIONS.map((row) => seedUserId(row.userUsername)),
    ...SEED_NOTIFICATIONS.map((row) => seedUserId(row.userUsername)),
  ])];
}

async function refreshContentTopicFollowerCounts(contentClient: pg.Client, topicIdsByName: Map<string, string>) {
  const countsByTopicName = new Map<string, number>();
  for (const subscription of SEED_TOPIC_SUBSCRIPTIONS) {
    countsByTopicName.set(subscription.topicName, (countsByTopicName.get(subscription.topicName) ?? 0) + 1);
  }

  for (const [topicName, topicId] of topicIdsByName) {
    if (!countsByTopicName.has(topicName)) continue;
    await contentClient.query(
      "UPDATE topics SET follower_count = follower_count + $2 WHERE id = $1::uuid",
      [topicId, countsByTopicName.get(topicName)],
    );
  }
}

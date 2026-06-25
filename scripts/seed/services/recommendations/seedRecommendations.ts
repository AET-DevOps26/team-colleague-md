import type { SeedOptions } from "../../cli.ts";
import type { SeedConfig } from "../../config.ts";
import { SEED_POSTS } from "../content/contentData.ts";
import {
  assertSeedUsersExist,
  connectContentDb,
  createContentDbClient,
  getExistingSeedTopicIdsByName,
  getSeedPostIds,
  getSeedTopicIdsByName,
} from "../content/contentRepository.ts";
import { SEED_INTERACTIONS, SEED_NOTIFICATIONS, SEED_TOPIC_SUBSCRIPTIONS, SEED_USER_SUBSCRIPTIONS } from "./recommendationsData.ts";
import {
  assertRecommendationSeedSchemaExists,
  connectRecommendationDb,
  createRecommendationDbClient,
  upsertSeedRecommendations,
  validateRecommendationFixtures,
} from "./recommendationsRepository.ts";
import { SEED_USERS } from "../users/usersData.ts";
import { connectUserDb, createUserDbClient } from "../users/usersRepository.ts";

interface RecommendationSeedRunContext {
  usersPlannedInCurrentDryRun?: boolean;
  contentPlannedInCurrentDryRun?: boolean;
}

export async function seedRecommendations(config: SeedConfig, options: SeedOptions, context: RecommendationSeedRunContext = {}) {
  console.log(`Preflighting recommendation fixtures.`);

  const userDbClient = createUserDbClient(config);
  await connectUserDb(userDbClient, config);
  try {
    if (!context.usersPlannedInCurrentDryRun) {
      await assertSeedUsersExist(userDbClient, SEED_USERS);
    }
  } finally {
    await userDbClient.end();
  }

  const contentDbClient = createContentDbClient(config);
  await connectContentDb(contentDbClient, config);

  const recommendationDbClient = createRecommendationDbClient(config);
  await connectRecommendationDb(recommendationDbClient, config);

  try {
    await assertRecommendationSeedSchemaExists(recommendationDbClient);
    const seedPostIds = await getSeedPostIds(contentDbClient);
    const topicIdsByName = context.contentPlannedInCurrentDryRun
      ? await getExistingSeedTopicIdsByName(contentDbClient)
      : await getSeedTopicIdsByName(contentDbClient);
    if (context.contentPlannedInCurrentDryRun) {
      mergePlannedContentSeedIdentities(seedPostIds, topicIdsByName);
    }
    validateRecommendationFixtures(seedPostIds, topicIdsByName);

    if (options.dryRun) {
      console.log(`Would replace ${SEED_TOPIC_SUBSCRIPTIONS.length} topic subscription(s).`);
      console.log(`Would replace ${SEED_USER_SUBSCRIPTIONS.length} user subscription(s).`);
      console.log(`Would replace ${SEED_INTERACTIONS.length} sampled interaction(s).`);
      console.log(`Would replace ${SEED_NOTIFICATIONS.length} notification(s).`);
      return;
    }

    console.log(`Upserting recommendation fixtures.`);
    await upsertSeedRecommendations(recommendationDbClient, contentDbClient, topicIdsByName);
  } finally {
    await recommendationDbClient.end();
    await contentDbClient.end();
  }
}

function mergePlannedContentSeedIdentities(seedPostIds: Set<string>, topicIdsByName: Map<string, string>) {
  for (const post of SEED_POSTS) {
    seedPostIds.add(post.id);
    for (const topicName of post.topicNames) {
      if (!topicIdsByName.has(topicName)) {
        topicIdsByName.set(topicName, plannedTopicId(topicName));
      }
    }
  }
  for (const subscription of SEED_TOPIC_SUBSCRIPTIONS) {
    if (!topicIdsByName.has(subscription.topicName)) {
      topicIdsByName.set(subscription.topicName, plannedTopicId(subscription.topicName));
    }
  }
}

function plannedTopicId(topicName: string): string {
  return `dry-run-topic:${topicName}`;
}

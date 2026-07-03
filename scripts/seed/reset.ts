import type { SeedOptions } from "./cli.ts";
import type { SeedConfig } from "./config.ts";
import {
  connectUserDb,
  createUserDbClient,
  getSeedUserIdentities,
  resetSeedUsers,
} from "./services/users/usersRepository.ts";
import { createMinioClient, deleteSeedAvatars } from "./services/users/avatarStorage.ts";
import {
  connectContentDb,
  createContentDbClient,
  resetSeedContent,
} from "./services/content/contentRepository.ts";
import {
  createContentStorageClient,
  deleteAllSeedPostCovers,
} from "./services/content/postCoverStorage.ts";
import {
  connectRecommendationDb,
  createRecommendationDbClient,
  resetSeedRecommendations,
} from "./services/recommendations/recommendationsRepository.ts";

/**
 * Purges previously-seeded data before a fresh seed so stale rows from earlier
 * fixture versions do not linger (the seed upserts by id and never removes rows
 * dropped from the fixtures). Ownership is resolved from live seed user ids, so
 * only seed-owned rows are deleted — real user data is preserved. Honors --only
 * and, under --dry-run, reports counts without mutating anything.
 */
export async function resetSeed(config: SeedConfig, options: SeedOptions) {
  const label = options.dryRun ? "Reset (dry run)" : "Reset";
  console.log(`${label}: resolving seed-owned rows.`);

  // Seed user ids are needed by every domain, so gather them even when --only
  // excludes users. This is read-only; users are deleted last (below).
  const userDbClient = createUserDbClient(config);
  await connectUserDb(userDbClient, config);
  let identities;
  try {
    identities = await getSeedUserIdentities(userDbClient);
  } finally {
    await userDbClient.end();
  }
  const { ids: seedUserIds, usernames: seedUsernames } = identities;
  console.log(`${label}: ${seedUserIds.length} seed user(s) own the data to purge.`);

  if (options.only.includes("content")) {
    const contentDbClient = createContentDbClient(config);
    await connectContentDb(contentDbClient, config);
    try {
      const counts = await resetSeedContent(contentDbClient, seedUserIds, { dryRun: options.dryRun });
      console.log(
        `${label}: content — ${counts.posts} post(s), ${counts.comments} comment(s), ` +
          `${counts.votes} vote(s), ${counts.bookmarks} bookmark(s).`,
      );
    } finally {
      await contentDbClient.end();
    }

    const contentStorageClient = createContentStorageClient(config);
    const covers = await deleteAllSeedPostCovers(contentStorageClient, config, { dryRun: options.dryRun });
    console.log(`${label}: content — ${covers} post cover object(s).`);
  }

  if (options.only.includes("recommendations")) {
    const recommendationDbClient = createRecommendationDbClient(config);
    await connectRecommendationDb(recommendationDbClient, config);
    try {
      const counts = await resetSeedRecommendations(recommendationDbClient, seedUserIds, { dryRun: options.dryRun });
      console.log(
        `${label}: recommendations — ${counts.interactions} interaction(s), ${counts.notifications} notification(s), ` +
          `${counts.topicSubscriptions} topic sub(s), ${counts.userSubscriptions} user sub(s).`,
      );
    } finally {
      await recommendationDbClient.end();
    }
  }

  // Users last: content/recommendation resets above resolve ownership from these ids.
  if (options.only.includes("users")) {
    const usersStorageClient = createMinioClient(config);
    const avatars = await deleteSeedAvatars(usersStorageClient, config, seedUsernames, { dryRun: options.dryRun });

    const deleteDbClient = createUserDbClient(config);
    await connectUserDb(deleteDbClient, config);
    try {
      const counts = await resetSeedUsers(deleteDbClient, seedUserIds, { dryRun: options.dryRun });
      console.log(`${label}: users — ${counts.users} user(s), ${avatars} avatar object(s).`);
    } finally {
      await deleteDbClient.end();
    }
  }

  console.log(options.dryRun ? "Reset dry run completed (nothing mutated)." : "Reset completed.");
}

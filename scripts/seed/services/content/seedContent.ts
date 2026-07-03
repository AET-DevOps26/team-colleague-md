import type { SeedOptions } from "../../cli.ts";
import type { SeedConfig } from "../../config.ts";
import { SEED_BOOKMARKS, SEED_COMMENTS, SEED_DIGESTS, SEED_POSTS, SEED_TOPICS, SEED_VOTES } from "./contentData.ts";
import { SEED_USERS } from "../users/usersData.ts";
import {
  assertContentSeedSchemaExists,
  assertNoContentIdentityConflicts,
  assertSeedUsersExist,
  connectContentDb,
  createContentDbClient,
  upsertSeedContent,
  validateContentFixtures,
} from "./contentRepository.ts";
import {
  assertPostCoverFilesExist,
  assertPostPhotosBucketExists,
  buildPostCoverObjects,
  coverUrlsByPostId,
  createContentStorageClient,
  deleteObsoletePostCovers,
  uploadPostCovers,
} from "./postCoverStorage.ts";
import { connectUserDb, createUserDbClient } from "../users/usersRepository.ts";

interface ContentSeedRunContext {
  usersPlannedInCurrentDryRun?: boolean;
}

export async function seedContent(config: SeedConfig, options: SeedOptions, context: ContentSeedRunContext = {}) {
  // Build cover objects for both posts and digests (digests may have covers too)
  const allCoverablePosts = [...SEED_POSTS, ...SEED_DIGESTS.map((d) => ({ id: d.id, coverImageFile: d.coverImageFile }))];
  const postCovers = buildPostCoverObjects(config, allCoverablePosts as Parameters<typeof buildPostCoverObjects>[1]);

  console.log(`Preflighting ${SEED_POSTS.length} content post fixture(s) and ${SEED_DIGESTS.length} digest fixture(s).`);
  validateContentFixtures();
  await assertPostCoverFilesExist(postCovers);

  const contentStorageClient = createContentStorageClient(config);
  await assertPostPhotosBucketExists(contentStorageClient, config);

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
  try {
    await assertContentSeedSchemaExists(contentDbClient);
    await assertNoContentIdentityConflicts(contentDbClient);

    if (options.dryRun) {
      console.log(`Would upsert ${SEED_TOPICS.length} topic fixture(s).`);
      console.log(`Would upload ${postCovers.length} post cover object(s) to ${config.storage.content.bucket}.`);
      console.log(`Would upsert ${SEED_POSTS.length} post fixture(s), including ${postCovers.length} cover image URL(s).`);
      console.log(`Would upsert ${SEED_DIGESTS.length} digest fixture(s).`);
      console.log(`Would replace ${SEED_COMMENTS.length} comment(s), ${SEED_BOOKMARKS.length} bookmark(s), and ${SEED_VOTES.length} post-like vote(s) for seeded posts.`);
      return;
    }

    console.log(`Uploading ${postCovers.length} post cover object(s).`);
    await uploadPostCovers(contentStorageClient, config, postCovers);
    await deleteObsoletePostCovers(contentStorageClient, config, postCovers);

    console.log(`Upserting ${SEED_POSTS.length} post fixture(s) and ${SEED_DIGESTS.length} digest fixture(s).`);
    await upsertSeedContent(contentDbClient, coverUrlsByPostId(postCovers));
  } finally {
    await contentDbClient.end();
  }
}

import bcrypt from "bcryptjs";
import type { SeedOptions } from "../cli.ts";
import type { SeedConfig } from "../config.ts";
import { DEFAULT_SEED_PASSWORD, SEED_USERS } from "../data/users.ts";
import {
  assertNoUserIdentityConflicts,
  assertUserSeedSchemaExists,
  connectUserDb,
  createUserDbClient,
  upsertSeedUsers,
} from "../db/userSeedRepository.ts";
import {
  assertAvatarFilesExist,
  assertUserPortraitsBucketExists,
  buildAvatarObjects,
  createMinioClient,
  uploadAvatars,
} from "../storage/avatarStorage.ts";

const BCRYPT_SALT_ROUNDS = 10;

export async function seedUsers(config: SeedConfig, options: SeedOptions) {
  const avatars = buildAvatarObjects(config, SEED_USERS);

  console.log(`Preflighting ${SEED_USERS.length} user fixture(s).`);
  await assertAvatarFilesExist(avatars);

  const minioClient = createMinioClient(config);
  await assertUserPortraitsBucketExists(minioClient, config);

  const dbClient = createUserDbClient(config);
  await connectUserDb(dbClient, config);

  try {
    await assertUserSeedSchemaExists(dbClient);
    await assertNoUserIdentityConflicts(dbClient, SEED_USERS);

    if (options.dryRun) {
      console.log(`Would upload ${avatars.length} avatar object(s) to ${config.minio.userPortraitsBucket}.`);
      console.log(`Would upsert ${SEED_USERS.length} user row(s) and replace their expertise rows.`);
      console.log(`Default seeded user password: ${DEFAULT_SEED_PASSWORD}`);
      return;
    }

    console.log(`Uploading ${avatars.length} avatar object(s).`);
    await uploadAvatars(minioClient, config, avatars);

    console.log(`Hashing default password with BCrypt (${BCRYPT_SALT_ROUNDS} rounds).`);
    const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, BCRYPT_SALT_ROUNDS);

    console.log(`Upserting ${SEED_USERS.length} user row(s).`);
    await upsertSeedUsers(dbClient, SEED_USERS, avatars, passwordHash);

    console.log(`Seeded users are login-capable with password: ${DEFAULT_SEED_PASSWORD}`);
  } finally {
    await dbClient.end();
  }
}

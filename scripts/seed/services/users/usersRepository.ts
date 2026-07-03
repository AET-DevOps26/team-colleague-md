import pg from "pg";
import type { SeedConfig } from "../../config.ts";
import type { AvatarObject } from "./avatarStorage.ts";
import type { SeedUser } from "./usersData.ts";

const { Client } = pg;

export type UserDbClient = pg.Client;

export function createUserDbClient(config: SeedConfig): UserDbClient {
  return new Client({
    host: config.userDb.host,
    port: config.userDb.port,
    database: config.userDb.database,
    user: config.userDb.user,
    password: config.userDb.password,
  });
}

export async function connectUserDb(client: UserDbClient, config: SeedConfig) {
  try {
    await client.connect();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not connect to Postgres at ${config.userDb.host}:${config.userDb.port}/${config.userDb.database}: ${message}. ` +
        "Start local database with: docker compose up -d user-db",
    );
  }
}

export async function assertUserSeedSchemaExists(client: UserDbClient) {
  const result = await client.query<{
    users_table: string | null;
    user_expertise_table: string | null;
  }>(
    `
    SELECT
      to_regclass('public.users')::text AS users_table,
      to_regclass('public.user_expertise')::text AS user_expertise_table
    `,
  );

  const row = result.rows[0];
  const missing = [
    row?.users_table ? null : "users",
    row?.user_expertise_table ? null : "user_expertise",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `User database schema is missing table(s): ${missing.join(", ")}. ` +
        "Start user-service once so Hibernate creates the local schema, then rerun the seed.",
    );
  }
}

export async function assertNoUserIdentityConflicts(client: UserDbClient, users: SeedUser[]) {
  const ids = users.map((user) => user.id);
  const usernames = users.map((user) => user.username);
  const emails = users.map((user) => user.email);
  const fixturesById = new Map(users.map((user) => [user.id, user]));
  const fixturesByUsername = new Map(users.map((user) => [user.username, user]));
  const fixturesByEmail = new Map(users.map((user) => [user.email, user]));

  const result = await client.query<{
    id: string;
    username: string;
    email: string;
  }>(
    `
    SELECT id::text, username, email
    FROM users
    WHERE id = ANY($1::uuid[])
       OR username = ANY($2::text[])
       OR email = ANY($3::text[])
    `,
    [ids, usernames, emails],
  );

  const conflicts: string[] = [];
  for (const row of result.rows) {
    const byId = fixturesById.get(row.id);
    const byUsername = fixturesByUsername.get(row.username);
    const byEmail = fixturesByEmail.get(row.email);

    if (byId && (byId.username !== row.username || byId.email !== row.email)) {
      conflicts.push(
        `id "${row.id}" already belongs to ${row.username} <${row.email}>, expected ${byId.username} <${byId.email}>`,
      );
    }
    if (byUsername && byUsername.id !== row.id) {
      conflicts.push(`username "${row.username}" already exists with id "${row.id}", expected "${byUsername.id}"`);
    }
    if (byEmail && byEmail.id !== row.id) {
      conflicts.push(`email "${row.email}" already exists with id "${row.id}", expected "${byEmail.id}"`);
    }
  }

  if (conflicts.length > 0) {
    throw new Error(`Seed identity conflict(s): ${conflicts.join("; ")}.`);
  }
}

/**
 * Live ownership marker for seeded users. Every seed fixture uses an `@example.com`
 * email, and the upsert never deletes, so this query returns *all* rows this seed has
 * ever written — including users dropped from the current fixtures — while never
 * matching a real signup. That is what lets --reset purge stale seed rows.
 */
export const SEED_USER_EMAIL_SUFFIX = "@example.com";

export interface SeedUserIdentities {
  ids: string[];
  usernames: string[];
}

export async function getSeedUserIdentities(client: UserDbClient): Promise<SeedUserIdentities> {
  const result = await client.query<{ id: string; username: string }>(
    "SELECT id::text, username FROM users WHERE email LIKE $1",
    [`%${SEED_USER_EMAIL_SUFFIX}`],
  );
  return {
    ids: result.rows.map((row) => row.id),
    usernames: result.rows.map((row) => row.username),
  };
}

/**
 * Deletes seed users and their expertise rows. Run *after* content/recommendation
 * resets, which need the id set gathered by getSeedUserIdentities() first.
 * When dryRun, rolls back so nothing is mutated but the row count is still reported.
 */
export async function resetSeedUsers(
  client: UserDbClient,
  ids: string[],
  { dryRun }: { dryRun: boolean },
): Promise<{ users: number }> {
  if (ids.length === 0) return { users: 0 };

  await client.query("BEGIN");
  try {
    await client.query("DELETE FROM user_expertise WHERE user_id = ANY($1::uuid[])", [ids]);
    const users = await client.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [ids]);
    await client.query(dryRun ? "ROLLBACK" : "COMMIT");
    return { users: users.rowCount ?? 0 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function upsertSeedUsers(
  client: UserDbClient,
  users: SeedUser[],
  avatars: AvatarObject[],
  passwordHash: string,
) {
  const avatarUrlByUsername = new Map(avatars.map((avatar) => [avatar.user.username, avatar.publicUrl]));

  await client.query("BEGIN");
  try {
    for (const user of users) {
      const avatarUrl = avatarUrlByUsername.get(user.username);
      if (!avatarUrl) {
        throw new Error(`Missing avatar URL for seeded user "${user.username}".`);
      }

      await client.query(
        `
        INSERT INTO users (
          id,
          username,
          display_name,
          email,
          password,
          avatar_url,
          bio,
          website,
          organisation,
          role,
          is_banned,
          post_count,
          follower_count,
          following_count,
          like_received_count,
          created_at,
          updated_at,
          refresh_token,
          refresh_token_expiry,
          digest_frequency,
          show_bookmarks,
          show_likes
        )
        VALUES (
          $1::uuid,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16::timestamptz,
          $17::timestamptz,
          NULL,
          NULL,
          $18,
          $19,
          $20
        )
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          display_name = EXCLUDED.display_name,
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          avatar_url = EXCLUDED.avatar_url,
          bio = EXCLUDED.bio,
          website = EXCLUDED.website,
          organisation = EXCLUDED.organisation,
          role = EXCLUDED.role,
          is_banned = EXCLUDED.is_banned,
          post_count = EXCLUDED.post_count,
          follower_count = EXCLUDED.follower_count,
          following_count = EXCLUDED.following_count,
          like_received_count = EXCLUDED.like_received_count,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          refresh_token = NULL,
          refresh_token_expiry = NULL,
          digest_frequency = EXCLUDED.digest_frequency,
          show_bookmarks = EXCLUDED.show_bookmarks,
          show_likes = EXCLUDED.show_likes
        `,
        [
          user.id,
          user.username,
          user.displayName,
          user.email,
          passwordHash,
          avatarUrl,
          user.bio,
          user.website,
          user.organisation,
          user.role,
          user.isBanned,
          user.postCount,
          user.followerCount,
          user.followingCount,
          user.likeReceivedCount,
          user.createdAt,
          user.updatedAt,
          user.digestFrequency,
          user.showBookmarks,
          user.showLikes,
        ],
      );

      await client.query("DELETE FROM user_expertise WHERE user_id = $1::uuid", [user.id]);
      for (const expertise of user.expertiseAreas) {
        await client.query(
          "INSERT INTO user_expertise (user_id, expertise) VALUES ($1::uuid, $2)",
          [user.id, expertise],
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

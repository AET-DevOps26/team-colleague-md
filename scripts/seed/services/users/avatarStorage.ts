import fs from "node:fs/promises";
import path from "node:path";
import { Client as MinioClient } from "minio";
import type { SeedConfig, StorageConfig } from "../../config.ts";
import type { SeedUser } from "./usersData.ts";
import { AVATAR_ASSETS_DIR } from "./usersData.ts";

export interface AvatarObject {
  user: SeedUser;
  filePath: string;
  objectName: string;
  publicUrl: string;
}

export function buildAvatarObjects(config: SeedConfig, users: SeedUser[]): AvatarObject[] {
  const storage = config.storage.users;
  return users.map((user) => {
    const objectName = `${user.username}/avatar.png`;
    return {
      user,
      filePath: path.join(AVATAR_ASSETS_DIR, user.avatarFile),
      objectName,
      publicUrl: `${storage.publicEndpoint}/${storage.bucket}/${objectName}`,
    };
  });
}

export async function assertAvatarFilesExist(avatars: AvatarObject[]) {
  const missing: string[] = [];

  for (const avatar of avatars) {
    try {
      await fs.access(avatar.filePath);
    } catch {
      missing.push(avatar.filePath);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing avatar fixture file(s): ${missing.join(", ")}`);
  }
}

export function createMinioClient(config: SeedConfig): MinioClient {
  return createStorageClient(config.storage.users);
}

function createStorageClient(storage: StorageConfig): MinioClient {
  const endpoint = new URL(storage.endpoint);
  const useSSL = endpoint.protocol === "https:";
  const defaultPort = useSSL ? 443 : 80;

  return new MinioClient({
    endPoint: endpoint.hostname,
    port: endpoint.port ? Number(endpoint.port) : defaultPort,
    useSSL,
    accessKey: storage.accessKey,
    secretKey: storage.secretKey,
  });
}

export async function assertUserPortraitsBucketExists(client: MinioClient, config: SeedConfig) {
  const storage = config.storage.users;
  let exists = false;
  try {
    exists = await client.bucketExists(storage.bucket);
  } catch (error) {
    const message = formatError(error);
    throw new Error(
      `Could not connect to user portrait storage at ${storage.endpoint}: ${message}. ` +
        "Start local object storage with: docker compose up -d minio minio-init",
    );
  }

  if (!exists) {
    throw new Error(
      `User portrait bucket "${storage.bucket}" does not exist or is not accessible with the configured user storage credentials. ` +
        "Start bucket initialisation with: docker compose up -d minio minio-init",
    );
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return String(error);
}

/**
 * Removes the `${username}/avatar.png` object for each given seed username. Callers
 * pass the live seed usernames (from getSeedUserIdentities) so stale avatars from
 * users dropped from the fixtures are removed too. When dryRun, removes nothing.
 */
export async function deleteSeedAvatars(
  client: MinioClient,
  config: SeedConfig,
  usernames: string[],
  { dryRun }: { dryRun: boolean },
): Promise<number> {
  if (usernames.length === 0) return 0;
  const storage = config.storage.users;
  const objectNames = usernames.map((username) => `${username}/avatar.png`);
  if (!dryRun) {
    await client.removeObjects(storage.bucket, objectNames);
  }
  return objectNames.length;
}

export async function uploadAvatars(client: MinioClient, config: SeedConfig, avatars: AvatarObject[]) {
  const storage = config.storage.users;
  for (const avatar of avatars) {
    await client.fPutObject(
      storage.bucket,
      avatar.objectName,
      avatar.filePath,
      { "Content-Type": "image/png" },
    );
  }
}

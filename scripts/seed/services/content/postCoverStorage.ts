import fs from "node:fs/promises";
import path from "node:path";
import { Client as MinioClient } from "minio";
import type { SeedConfig, StorageConfig } from "../../config.ts";
import { POST_COVER_ASSETS_DIR, type SeedPost } from "./contentData.ts";

const POST_COVER_OBJECT_PREFIX = "seed-post-covers/";
const POST_COVER_CONTENT_TYPE = "image/png";

export interface PostCoverObject {
  post: SeedPost;
  filePath: string;
  objectName: string;
  publicUrl: string;
}

export function buildPostCoverObjects(config: SeedConfig, posts: SeedPost[]): PostCoverObject[] {
  const storage = config.storage.content;
  return posts
    .filter((post) => post.coverImageFile !== null)
    .map((post) => {
      const objectName = `${POST_COVER_OBJECT_PREFIX}${post.id}.png`;
      return {
        post,
        filePath: path.join(POST_COVER_ASSETS_DIR, post.coverImageFile ?? ""),
        objectName,
        publicUrl: `${storage.publicEndpoint}/${storage.bucket}/${objectName}`,
      };
    });
}

export function coverUrlsByPostId(covers: PostCoverObject[]): Map<string, string> {
  return new Map(covers.map((cover) => [cover.post.id, cover.publicUrl]));
}

export async function assertPostCoverFilesExist(covers: PostCoverObject[]) {
  const missing: string[] = [];

  for (const cover of covers) {
    try {
      await fs.access(cover.filePath);
    } catch {
      missing.push(cover.filePath);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing post cover fixture file(s): ${missing.join(", ")}`);
  }
}

export function createContentStorageClient(config: SeedConfig): MinioClient {
  return createStorageClient(config.storage.content);
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

export async function assertPostPhotosBucketExists(client: MinioClient, config: SeedConfig) {
  const storage = config.storage.content;
  let exists = false;
  try {
    exists = await client.bucketExists(storage.bucket);
  } catch (error) {
    const message = formatError(error);
    throw new Error(
      `Could not connect to post photo storage at ${storage.endpoint}: ${message}. ` +
        "Start local object storage with: docker compose up -d minio minio-init",
    );
  }

  if (!exists) {
    throw new Error(
      `Post photo bucket "${storage.bucket}" does not exist or is not accessible with the configured content storage credentials. ` +
        "Start bucket initialisation with: docker compose up -d minio minio-init",
    );
  }
}

export async function uploadPostCovers(client: MinioClient, config: SeedConfig, covers: PostCoverObject[]) {
  const storage = config.storage.content;
  for (const cover of covers) {
    await client.fPutObject(
      storage.bucket,
      cover.objectName,
      cover.filePath,
      { "Content-Type": POST_COVER_CONTENT_TYPE },
    );
  }
}

export async function deleteObsoletePostCovers(client: MinioClient, config: SeedConfig, covers: PostCoverObject[]) {
  const storage = config.storage.content;
  const expected = new Set(covers.map((cover) => cover.objectName));
  const existing = await listSeedPostCoverObjects(client, storage.bucket);
  const obsolete = existing.filter((objectName) => !expected.has(objectName));

  if (obsolete.length > 0) {
    await client.removeObjects(storage.bucket, obsolete);
  }
}

function listSeedPostCoverObjects(client: MinioClient, bucket: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const objectNames: string[] = [];
    const stream = client.listObjectsV2(bucket, POST_COVER_OBJECT_PREFIX, true);

    stream.on("data", (item: { name?: string }) => {
      if (item.name) objectNames.push(item.name);
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(objectNames));
  });
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

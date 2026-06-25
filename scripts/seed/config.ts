export interface SeedConfig {
  userDb: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  contentDb: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  recommendationDb: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  storage: {
    users: StorageConfig;
    content: StorageConfig;
  };
}

export interface StorageConfig {
    endpoint: string;
    publicEndpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
}

export function getSeedConfig(env: NodeJS.ProcessEnv): SeedConfig {
  return {
    userDb: {
      host: env.USER_DB_HOST ?? "localhost",
      port: parsePort(env.USER_DB_PORT ?? "5432", "USER_DB_PORT"),
      database: env.USER_DB_NAME ?? "verita_users",
      user: env.USER_DB_USER ?? "svc_user",
      password: env.USER_DB_PASSWORD ?? "svc_user_password",
    },
    contentDb: {
      host: env.CONTENT_DB_HOST ?? "localhost",
      port: parsePort(env.CONTENT_DB_PORT ?? "5433", "CONTENT_DB_PORT"),
      database: env.CONTENT_DB_NAME ?? "verita_contents",
      user: env.CONTENT_DB_USER ?? "svc_content",
      password: env.CONTENT_DB_PASSWORD ?? "svc_content_password",
    },
    recommendationDb: {
      host: env.RECOMMENDATION_DB_HOST ?? "localhost",
      port: parsePort(env.RECOMMENDATION_DB_PORT ?? "5434", "RECOMMENDATION_DB_PORT"),
      database: env.RECOMMENDATION_DB_NAME ?? "verita_recommendations",
      user: env.RECOMMENDATION_DB_USER ?? "svc_recommendation",
      password: env.RECOMMENDATION_DB_PASSWORD ?? "svc_recommendation_password",
    },
    storage: {
      users: {
        endpoint: env.USER_STORAGE_S3_ENDPOINT ?? env.STORAGE_S3_ENDPOINT ?? env.MINIO_ENDPOINT ?? "http://localhost:9000",
        publicEndpoint: stripTrailingSlash(
          env.USER_STORAGE_S3_PUBLIC_ENDPOINT ?? env.STORAGE_S3_PUBLIC_ENDPOINT ?? env.MINIO_PUBLIC_ENDPOINT ?? "http://localhost:9000",
        ),
        accessKey: env.USER_STORAGE_S3_ACCESS_KEY ?? env.STORAGE_S3_ACCESS_KEY ?? "user-service",
        secretKey: env.USER_STORAGE_S3_SECRET_KEY ?? env.STORAGE_S3_SECRET_KEY ?? "user-service-s3-secret",
        bucket: env.USER_PORTRAITS_BUCKET ?? env.STORAGE_USER_PORTRAITS_BUCKET ?? "verita-user-portraits",
      },
      content: {
        endpoint: env.CONTENT_STORAGE_S3_ENDPOINT ?? env.STORAGE_S3_ENDPOINT ?? env.MINIO_ENDPOINT ?? "http://localhost:9000",
        publicEndpoint: stripTrailingSlash(
          env.CONTENT_STORAGE_S3_PUBLIC_ENDPOINT ?? env.STORAGE_S3_PUBLIC_ENDPOINT ?? env.MINIO_PUBLIC_ENDPOINT ?? "http://localhost:9000",
        ),
        accessKey: env.CONTENT_STORAGE_S3_ACCESS_KEY ?? "content-service",
        secretKey: env.CONTENT_STORAGE_S3_SECRET_KEY ?? "content-service-s3-secret",
        bucket: env.CONTENT_POST_PHOTOS_BUCKET ?? env.STORAGE_POST_PHOTOS_BUCKET ?? "verita-post-photos",
      },
    },
  };
}

function parsePort(value: string, name: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`${name} must be a valid TCP port, got "${value}".`);
  }
  return port;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
